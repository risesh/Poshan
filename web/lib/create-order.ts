import type { SupabaseClient } from "@supabase/supabase-js";
import { computeOrderTotals, generateOrderNumber, estimatedDeliveryDate } from "./order-math";
import { lookupPromoCode } from "./promo";

type PaymentInfo =
  | { method: "cod" }
  | { method: "upi" | "card" | "netbanking"; paymentId: string };

// Shared by the COD route and the Razorpay verify route — an `orders` row
// only ever gets created here, once payment has actually succeeded (or
// wasn't required, for COD). See supabase/migrations/0001_init.sql's note
// on why payment_status has no 'failed' value.
//
// promoCode is looked up here, independently, rather than trusting a
// discount amount the client might submit — same principle as re-deriving
// prices from product data in computeOrderTotals. For the Razorpay path,
// this must land on the exact same discount /api/razorpay/create-order
// already used to size the payment (same code, same cart, same
// deterministic math), so the stored order matches what was actually charged.
export async function createOrder(
  supabase: SupabaseClient,
  userId: string,
  addressId: string,
  cart: Record<string, number>,
  payment: PaymentInfo,
  promoCode: string | null = null
) {
  const promo = await lookupPromoCode(supabase, promoCode);
  const totals = computeOrderTotals(cart, promo);

  let orderId: string | null = null;
  let orderNumber = "";
  for (let attempt = 0; attempt < 5 && !orderId; attempt++) {
    orderNumber = generateOrderNumber();
    const { data, error } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: userId,
        address_id: addressId,
        payment_method: payment.method,
        payment_status: payment.method === "cod" ? "pending" : "paid",
        payment_provider: payment.method === "cod" ? null : "razorpay",
        payment_id: payment.method === "cod" ? null : payment.paymentId,
        subtotal_rupees: totals.subtotalRupees,
        shipping_rupees: totals.shippingRupees,
        discount_rupees: totals.discountRupees,
        total_rupees: totals.totalRupees,
        estimated_delivery: estimatedDeliveryDate(),
      })
      .select("id")
      .single();

    if (!error && data) {
      orderId = data.id as string;
    } else if (error && error.code !== "23505") {
      // Not a unique-violation on order_number — a real failure, stop retrying.
      throw error;
    }
  }

  if (!orderId) throw new Error("Could not generate a unique order number");

  const { error: itemsError } = await supabase.from("order_items").insert(
    totals.items.map((item) => ({
      order_id: orderId,
      product_variant_id: null,
      product_name_snapshot: item.productName,
      variant_label_snapshot: item.variantLabel,
      unit_price_rupees_snapshot: item.unitPriceRupees,
      quantity: item.qty,
      line_total_rupees: item.lineTotalRupees,
    }))
  );

  if (itemsError) throw itemsError;

  return { orderId, orderNumber };
}
