import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

// Per-variant inventory control — lets the admin hide/show or restock a
// single size (e.g. Kefir 1L) independent of its sibling variants.
export async function PATCH(
  request: Request,
  props: RouteContext<"/api/admin/products/[id]/variants/[variantId]">
) {
  const { id, variantId } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth alongside proxy.ts's /admin gate — see
  // supabase/migrations/0006_admin_product_write.sql for the actual
  // boundary if this check is ever bypassed.
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { isInStock, stockQuantity } = (await request.json()) as {
    isInStock?: boolean;
    stockQuantity?: number;
  };

  const update: Record<string, boolean | number> = {};
  if (typeof isInStock === "boolean") update.is_instock = isInStock;
  if (typeof stockQuantity === "number") {
    if (!(stockQuantity >= 0)) {
      return NextResponse.json({ error: "stockQuantity must be 0 or more" }, { status: 400 });
    }
    update.stock_quantity = Math.round(stockQuantity);
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // .eq("product_id", id) guards against a variantId/productId mismatch
  // reaching this URL and silently patching an unrelated variant.
  const { data: updatedVariant, error } = await supabase
    .from("product_variants")
    .update(update)
    .eq("id", variantId)
    .eq("product_id", id)
    .select("is_instock, stock_quantity")
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // For a single-variant product there's nothing else that could make it
  // purchasable/unpurchasable independent of this one variant, so keep the
  // product-level master toggle in sync with it automatically — both ways
  // (auto-disable when the only variant goes unavailable, auto-re-enable
  // when it's restocked), rather than leaving it stuck showing "enabled"
  // for a product nothing can actually be bought from, or staying
  // disabled forever after the variant's been fixed back up.
  let productIsInStock: boolean | undefined;
  const { count } = await supabase
    .from("product_variants")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);
  if (count === 1 && updatedVariant) {
    productIsInStock = updatedVariant.is_instock && updatedVariant.stock_quantity > 0;
    await supabase.from("products").update({ is_instock: productIsInStock }).eq("id", id);
  }

  return NextResponse.json({ ok: true, productIsInStock });
}
