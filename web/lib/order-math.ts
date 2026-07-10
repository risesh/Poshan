import { getVariantById } from "./products";

export type OrderLineItem = {
  variantId: string;
  qty: number;
  productName: string;
  variantLabel: string;
  unitPriceRupees: number;
  lineTotalRupees: number;
};

export type OrderTotals = {
  items: OrderLineItem[];
  subtotalRupees: number;
  shippingRupees: number;
  totalRupees: number;
};

// Re-derives prices from the server's own product data rather than
// trusting whatever the client submitted — the client's cart is just
// {variantId: qty}, never a price. Same shipping rule as the cart page:
// ₹49 flat, free at ₹500+ subtotal. Throws on an unknown/stale variant id
// so a bad request fails loudly instead of silently mispricing an order.
export function computeOrderTotals(cart: Record<string, number>): OrderTotals {
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
  const totalRupees = subtotalRupees + shippingRupees;

  return { items, subtotalRupees, shippingRupees, totalRupees };
}

export function generateOrderNumber(): string {
  return `PSN-${Math.floor(10000 + Math.random() * 90000)}`;
}

export function estimatedDeliveryDate(fromCreatedAt: Date = new Date()): string {
  const d = new Date(fromCreatedAt);
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
}
