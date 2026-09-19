import type { SupabaseClient } from "@supabase/supabase-js";
import { computeOrderTotals, estimatedDeliveryDate, MIN_ORDER_RUPEES } from "./order-math";
import { lookupPromoCode } from "./promo";
import { fetchVariantsByIds } from "./products";
import { getAddressCoordinates, distanceFromFulfillmentCenterKm } from "./shipping";
import { notifyAdminsOfNewOrder } from "./notify-admins";
import { notifyCustomerOfNewOrder } from "./notify-customer";

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

  // order_number isn't set here — it defaults from orders_order_number_seq
  // (supabase/migrations/0019_order_number_sequence.sql), the same
  // sequence-backed-column pattern as product_variants.item_id /
  // promo_codes.promo_id (0017_item_and_promo_ids.sql), so no
  // collision-retry loop is needed the way the old client-generated random
  // PSN-NNNNN number required.
  const estimatedDelivery = estimatedDeliveryDate();
  const { data, error } = await supabase
    .from("orders")
    .insert({
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
      estimated_delivery: estimatedDelivery,
    })
    .select("id, order_number")
    .single();

  if (error) throw error;
  const orderId = data.id as string;
  const orderNumber = data.order_number as number;

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

  // Both notifications below need display details neither the insert above
  // already has — the profile (for name/email) and the delivery address
  // (for the shipping block in each email). Fetched once, up front, with
  // the caller's own RLS-scoped client, same as everything else in this
  // function; a user can always read their own profile/address rows.
  const [{ data: profile }, { data: address }] = await Promise.all([
    supabase.from("profiles").select("name, email").eq("id", userId).single(),
    supabase
      .from("addresses")
      .select("recipient_name, line1, line2, city, state, postal_code")
      .eq("id", addressId)
      .single(),
  ]);

  const notificationItems = totals.items.map((item) => ({
    productName: item.productName,
    variantLabel: item.variantLabel,
    qty: item.qty,
    lineTotalRupees: item.lineTotalRupees,
  }));
  const notificationAddress = address
    ? {
        recipientName: address.recipient_name,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postalCode: address.postal_code,
      }
    : null;

  // Best-effort — see notify-admins.ts, this can never throw/break checkout.
  // Sent even if profile/address failed to load above (falls back to "—"
  // in the email) — an admin still needs to know an order came in.
  await notifyAdminsOfNewOrder({
    orderNumber,
    totalRupees: totals.totalRupees,
    paymentMethod: payment.method,
    customerName: profile?.name ?? profile?.email ?? "—",
    items: notificationItems,
    estimatedDelivery,
    address: notificationAddress,
  });

  if (profile && address && notificationAddress) {
    // Best-effort — see notify-customer.ts, this can never throw/break checkout.
    await notifyCustomerOfNewOrder({
      to: profile.email,
      customerName: profile.name ?? profile.email,
      orderNumber,
      items: notificationItems,
      subtotalRupees: totals.subtotalRupees,
      shippingRupees: totals.shippingRupees,
      discountRupees: totals.discountRupees,
      totalRupees: totals.totalRupees,
      paymentMethod: payment.method,
      estimatedDelivery,
      address: notificationAddress,
    });
  }

  return { orderId, orderNumber };
}
