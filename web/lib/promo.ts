import type { SupabaseClient } from "@supabase/supabase-js";
import type { PromoInfo } from "./order-math";

const PROMO_SELECT =
  "code, discount_type, discount_value, min_order_rupees, starts_at, expires_at, promo_code_products ( product_id )";

type PromoRow = {
  code: string;
  discount_type: "flat" | "percent";
  discount_value: number;
  min_order_rupees: number;
  starts_at: string | null;
  expires_at: string | null;
  promo_code_products: { product_id: string }[];
};

function isCurrentlyActive(row: Pick<PromoRow, "starts_at" | "expires_at">, now: Date): boolean {
  if (row.starts_at && new Date(row.starts_at) > now) return false;
  if (row.expires_at && new Date(row.expires_at) < now) return false;
  return true;
}

function toPromoInfo(row: PromoRow): PromoInfo {
  return {
    code: row.code,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    minOrderRupees: row.min_order_rupees,
    scopedProductIds: row.promo_code_products.length
      ? row.promo_code_products.map((r) => r.product_id)
      : null,
  };
}

// Looks up a promo code against the real promo_codes table — used both
// client-side (cart page, for display) and server-side (order routes, as
// the actual authority for what gets charged). RLS already restricts
// selects to active rows (see supabase/migrations/0001_init.sql), so a
// matched row is guaranteed `active`; this additionally checks the
// starts_at/expires_at window, neither of which is part of the RLS policy.
export async function lookupPromoCode(
  supabase: SupabaseClient,
  code: string | null | undefined
): Promise<PromoInfo | null> {
  const trimmed = code?.trim();
  if (!trimmed) return null;

  const { data } = await supabase
    .from("promo_codes")
    .select(PROMO_SELECT)
    .ilike("code", trimmed)
    .maybeSingle();

  if (!data) return null;
  const row = data as unknown as PromoRow;
  if (!isCurrentlyActive(row, new Date())) return null;

  return toPromoInfo(row);
}

// Every currently-usable promo code, for the promo picker dropdown (cart
// and checkout). RLS already restricts this to active rows; a promo
// outside its starts_at/expires_at window is filtered out the same way
// lookupPromoCode does. Ordered by code so the list is stable across
// renders/reloads rather than shuffling.
export async function listActivePromoCodes(supabase: SupabaseClient): Promise<PromoInfo[]> {
  const { data } = await supabase.from("promo_codes").select(PROMO_SELECT).order("code");

  const now = new Date();
  return ((data ?? []) as unknown as PromoRow[])
    .filter((row) => isCurrentlyActive(row, now))
    .map(toPromoInfo);
}

// Short, human-readable summary of a promo's terms — shown under the code
// in the picker dropdown. Generated from the actual discount fields rather
// than a hand-authored column, so it can never drift out of sync with what
// the code actually does.
export function describePromoCode(promo: PromoInfo): string {
  const discount = promo.discountType === "percent" ? `${promo.discountValue}% off` : `₹${promo.discountValue} off`;
  return promo.minOrderRupees > 0
    ? `${discount} on orders above ₹${promo.minOrderRupees}`
    : `${discount} your order`;
}
