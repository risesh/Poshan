import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

const DISCOUNT_TYPES = ["flat", "percent"];

export async function PATCH(request: Request, props: RouteContext<"/api/admin/promo-codes/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth alongside proxy.ts's /admin gate — see
  // supabase/migrations/0008_admin_promo_write.sql for the actual boundary
  // if this check is ever bypassed.
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { active, code, discountType, discountValue, minOrderRupees, startsAt, expiresAt, productIds } =
    (await request.json()) as {
      active?: boolean;
      code?: string;
      discountType?: string;
      discountValue?: number;
      minOrderRupees?: number;
      startsAt?: string | null;
      expiresAt?: string | null;
      productIds?: string[];
    };

  if (code !== undefined && !code.trim()) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }
  if (discountType !== undefined && !DISCOUNT_TYPES.includes(discountType)) {
    return NextResponse.json({ error: "Invalid discount type" }, { status: 400 });
  }
  if (discountValue !== undefined && !(Number(discountValue) > 0)) {
    return NextResponse.json({ error: "Discount value must be greater than 0" }, { status: 400 });
  }
  if (minOrderRupees !== undefined && Number(minOrderRupees) < 0) {
    return NextResponse.json({ error: "Minimum order value can't be negative" }, { status: 400 });
  }
  if (startsAt && expiresAt && new Date(startsAt) >= new Date(expiresAt)) {
    return NextResponse.json({ error: "Start date must be before end date" }, { status: 400 });
  }

  const update: Record<string, boolean | string | number | null> = {};
  if (typeof active === "boolean") update.active = active;
  if (code !== undefined) update.code = code.trim().toUpperCase();
  if (discountType !== undefined) update.discount_type = discountType;
  if (discountValue !== undefined) update.discount_value = Math.round(Number(discountValue));
  if (minOrderRupees !== undefined) update.min_order_rupees = Math.max(0, Math.round(Number(minOrderRupees)));
  if (startsAt !== undefined) update.starts_at = startsAt;
  if (expiresAt !== undefined) update.expires_at = expiresAt;

  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from("promo_codes").update(update).eq("id", id);
    if (error) {
      const message = error.code === "23505" ? "A promo code with this code already exists" : error.message;
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  // Replacing product scope: delete the old rows and insert the new set —
  // promo_code_products has no history worth preserving (see
  // 0008_admin_promo_write.sql's comment on why that table alone gets a
  // delete-capable RLS policy).
  if (productIds !== undefined) {
    const { error: deleteError } = await supabase.from("promo_code_products").delete().eq("promo_code_id", id);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }
    if (productIds.length > 0) {
      const { error: insertError } = await supabase
        .from("promo_code_products")
        .insert(productIds.map((productId) => ({ promo_code_id: id, product_id: productId })));
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 400 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, props: RouteContext<"/api/admin/promo-codes/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // promo_code_products rows for this code cascade-delete for free (see
  // 0001_init.sql); orders never reference promo_codes by id (see
  // 0009_admin_promo_delete.sql), so this is safe for used codes too.
  const { error } = await supabase.from("promo_codes").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
