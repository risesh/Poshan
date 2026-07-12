import type { SupabaseClient } from "@supabase/supabase-js";
import type { PromoInfo } from "./order-math";

// Looks up a promo code against the real promo_codes table — used both
// client-side (cart page, for display) and server-side (order routes, as
// the actual authority for what gets charged). RLS already restricts
// selects to active rows (see supabase/migrations/0001_init.sql), so a
// matched row is guaranteed active; this only has to additionally check
// expiry, which isn't part of the RLS policy.
export async function lookupPromoCode(
  supabase: SupabaseClient,
  code: string | null | undefined
): Promise<PromoInfo | null> {
  const trimmed = code?.trim();
  if (!trimmed) return null;

  const { data } = await supabase
    .from("promo_codes")
    .select("code, discount_type, discount_value, min_order_rupees, expires_at")
    .ilike("code", trimmed)
    .maybeSingle();

  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;

  return {
    code: data.code,
    discountType: data.discount_type,
    discountValue: data.discount_value,
    minOrderRupees: data.min_order_rupees,
  };
}
