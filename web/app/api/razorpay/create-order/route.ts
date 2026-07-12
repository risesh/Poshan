import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { createClient } from "@/lib/supabase/server";
import { computeOrderTotals } from "@/lib/order-math";
import { lookupPromoCode } from "@/lib/promo";

// Only creates a Razorpay order (a payment *attempt*) — never our own
// `orders` row. That happens in /api/razorpay/verify, only once payment
// actually succeeds. See lib/create-order.ts.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { cart, promoCode } = (await request.json()) as {
    cart: Record<string, number>;
    promoCode?: string | null;
  };

  let totals;
  try {
    // Looked up here, not trusted from the client, so the Razorpay amount
    // below (what's actually charged) reflects a real, currently-active
    // promo — /api/razorpay/verify re-derives the same thing independently
    // when the order row is written, so the two always agree.
    const promo = await lookupPromoCode(supabase, promoCode);
    totals = computeOrderTotals(cart, promo);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid cart" },
      { status: 400 }
    );
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return NextResponse.json(
      { error: "Online payment isn't configured yet — Razorpay API keys are missing." },
      { status: 503 }
    );
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  try {
    const order = await razorpay.orders.create({
      // Razorpay's API always takes an amount in paise, regardless of our
      // own whole-rupee storage rule (supabase/migrations/0001_init.sql) —
      // this ×100 is a wire-format requirement, not a schema decision.
      amount: totals.totalRupees * 100,
      currency: "INR",
      receipt: `checkout_${user.id.slice(0, 8)}_${Date.now()}`,
    });

    return NextResponse.json({
      razorpayOrderId: order.id,
      amountRupees: totals.totalRupees,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not start payment. Please try again or use Cash on Delivery." },
      { status: 502 }
    );
  }
}
