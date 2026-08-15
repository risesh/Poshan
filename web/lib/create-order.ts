import type { SupabaseClient } from "@supabase/supabase-js";
import { computeOrderTotals, generateOrderNumber, estimatedDeliveryDate, MIN_ORDER_RUPEES } from "./order-math";
import { lookupPromoCode } from "./promo";
import { fetchVariantsByIds } from "./products";
import { getAddressCoordinates, distanceFromFulfillmentCenterKm } from "./shipping";
import { notifyAdminsOfNewOrder } from "./notify-admins";

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
// prices from product data in computeOrderTotals.
//
// For the Razorpay path, `expectedTotalRupees` (what Razorpay confirms was
// actually paid — see verify/route.ts) is checked against the total this
// function computes from `cart`/`promoCode`/`addressId`. Without this, the
// cart/promo/address here would be trusted at face value: a client could
// reuse a valid signature from a small real payment and submit a
// completely different, expensive cart at verify time. The payment_id
// pre-check below closes the companion hole — reusing that same valid
// payment a second time to mint additional paid orders.
export async function createOrder(
  supabase: SupabaseClient,
  userId: string,
  addressId: string,
  cart: Record<string, number>,
  payment: PaymentInfo,
  promoCode: string | null = null,
  expectedTotalRupees?: number
) {
  if (payment.method !== "cod") {
    const { data: existingOrder } = await supabase
      .from("orders")
      .select("id")
      .eq("payment_id", payment.paymentId)
      .maybeSingle();
    if (existingOrder) {
      throw new Error("This payment has already been used to place an order.");
    }
  }

  const promo = await lookupPromoCode(supabase, promoCode);

  // Never trust a shipping fee from the client — look up the delivery
  // address's coordinates ourselves and compute distance server-side. A
  // missing lat/lng (saved while Google Places was unreachable, or before
  // location search existed) isn't fatal — computeShippingRupees prices
  // that as a flat fallback rate instead of blocking the order outright.
  const coords = await getAddressCoordinates(supabase, addressId);
  const distanceKm = coords ? distanceFromFulfillmentCenterKm(coords.lat, coords.lng) : null;
  const variantLookup = await fetchVariantsByIds(supabase, Object.keys(cart));
  const totals = computeOrderTotals(cart, promo, distanceKm, variantLookup);

  // Storewide minimum, independent of any promo — never trust the client's
  // disabled-button state alone (see MIN_ORDER_RUPEES's own comment).
  if (totals.subtotalRupees < MIN_ORDER_RUPEES) {
    throw new Error(`Minimum order value is ₹${MIN_ORDER_RUPEES}.`);
  }

  if (expectedTotalRupees !== undefined && totals.totalRupees !== expectedTotalRupees) {
    throw new Error(
      "This order's cart doesn't match what was actually paid for. No order was placed — please contact support if you were charged."
    );
  }

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
      // Real FK now that cart ids are Supabase product_variants.id UUIDs
      // (previously always null — see web/CLAUDE.md's note on why).
      // Snapshot columns below remain the historical source of truth even
      // if this variant is later edited or removed.
      product_variant_id: item.variantId,
      product_name_snapshot: item.productName,
      variant_label_snapshot: item.variantLabel,
      unit_price_rupees_snapshot: item.unitPriceRupees,
      quantity: item.qty,
      line_total_rupees: item.lineTotalRupees,
    }))
  );

  if (itemsError) throw itemsError;

  // Best-effort — see notify-admins.ts, this can never throw/break checkout.
  await notifyAdminsOfNewOrder({
    orderNumber,
    totalRupees: totals.totalRupees,
    paymentMethod: payment.method,
  });

  return { orderId, orderNumber };
}
