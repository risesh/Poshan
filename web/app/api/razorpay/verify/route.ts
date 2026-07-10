import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createOrder } from "@/lib/create-order";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await request.json();
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    addressId,
    cart,
  } = body as {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    addressId: string;
    cart: Record<string, number>;
  };

  if (!process.env.RAZORPAY_KEY_SECRET) {
    return NextResponse.json({ error: "Payments aren't configured yet" }, { status: 503 });
  }

  // Razorpay's own recommended verification: HMAC-SHA256 of
  // "order_id|payment_id" using the account's key secret must match the
  // signature the client got back from the checkout modal. This is what
  // actually proves the payment happened — nothing before this point does.
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  // The checkout modal's success callback doesn't say which method the
  // customer actually used (UPI/card/netbanking) — ask Razorpay directly.
  // Wallet/EMI aren't in our narrower payment_method enum, so they fall
  // back to 'card'; this only affects which label gets stored, the
  // signature check above already proved the payment itself.
  let method: "upi" | "card" | "netbanking" = "card";
  try {
    const auth = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString("base64");
    const res = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const payment = await res.json();
    if (payment.method === "upi") method = "upi";
    else if (payment.method === "netbanking") method = "netbanking";
  } catch {
    // Payment is already verified above; a failed lookup here only means
    // it gets stored under the 'card' fallback label.
  }

  try {
    const { orderId, orderNumber } = await createOrder(supabase, user.id, addressId, cart, {
      method,
      paymentId: razorpay_payment_id,
    });
    return NextResponse.json({ orderId, orderNumber });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not place order" },
      { status: 400 }
    );
  }
}
