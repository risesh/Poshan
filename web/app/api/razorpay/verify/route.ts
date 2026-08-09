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
    promoCode,
  } = body as {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    addressId: string;
    cart: Record<string, number>;
    promoCode?: string | null;
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

  const expectedBuf = Buffer.from(expectedSignature);
  const actualBuf = Buffer.from(razorpay_signature ?? "");
  const signatureValid =
    expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);
  if (!signatureValid) {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  // The signature only proves *a* payment happened for this order_id/
  // payment_id pair — not what it was for or how much. Ask Razorpay
  // directly for the payment's own record of the order it belongs to and
  // the amount actually charged, and treat that (not the cart in this
  // request body) as the source of truth. Unlike the method lookup below,
  // a failure here must be fatal — without it there's no way to confirm
  // the order about to be written matches what was actually paid.
  let method: "upi" | "card" | "netbanking" = "card";
  let paidAmountRupees: number;
  try {
    const auth = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString("base64");
    const res = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const payment = await res.json();
    if (payment.order_id !== razorpay_order_id || typeof payment.amount !== "number") {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }
    if (payment.method === "upi") method = "upi";
    else if (payment.method === "netbanking") method = "netbanking";
    // Razorpay amounts are in paise (see create-order/route.ts's ×100).
    paidAmountRupees = payment.amount / 100;
  } catch {
    return NextResponse.json(
      { error: "Could not confirm payment amount. Please contact support if you were charged." },
      { status: 502 }
    );
  }

  try {
    const { orderId, orderNumber } = await createOrder(
      supabase,
      user.id,
      addressId,
      cart,
      { method, paymentId: razorpay_payment_id },
      promoCode ?? null,
      paidAmountRupees
    );
    return NextResponse.json({ orderId, orderNumber });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not place order" },
      { status: 400 }
    );
  }
}
