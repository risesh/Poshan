"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { computeOrderTotals } from "@/lib/order-math";
import { getVariantById } from "@/lib/products";

const formatRupees = (n: number) => "₹" + n.toLocaleString("en-IN");

type AutocompleteSuggestion = { placeId: string; mainText: string; secondaryText: string };

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
  const { cart, clearCart, hydrated } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? null
  );
  const [showNewAddressForm, setShowNewAddressForm] = useState(addresses.length === 0);
  const [recipientName, setRecipientName] = useState(defaultName);
  const [recipientPhone, setRecipientPhone] = useState(defaultPhone);
  const [flatNo, setFlatNo] = useState("");
  const [streetName, setStreetName] = useState("");
  const [area, setArea] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [formattedAddress, setFormattedAddress] = useState<string | null>(null);
  const [googlePlaceId, setGooglePlaceId] = useState<string | null>(null);
  // Google's own typed address components — stored separately from the 3
  // editable fields above (flatNo/streetName/area) for analytics, so they
  // stay a stable record of what Google actually geocoded even if the
  // editable fields get manually tweaked afterward. Null for addresses
  // entered without using autocomplete.
  const [googleComponents, setGoogleComponents] = useState<{
    streetNumber: string | null;
    route: string | null;
    subpremise: string | null;
    premise: string | null;
    sublocality: string | null;
    raw: unknown;
  } | null>(null);

  // Address search (Places Autocomplete + Details, design source 4b).
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  // True once a suggestion has been picked — locks the search input (grey,
  // disabled) so editing the now-formatted address text can't re-trigger
  // the debounce effect below and burn a second Autocomplete session on
  // text the user didn't actually type. The X button clears this.
  const [addressSelected, setAddressSelected] = useState(false);
  // A session token bundles every keystroke request plus the final Details
  // call into one Google-billed "session" instead of billing each request
  // separately. Lazily generated once (idempotent — only the first render's
  // assignment sticks), refreshed after each completed selection so the
  // next search starts its own session.
  const sessionTokenRef = useRef<string | null>(null);
  if (sessionTokenRef.current === null) {
    sessionTokenRef.current = crypto.randomUUID();
  }
  const searchSeqRef = useRef(0);

  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("online");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Locked after a selection — searchInput now holds the *result*
    // (a formatted address), not something the user is typing, so it
    // must never re-trigger a search on its own.
    if (addressSelected) return;
    // Below the 2-char floor, just don't schedule a fetch — no need to
    // clear suggestions/showDropdown state here too, since the render
    // below already requires searchInput.trim().length >= 2 to display
    // anything, so stale state from a previous longer query is inert.
    if (searchInput.trim().length < 2) return;
    const seq = ++searchSeqRef.current;
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch("/api/places/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: searchInput, sessionToken: sessionTokenRef.current }),
        });
        const json = await res.json();
        // Ignore this response if a newer keystroke already superseded it.
        if (seq !== searchSeqRef.current) return;
        setSuggestions(res.ok ? (json.suggestions ?? []) : []);
        setShowDropdown(true);
      } catch {
        if (seq === searchSeqRef.current) setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput, addressSelected]);

  const selectSuggestion = async (suggestion: AutocompleteSuggestion) => {
    setShowDropdown(false);
    try {
      const res = await fetch("/api/places/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: suggestion.placeId, sessionToken: sessionTokenRef.current }),
      });
      const details = await res.json();
      if (res.ok) {
        setSearchInput(details.formattedAddress ?? "");
        setAddressSelected(true);
        setFlatNo(details.flatNo ?? "");
        setStreetName(details.streetName ?? "");
        setArea(details.area ?? "");
        setCity(details.city ?? "");
        setStateVal(details.state ?? "");
        setPostalCode(details.postalCode ?? "");
        setLat(details.lat ?? null);
        setLng(details.lng ?? null);
        setFormattedAddress(details.formattedAddress ?? null);
        setGooglePlaceId(details.placeId ?? null);
        setGoogleComponents(details.googleComponents ?? null);
      }
    } finally {
      // This search session is over. Per Google's session model, a token
      // is only valid for one Autocomplete-to-Details round trip — reusing
      // it for a later search either gets rejected or billed incorrectly,
      // so the next search always needs a brand new one.
      sessionTokenRef.current = crypto.randomUUID();
    }
  };

  const clearSelectedAddress = () => {
    setAddressSelected(false);
    setSearchInput("");
    setSuggestions([]);
    setShowDropdown(false);
    // Deliberately leaves flatNo/streetName/area/city/state/postalCode as
    // they are — the fields stay manually editable, and picking a new
    // suggestion overwrites all of them anyway.
  };

  // clearCart() on a successful order also empties `cart`, which would
  // otherwise re-trigger this same guard and redirect to /cart instead of
  // the order confirmation page — set right before navigating away on
  // success so the guard skips that one render.
  const orderPlacedRef = useRef(false);

  useEffect(() => {
    // Must wait for hydrated — on a full page load (not a client-side
    // nav from /cart), cart starts at {} for one render before
    // CartProvider reads localStorage, which is indistinguishable from a
    // genuinely empty cart unless this waits for that read to finish.
    if (!orderPlacedRef.current && hydrated && Object.keys(cart).length === 0) {
      router.replace("/cart");
    }
  }, [cart, hydrated, router]);

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
      if (!recipientName.trim() || !recipientPhone.trim() || !streetName.trim() || !city.trim() || !stateVal.trim() || !postalCode.trim()) {
        setError("Please fill in all required address fields.");
        return;
      }
      setBusy(true);
      const line1 = [flatNo.trim(), streetName.trim(), area.trim()].filter(Boolean).join(", ");
      const { data, error: insertError } = await supabase
        .from("addresses")
        .insert({
          user_id: user!.id,
          label: "Home",
          recipient_name: recipientName.trim(),
          recipient_phone: recipientPhone.trim(),
          line1,
          line2: line2.trim() || null,
          city: city.trim(),
          state: stateVal.trim(),
          postal_code: postalCode.trim(),
          is_default: addresses.length === 0,
          lat,
          lng,
          formatted_address: formattedAddress,
          google_place_id: googlePlaceId,
          street_number: googleComponents?.streetNumber ?? null,
          route: googleComponents?.route ?? null,
          subpremise: googleComponents?.subpremise ?? null,
          premise: googleComponents?.premise ?? null,
          sublocality: googleComponents?.sublocality ?? null,
          raw_place_components: googleComponents?.raw ?? null,
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
              <div className="checkout-autocomplete">
                <span className="checkout-field-label">Search address</span>
                <div className="checkout-autocomplete__input-wrap">
                  <input
                    className={`checkout-input${addressSelected ? " checkout-input--disabled" : ""}`}
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowDropdown(true);
                    }}
                    onBlur={() => setShowDropdown(false)}
                    placeholder="Start typing an address or place name"
                    autoComplete="off"
                    disabled={addressSelected}
                  />
                  {addressSelected && (
                    <button
                      type="button"
                      className="checkout-autocomplete__clear"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={clearSelectedAddress}
                      aria-label="Clear selected address and search again"
                    >
                      ×
                    </button>
                  )}
                </div>
                {showDropdown && suggestions.length > 0 && searchInput.trim().length >= 2 && (
                  <div className="checkout-autocomplete__dropdown">
                    {suggestions.map((s) => (
                      <button
                        type="button"
                        key={s.placeId}
                        className="checkout-autocomplete__item"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectSuggestion(s)}
                      >
                        <svg
                          className="checkout-autocomplete__item-icon"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#4A9B8E"
                          strokeWidth="1.7"
                        >
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                          <circle cx="12" cy="10" r="2.6"></circle>
                        </svg>
                        <div>
                          <div className="checkout-autocomplete__item-main">{s.mainText}</div>
                          <div className="checkout-autocomplete__item-secondary">{s.secondaryText}</div>
                        </div>
                      </button>
                    ))}
                    <div className="checkout-autocomplete__attribution">
                      <span className="checkout-autocomplete__attribution-label">Powered by</span>
                      <span className="checkout-autocomplete__google-logo">
                        <span>G</span>
                        <span>o</span>
                        <span>o</span>
                        <span>g</span>
                        <span>l</span>
                        <span>e</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="checkout-address-form__row">
                <div>
                  <span className="checkout-field-label">Flat / Plot / House no.</span>
                  <input
                    className="checkout-input"
                    value={flatNo}
                    onChange={(e) => setFlatNo(e.target.value)}
                    placeholder="Flat, floor, building"
                  />
                </div>
              </div>
              <div className="checkout-address-form__row">
                <div>
                  <span className="checkout-field-label">Street name</span>
                  <input
                    className="checkout-input"
                    value={streetName}
                    onChange={(e) => setStreetName(e.target.value)}
                    placeholder="Street / road"
                  />
                </div>
              </div>
              <div className="checkout-address-form__row">
                <div>
                  <span className="checkout-field-label">Area / Locality</span>
                  <input
                    className="checkout-input"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="Area, neighbourhood"
                  />
                </div>
              </div>
              <div className="checkout-field-group" style={{ maxWidth: "none", marginBottom: 16 }}>
                <span className="checkout-field-label">Landmark</span>
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
