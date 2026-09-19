import type { VariantLookup } from "./products";
import { computeShippingRupees } from "./shipping";

// Storewide floor on subtotal (pre-discount, independent of any promo
// code's own min_order_rupees) — an order can't be placed below this at
// all. Enforced both in the cart-page UI (disables Checkout) and
// server-side in lib/create-order.ts / the Razorpay create-order route,
// same "never trust the client" pattern as the rest of this file.
export const MIN_ORDER_RUPEES = 250;

export type OrderLineItem = {
  variantId: string;
  productId: string; // needed to test a line against a promo's scopedProductIds
  qty: number;
  productName: string;
  variantLabel: string;
  unitPriceRupees: number;
  lineTotalRupees: number;
};

// The subset of a promo_codes row needed to price a cart — never the
// client-submitted discount amount itself, only the code (see
// lib/promo.ts's server-authoritative lookup).
export type PromoInfo = {
  code: string;
  discountType: "flat" | "percent";
  discountValue: number;
  minOrderRupees: number;
  // null = applies to every product (the default — see 0001_init.sql's
  // comment on promo_code_products); non-null = only these product ids
  // are eligible for the discount.
  scopedProductIds: string[] | null;
};

export type CartPricing = {
  items: OrderLineItem[];
  subtotalRupees: number;
  discountRupees: number;
  promoCode: string | null;
};

export type OrderTotals = CartPricing & {
  shippingRupees: number;
  totalRupees: number;
};

// The one place discount math happens (per the rounding rule in the
// backend plan: compute once, reuse everywhere) — used both for display
// (cart/checkout pages) and for what's actually charged/stored (COD and
// Razorpay order routes). A promo that no longer meets its minimum order
// (e.g. after the cart shrank) silently contributes ₹0 rather than erroring
// — the same code re-applies automatically if the subtotal rises again.
//
// Product scoping applies *partially*, not all-or-nothing: a promo scoped
// to specific products still discounts just those lines even if the cart
// also has unscoped items in it. The minimum-order check stays cart-wide
// (it's a floor on the whole order, not on the eligible portion), but the
// discount itself — and the cap that keeps it from exceeding the
// eligible amount — is computed only over in-scope lines.
export function computePromoDiscount(items: OrderLineItem[], promo: PromoInfo | null): number {
  const subtotalRupees = items.reduce((sum, i) => sum + i.lineTotalRupees, 0);
  if (!promo || subtotalRupees < promo.minOrderRupees) return 0;

  const eligibleSubtotal =
    !promo.scopedProductIds || promo.scopedProductIds.length === 0
      ? subtotalRupees
      : items
          .filter((i) => promo.scopedProductIds!.includes(i.productId))
          .reduce((sum, i) => sum + i.lineTotalRupees, 0);

  const raw =
    promo.discountType === "percent"
      ? Math.round((eligibleSubtotal * promo.discountValue) / 100)
      : promo.discountValue;
  return Math.min(raw, eligibleSubtotal);
}

// Re-derives prices from the server's own product data rather than
// trusting whatever the client submitted — the client's cart is just
// {variantId: qty}, never a price. `variantLookup` is resolved once
// upfront by the caller (lib/products.ts's fetchVariantsByIds) rather than
// looked up here, so this function stays synchronous even though the
// underlying data now lives in Supabase. Split out from computeOrderTotals
// below because none of this depends on a delivery location — the
// checkout page needs to show items/subtotal/discount before a delivery
// address (and therefore a shipping fee) is even known. Throws on an
// unknown/stale/out-of-stock variant id so a bad request fails loudly
// instead of silently mispricing or selling something no longer available.
export function computeCartPricing(
  cart: Record<string, number>,
  promo: PromoInfo | null = null,
  variantLookup: VariantLookup
): CartPricing {
  const items: OrderLineItem[] = Object.entries(cart).map(([id, qty]) => {
    const hit = variantLookup.get(id);
    if (!hit || !(qty > 0)) {
      throw new Error(`Invalid cart entry: ${id}`);
    }
    if (!hit.variant.isInStock) {
      throw new Error(`${hit.product.name} (${hit.variant.size}) is currently out of stock`);
    }
    const { product, variant } = hit;
    return {
      variantId: id,
      productId: product.id,
      qty,
      productName: product.name,
      variantLabel: variant.size,
      unitPriceRupees: variant.priceRupees,
      lineTotalRupees: variant.priceRupees * qty,
    };
  });

  if (items.length === 0) {
    throw new Error("Cart is empty");
  }

  const subtotalRupees = items.reduce((sum, i) => sum + i.lineTotalRupees, 0);
  const discountRupees = computePromoDiscount(items, promo);

  return {
    items,
    subtotalRupees,
    discountRupees,
    promoCode: discountRupees > 0 ? promo!.code : null,
  };
}

// Shipping (and therefore the final total) needs a resolved delivery
// distance — distanceKm has no default, forcing every order-creating call
// site to prove it knows (or explicitly doesn't know, via null —
// see computeShippingRupees's fallback) the delivery location before
// pricing an order, the same way `promo` above has to be a real
// looked-up PromoInfo, never a raw code string.
export function computeOrderTotals(
  cart: Record<string, number>,
  promo: PromoInfo | null,
  distanceKm: number | null,
  variantLookup: VariantLookup
): OrderTotals {
  const pricing = computeCartPricing(cart, promo, variantLookup);
  const shippingRupees = computeShippingRupees(pricing.subtotalRupees, distanceKm);
  const totalRupees = pricing.subtotalRupees + shippingRupees - pricing.discountRupees;

  return { ...pricing, shippingRupees, totalRupees };
}

// Every date in this app is meant to be read as an Indian calendar date —
// the business and every customer are in India — so this is exported for
// display code (app/orders/page.tsx, app/orders/[id]/page.tsx) to format
// created_at/estimated_delivery with too, not just used here.
export const IST_TIME_ZONE = "Asia/Kolkata";

// getDate()/setDate() below would silently use whatever timezone the Node
// process itself happens to be running in (UTC in production on most
// hosts, but not guaranteed, and not necessarily IST even in local dev) —
// an order placed late at night IST could land on the *previous* day in
// UTC, quietly turning "+2 days" into "+1" from the customer's actual
// perspective. Extracting the y/m/d in IST first, then doing the +2 in
// UTC (safe — UTC has no DST to reinterpret the components against),
// makes the result depend only on the order's real instant, never on
// server timezone.
function istDateParts(d: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function estimatedDeliveryDate(fromCreatedAt: Date = new Date()): string {
  const { year, month, day } = istDateParts(fromCreatedAt);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + 2);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Today's (or any instant's) IST calendar date as "YYYY-MM-DD" — for admin
// date-range filters (app/admin/orders/page.tsx and its CSV export route)
// to default to/parse against, so "today"/"last 30 days" means the same
// thing an India-based admin means by those words, not whatever calendar
// day the server process's own timezone happens to be on.
export function istDateString(d: Date = new Date()): string {
  const { year, month, day } = istDateParts(d);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// IST calendar date `days` days before `from` — callers wanting e.g. "30
// days ago" as a default should use this instead of writing
// `new Date(Date.now() - N * 86400000)` themselves, which React's purity
// lint flags as an impure call inline in a Server Component's render body
// (the `= new Date()` default parameter shape every other now-defaulted
// helper here uses doesn't trip that rule).
export function istDateDaysAgo(days: number, from: Date = new Date()): string {
  const d = istDayStart(istDateString(from));
  d.setUTCDate(d.getUTCDate() - days);
  return istDateString(d);
}

// India has no DST, so "00:00:00 IST" on a given calendar date is always
// exactly UTC-5:30 — parsing with that fixed offset gives the precise
// instant regardless of the server process's own timezone (unlike a bare
// "YYYY-MM-DDT00:00:00", which Date parses as *server-local* time).
export function istDayStart(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00+05:30`);
}

// One millisecond before the next day's IST midnight — the last instant of
// `dateStr` in IST. Plain epoch-millisecond arithmetic on istDayStart's
// already-correct instant, rather than Date#setHours(23,59,59,999) (which
// would reinterpret "23:59:59.999" in the server's own local timezone and
// reintroduce the same bug this exists to avoid).
export function istDayEnd(dateStr: string): Date {
  return new Date(istDayStart(dateStr).getTime() + 24 * 60 * 60 * 1000 - 1);
}

// IST-anchored MTD/QTD/YTD period boundaries for the admin dashboard
// (app/admin/page.tsx, lib/admin-data.ts's getRevenueSummary etc.) — same
// reasoning as every other IST helper here: Date#getFullYear()/getMonth()
// read the server process's own local calendar, which for a few hours
// around any month/quarter/year boundary can disagree with what date it
// actually is in India, silently including or excluding a day's revenue
// from "this month" depending on where the server happens to be running.
export function istStartOfMonth(d: Date = new Date()): Date {
  const { year, month } = istDateParts(d);
  return istDayStart(`${year}-${String(month).padStart(2, "0")}-01`);
}

export function istStartOfQuarter(d: Date = new Date()): Date {
  const { year, month } = istDateParts(d);
  const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
  return istDayStart(`${year}-${String(quarterStartMonth).padStart(2, "0")}-01`);
}

export function istStartOfYear(d: Date = new Date()): Date {
  const { year } = istDateParts(d);
  return istDayStart(`${year}-01-01`);
}
