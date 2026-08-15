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

export function generateOrderNumber(): string {
  return `PSN-${Math.floor(10000 + Math.random() * 90000)}`;
}

export function estimatedDeliveryDate(fromCreatedAt: Date = new Date()): string {
  const d = new Date(fromCreatedAt);
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
}
