import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

const DISCOUNT_TYPES = ["flat", "percent"];

export async function POST(request: Request) {
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

  const body = await request.json();
  const {
    code,
    discountType,
    discountValue,
    minOrderRupees,
    startsAt,
    expiresAt,
    productIds,
  } = body as {
    code?: string;
    discountType?: string;
    discountValue?: number;
    minOrderRupees?: number;
    startsAt?: string | null;
    expiresAt?: string | null;
    productIds?: string[];
  };

  if (!code?.trim()) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }
  if (!discountType || !DISCOUNT_TYPES.includes(discountType)) {
    return NextResponse.json({ error: "Invalid discount type" }, { status: 400 });
  }
  if (!(Number(discountValue) > 0)) {
    return NextResponse.json({ error: "Discount value must be greater than 0" }, { status: 400 });
  }
  if (minOrderRupees != null && Number(minOrderRupees) < 0) {
    return NextResponse.json({ error: "Minimum order value can't be negative" }, { status: 400 });
  }
  if (startsAt && expiresAt && new Date(startsAt) >= new Date(expiresAt)) {
    return NextResponse.json({ error: "Start date must be before end date" }, { status: 400 });
  }

  const { data: promoRow, error: promoError } = await supabase
    .from("promo_codes")
    .insert({
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: Math.round(Number(discountValue)),
      min_order_rupees: Math.max(0, Math.round(Number(minOrderRupees ?? 0))),
      starts_at: startsAt || null,
      expires_at: expiresAt || null,
    })
    .select("id, code")
    .single();

  if (promoError || !promoRow) {
    const message =
      promoError?.code === "23505" ? "A promo code with this code already exists" : promoError?.message;
    return NextResponse.json({ error: message ?? "Could not create promo code" }, { status: 400 });
  }

  if (Array.isArray(productIds) && productIds.length > 0) {
    const { error: scopeError } = await supabase
      .from("promo_code_products")
      .insert(productIds.map((productId) => ({ promo_code_id: promoRow.id, product_id: productId })));
    if (scopeError) {
      await supabase.from("promo_codes").delete().eq("id", promoRow.id);
      return NextResponse.json({ error: scopeError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ id: promoRow.id, code: promoRow.code });
}
