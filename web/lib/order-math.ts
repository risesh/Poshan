import { getVariantById } from "./products";

export type OrderLineItem = {
  variantId: string;
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
};

export type OrderTotals = {
  items: OrderLineItem[];
  subtotalRupees: number;
  shippingRupees: number;
  discountRupees: number;
  promoCode: string | null;
  totalRupees: number;
};

// The one place discount math happens (per the rounding rule in the
// backend plan: compute once, reuse everywhere) — used both for display
// (cart/checkout pages) and for what's actually charged/stored (COD and
// Razorpay order routes). A promo that no longer meets its minimum order
// (e.g. after the cart shrank) silently contributes ₹0 rather than erroring
// — the same code re-applies automatically if the subtotal rises again.
export function computePromoDiscount(subtotalRupees: number, promo: PromoInfo | null): number {
  if (!promo || subtotalRupees < promo.minOrderRupees) return 0;
  const raw =
    promo.discountType === "percent"
      ? Math.round((subtotalRupees * promo.discountValue) / 100)
      : promo.discountValue;
  return Math.min(raw, subtotalRupees);
}

// Re-derives prices from the server's own product data rather than
// trusting whatever the client submitted — the client's cart is just
// {variantId: qty}, never a price. Same shipping rule as the cart page:
// ₹49 flat, free at ₹500+ subtotal. Throws on an unknown/stale variant id
// so a bad request fails loudly instead of silently mispricing an order.
export function computeOrderTotals(cart: Record<string, number>, promo: PromoInfo | null = null): OrderTotals {
  const items: OrderLineItem[] = Object.entries(cart).map(([id, qty]) => {
    const hit = getVariantById(id);
    if (!hit || !(qty > 0)) {
      throw new Error(`Invalid cart entry: ${id}`);
    }
    const { product, variant } = hit;
    return {
      variantId: id,
      qty,
      productName: product.name,
      variantLabel: variant.size === "500ml" ? "500 ml" : variant.size === "1L" ? "1 L" : variant.size,
      unitPriceRupees: variant.priceRupees,
      lineTotalRupees: variant.priceRupees * qty,
    };
  });

  if (items.length === 0) {
    throw new Error("Cart is empty");
  }

  const subtotalRupees = items.reduce((sum, i) => sum + i.lineTotalRupees, 0);
  const shippingRupees = subtotalRupees >= 500 ? 0 : 49;
  const discountRupees = computePromoDiscount(subtotalRupees, promo);
  const totalRupees = subtotalRupees + shippingRupees - discountRupees;

  return {
    items,
    subtotalRupees,
    shippingRupees,
    discountRupees,
    promoCode: discountRupees > 0 ? promo!.code : null,
    totalRupees,
  };
}

export function generateOrderNumber(): string {
  return `PSN-${Math.floor(10000 + Math.random() * 90000)}`;
}

export function estimatedDeliveryDate(fromCreatedAt: Date = new Date()): string {
  const d = new Date(fromCreatedAt);
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
}
