import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

// Product-level enable/disable — the master "still part of the catalog"
// switch (distinct from a variant's own is_instock, patched separately at
// /api/admin/products/[id]/variants/[variantId]).
export async function PATCH(request: Request, props: RouteContext<"/api/admin/products/[id]">) {
  const { id } = await props.params;
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

  const { isInStock } = (await request.json()) as { isInStock?: boolean };
  if (typeof isInStock !== "boolean") {
    return NextResponse.json({ error: "isInStock must be a boolean" }, { status: 400 });
  }

  const { error } = await supabase.from("products").update({ is_instock: isInStock }).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
