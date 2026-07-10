"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { computeOrderTotals } from "@/lib/order-math";
import { getVariantById } from "@/lib/products";

const formatRupees = (n: number) => "₹" + n.toLocaleString("en-IN");

type Address = {
  id: string;
  label: string;
  recipient_name: string;
  recipient_phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
};

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutBody({
  addresses,
  defaultPhone,
  defaultName,
}: {
  addresses: Address[];
  defaultPhone: string;
  defaultName: string;
}) {
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? null
  );
  const [showNewAddressForm, setShowNewAddressForm] = useState(addresses.length === 0);
  const [recipientName, setRecipientName] = useState(defaultName);
  const [recipientPhone, setRecipientPhone] = useState(defaultPhone);
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("online");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // clearCart() on a successful order also empties `cart`, which would
  // otherwise re-trigger this same guard and redirect to /cart instead of
  // the order confirmation page — set right before navigating away on
  // success so the guard skips that one render.
  const orderPlacedRef = useRef(false);

  useEffect(() => {
    if (!orderPlacedRef.current && Object.keys(cart).length === 0) {
      router.replace("/cart");
    }
  }, [cart, router]);

  const totals = useMemo(() => {
    try {
      return computeOrderTotals(cart);
    } catch {
      return null;
    }
  }, [cart]);

  const placeOrder = async () => {
    setError(null);

    let addressId = selectedAddressId;

    if (showNewAddressForm) {
      if (!recipientName.trim() || !recipientPhone.trim() || !line1.trim() || !city.trim() || !stateVal.trim() || !postalCode.trim()) {
        setError("Please fill in all required address fields.");
        return;
      }
      setBusy(true);
      const { data, error: insertError } = await supabase
        .from("addresses")
        .insert({
          user_id: user!.id,
          label: "Home",
          recipient_name: recipientName.trim(),
          recipient_phone: recipientPhone.trim(),
          line1: line1.trim(),
          line2: line2.trim() || null,
          city: city.trim(),
          state: stateVal.trim(),
          postal_code: postalCode.trim(),
          is_default: addresses.length === 0,
        })
        .select("id")
        .single();
      setBusy(false);

      if (insertError || !data) {
        setError("Could not save that address. Please check the fields and try again.");
        return;
      }
      addressId = data.id;
    }

    if (!addressId) {
      setError("Please select or add a delivery address.");
      return;
    }

    setBusy(true);

    if (paymentMethod === "cod") {
      const res = await fetch("/api/orders/cod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId, cart }),
      });
      const json = await res.json();
      setBusy(false);
      if (!res.ok) {
        setError(json.error ?? "Could not place order.");
        return;
      }
      orderPlacedRef.current = true;
      clearCart();
      router.push(`/orders/${json.orderId}`);
      return;
    }

    // Online payment via Razorpay
    const createRes = await fetch("/api/razorpay/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart }),
    });
    const createJson = await createRes.json();
    if (!createRes.ok) {
      setBusy(false);
      setError(createJson.error ?? "Could not start payment.");
      return;
    }

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setBusy(false);
      setError("Could not load the payment gateway. Check your connection and try again.");
      return;
    }

    setBusy(false);
    const razorpay = new window.Razorpay({
      key: createJson.keyId,
      order_id: createJson.razorpayOrderId,
      amount: createJson.amountRupees * 100,
      currency: "INR",
      name: "Poषण",
      description: "Order payment",
      prefill: { name: recipientName || defaultName, contact: recipientPhone || defaultPhone },
      theme: { color: "#1E3A34" },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        setBusy(true);
        const verifyRes = await fetch("/api/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...response, addressId, cart }),
        });
        const verifyJson = await verifyRes.json();
        setBusy(false);
        if (!verifyRes.ok) {
          setError(verifyJson.error ?? "Payment could not be verified.");
          return;
        }
        orderPlacedRef.current = true;
        clearCart();
        router.push(`/orders/${verifyJson.orderId}`);
      },
      modal: {
        ondismiss: () => setBusy(false),
      },
    });
    razorpay.open();
  };

  return (
    <>
      <section className="checkout-header">
        <h1 className="checkout-header__title">Checkout</h1>
        <div className="checkout-steps">
          <span className="checkout-step checkout-step--done">
            <span className="checkout-step__dot">✓</span>Cart
          </span>
          <span className="checkout-step__line"></span>
          <span className="checkout-step checkout-step--current">
            <span className="checkout-step__dot">2</span>Delivery &amp; payment
          </span>
        </div>
      </section>

      <div className="checkout-body">
        <div className="checkout-body__left">
          <div className="checkout-section-label">Contact</div>
          <div className="checkout-field-group">
            <span className="checkout-field-label">Email</span>
            <div className="checkout-input" style={{ color: "rgba(30,58,52,0.6)" }}>
              {user?.email}
            </div>
          </div>

          <div className="checkout-address-row">
            <div className="checkout-section-label" style={{ marginBottom: 0 }}>
              Delivery address
            </div>
            {addresses.length > 0 && (
              <button
                type="button"
                className="checkout-address-toggle"
                onClick={() => setShowNewAddressForm((v) => !v)}
              >
                {showNewAddressForm ? "Use a saved address" : "Use a new address"}
              </button>
            )}
          </div>

          {!showNewAddressForm &&
            addresses.map((addr) => (
              <button
                type="button"
                key={addr.id}
                className={`checkout-address-card${selectedAddressId === addr.id ? " is-selected" : ""}`}
                onClick={() => setSelectedAddressId(addr.id)}
              >
                <span className="checkout-address-card__radio"></span>
                <div>
                  <div className="checkout-address-card__name-row">
                    <span className="checkout-address-card__name">{addr.recipient_name}</span>
                    <span className="checkout-address-card__label">{addr.label}</span>
                  </div>
                  <div className="checkout-address-card__lines">
                    {addr.line1}
                    {addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} {addr.postal_code}
                  </div>
                  <div className="checkout-address-card__phone">{addr.recipient_phone}</div>
                </div>
              </button>
            ))}

          {showNewAddressForm && (
            <div className="checkout-address-form">
              <div className="checkout-field-group" style={{ maxWidth: "none", marginBottom: 16 }}>
                <span className="checkout-field-label">Full name</span>
                <input
                  className="checkout-input"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Recipient's name"
                />
              </div>
              <div className="checkout-field-group" style={{ maxWidth: "none", marginBottom: 16 }}>
                <span className="checkout-field-label">Phone number</span>
                <input
                  className="checkout-input"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="checkout-field-group" style={{ maxWidth: "none", marginBottom: 16 }}>
                <span className="checkout-field-label">Address</span>
                <input
                  className="checkout-input"
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="Flat, floor, building, street"
                  style={{ marginBottom: 10 }}
                />
                <input
                  className="checkout-input"
                  value={line2}
                  onChange={(e) => setLine2(e.target.value)}
                  placeholder="Landmark / apartment (optional)"
                />
              </div>
              <div className="checkout-address-form__row checkout-address-form__row--pincode">
                <div>
                  <span className="checkout-field-label">City</span>
                  <input
                    className="checkout-input"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div>
                  <span className="checkout-field-label">Pincode</span>
                  <input
                    className="checkout-input"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="000000"
                  />
                </div>
              </div>
              <div className="checkout-address-form__row">
                <div>
                  <span className="checkout-field-label">State</span>
                  <input
                    className="checkout-input"
                    value={stateVal}
                    onChange={(e) => setStateVal(e.target.value)}
                    placeholder="State"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="checkout-body__right">
          <div className="checkout-section-label">Order summary</div>

          {totals && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                {totals.items.map((item) => {
                  const hit = getVariantById(item.variantId);
                  const product = hit?.product;
                  const imageStyle = product?.image
                    ? { backgroundImage: `url('${product.image}')`, backgroundSize: "cover", backgroundPosition: "center" }
                    : { background: product?.thumbGradient };
                  return (
                    <div className="cart-item cart-item--compact" key={item.variantId}>
                      <div className="cart-item__thumb" style={imageStyle}></div>
                      <div>
                        <div className="cart-item__name">{item.productName}</div>
                        <div className="cart-item__size">
                          {item.variantLabel} · Qty {item.qty}
                        </div>
                      </div>
                      <span className="cart-item__price">{formatRupees(item.lineTotalRupees)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="cart-summary__rows" style={{ borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
                <div className="cart-summary__row">
                  <span>Subtotal</span>
                  <span>{formatRupees(totals.subtotalRupees)}</span>
                </div>
                <div className="cart-summary__row">
                  <span>Shipping</span>
                  <span>{totals.shippingRupees === 0 ? "Free" : formatRupees(totals.shippingRupees)}</span>
                </div>
              </div>
              <div className="cart-summary__total">
                <span className="cart-summary__total-label">Total</span>
                <span className="cart-summary__total-value">{formatRupees(totals.totalRupees)}</span>
              </div>

              <div className="checkout-payment">
                <button
                  type="button"
                  className={`checkout-payment__option${paymentMethod === "online" ? " is-selected" : ""}`}
                  onClick={() => setPaymentMethod("online")}
                >
                  <span className="checkout-payment__radio"></span>
                  Pay online — UPI, card or netbanking
                </button>
                <button
                  type="button"
                  className={`checkout-payment__option${paymentMethod === "cod" ? " is-selected" : ""}`}
                  onClick={() => setPaymentMethod("cod")}
                >
                  <span className="checkout-payment__radio"></span>
                  Cash on Delivery
                </button>
              </div>

              <button
                type="button"
                className="checkout-pay-btn"
                disabled={busy}
                onClick={placeOrder}
              >
                <span>{paymentMethod === "cod" ? "Place order" : "Pay"}</span>
                <span className="checkout-pay-btn__sep">·</span>
                <span className="checkout-pay-btn__amount">{formatRupees(totals.totalRupees)}</span>
              </button>

              {paymentMethod === "online" && (
                <div className="checkout-secure-note">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(30,58,52,0.5)" strokeWidth="1.8">
                    <rect x="3" y="11" width="18" height="11" rx="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span>Secure payment · UPI, cards &amp; netbanking</span>
                </div>
              )}

              {error && <div className="checkout-error">{error}</div>}
            </>
          )}
        </div>
      </div>
    </>
  );
}
