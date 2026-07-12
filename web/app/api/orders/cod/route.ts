import { NextResponse } from "next/server";
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
  const { addressId, cart, promoCode } = body as {
    addressId: string;
    cart: Record<string, number>;
    promoCode?: string | null;
  };
  if (!addressId || !cart) {
    return NextResponse.json({ error: "Missing addressId or cart" }, { status: 400 });
  }

  try {
    const { orderId, orderNumber } = await createOrder(
      supabase,
      user.id,
      addressId,
      cart,
      { method: "cod" },
      promoCode ?? null
    );
    return NextResponse.json({ orderId, orderNumber });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not place order" },
      { status: 400 }
    );
  }
}
