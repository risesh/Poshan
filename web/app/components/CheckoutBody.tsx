"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { computeOrderTotals, type PromoInfo } from "@/lib/order-math";
import { lookupPromoCode } from "@/lib/promo";
import { getVariantById } from "@/lib/products";

const formatRupees = (n: number) => "₹" + n.toLocaleString("en-IN");

// Strips everything but digits, and drops a leading "91" country code if
// present (defaultPhone may arrive as a bare 10-digit number or a full
// "+91 98765 43210" string depending on how it was originally saved) — the
// phone field only ever holds the local 10-digit number, since "+91" is a
// fixed, non-editable prefix in the UI.
function localPhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length > 10 && digits.startsWith("91") ? digits.slice(2) : digits;
}

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
  const { cart, clearCart, hydrated, promoCode, setPromoCode } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? null
  );
  const [showNewAddressForm, setShowNewAddressForm] = useState(addresses.length === 0);
  const [recipientName, setRecipientName] = useState(defaultName);
  const [recipientPhone, setRecipientPhone] = useState(() => localPhoneDigits(defaultPhone));
  const [flatNo, setFlatNo] = useState("");
  const [streetName, setStreetName] = useState("");
  const [area, setArea] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [postalCode, setPostalCode] = useState("");

  // Browser autofill (esp. for "name"/"tel"/address-shaped fields, which
  // none of these have autoComplete set to disable) can set an <input>'s
  // DOM value directly without firing the input event React's onChange
  // relies on — the field then looks filled on screen while its React
  // state var stays at "". These refs let placeOrder() read the *actual*
  // live DOM value at submit time instead of trusting state that may have
  // silently gone stale that way.
  const recipientNameRef = useRef<HTMLInputElement>(null);
  const recipientPhoneRef = useRef<HTMLInputElement>(null);
  const flatNoRef = useRef<HTMLInputElement>(null);
  const streetNameRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLInputElement>(null);
  const line2Ref = useRef<HTMLInputElement>(null);
  const cityRef = useRef<HTMLInputElement>(null);
  const stateRef = useRef<HTMLInputElement>(null);
  const postalCodeRef = useRef<HTMLInputElement>(null);
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

  // Mirrors CartPageBody's own re-fetch: cart context only stores the code
  // string, so both pages independently look up the current promo row
  // rather than trusting a stale discount amount carried over from the
  // cart page.
  const [appliedPromo, setAppliedPromo] = useState<PromoInfo | null>(null);

  useEffect(() => {
    if (!promoCode) return;
    let cancelled = false;
    lookupPromoCode(supabase, promoCode).then((promo) => {
      if (!cancelled) setAppliedPromo(promo);
    });
    return () => {
      cancelled = true;
    };
  }, [promoCode, supabase]);

  // Guards against showing a stale fetched promo right after it's removed.
  const effectiveAppliedPromo = promoCode ? appliedPromo : null;

  const totals = useMemo(() => {
    try {
      return computeOrderTotals(cart, effectiveAppliedPromo);
    } catch {
      return null;
    }
  }, [cart, effectiveAppliedPromo]);

  // Mirrors CartPageBody's own promo box — checkout previously only ever
  // displayed+removed whatever promo the cart page had applied, with no way
  // to apply a new one once that was cleared from here.
  const [promoInput, setPromoInput] = useState("");
  const [promoChecking, setPromoChecking] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  const applyPromo = async () => {
    const code = promoInput.trim();
    if (promoCode || !code || promoChecking) return;
    setPromoChecking(true);
    setPromoError(null);
    const promo = await lookupPromoCode(supabase, code);
    setPromoChecking(false);

    if (!promo) {
      setPromoError("That promo code isn't valid or has expired.");
      return;
    }
    if (totals && totals.subtotalRupees < promo.minOrderRupees) {
      setPromoError(`This code needs a minimum order of ${formatRupees(promo.minOrderRupees)}.`);
      return;
    }

    setAppliedPromo(promo);
    setPromoCode(promo.code);
  };

  const removePromo = () => {
    setPromoCode(null);
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError(null);
  };

  // A ref, not state — state updates are async/batched, so a second click
  // fired before React re-renders the disabled Pay button would still read
  // stale (not-yet-busy) state and slip through. This is what let one
  // order insert the same new address 2-3 times when clicked repeatedly.
  const submittingRef = useRef(false);
  // Tracks an address inserted *this attempt* so it can be deleted again if
  // the order ultimately fails — an address should only stick around once
  // it's actually been used to place an order, not just typed into the form.
  const newAddressIdRef = useRef<string | null>(null);

  const rollbackNewAddress = async () => {
    if (!newAddressIdRef.current) return;
    await supabase.from("addresses").delete().eq("id", newAddressIdRef.current);
    newAddressIdRef.current = null;
  };

  const placeOrder = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    const fail = async (msg: string) => {
      await rollbackNewAddress();
      setBusy(false);
      submittingRef.current = false;
      setError(msg);
    };

    setError(null);

    let addressId = selectedAddressId;

    // Read the live DOM value for each field rather than trusting state
    // directly — browser autofill on these fields (name/tel/city/state/
    // postal code are all autofill-recognizable) can set an input's value
    // without firing the event React's onChange listens for, leaving state
    // stale while the field still looks filled on screen. Computed up here
    // (not just inside the new-address branch) so the Razorpay prefill
    // below also gets the corrected values.
    const effRecipientName = recipientNameRef.current?.value ?? recipientName;
    const effRecipientPhoneDigits = localPhoneDigits(recipientPhoneRef.current?.value ?? recipientPhone);
    const effRecipientPhone = effRecipientPhoneDigits ? `+91 ${effRecipientPhoneDigits}` : "";

    if (showNewAddressForm) {
      const effFlatNo = flatNoRef.current?.value ?? flatNo;
      const effStreetName = streetNameRef.current?.value ?? streetName;
      const effArea = areaRef.current?.value ?? area;
      const effLine2 = line2Ref.current?.value ?? line2;
      const effCity = cityRef.current?.value ?? city;
      const effState = stateRef.current?.value ?? stateVal;
      const effPostalCode = postalCodeRef.current?.value ?? postalCode;

      // Name the missing fields explicitly rather than a generic message —
      // a field can visually look filled when it's actually only showing
      // placeholder text (e.g. Phone's placeholder is a realistic-looking
      // example number), which a generic "fill in all fields" error can't
      // help someone spot.
      const missing: string[] = [];
      if (!effRecipientName.trim()) missing.push("Full name");
      if (!effRecipientPhoneDigits) missing.push("Phone number");
      if (!effFlatNo.trim()) missing.push("Flat / Plot / House no.");
      if (!effStreetName.trim()) missing.push("Street name");
      if (!effArea.trim()) missing.push("Area / Locality");
      if (!effCity.trim()) missing.push("City");
      if (!effState.trim()) missing.push("State");
      if (!effPostalCode.trim()) missing.push("Pincode");
      if (missing.length > 0) {
        submittingRef.current = false;
        setError(`Please fill in: ${missing.join(", ")}.`);
        return;
      }
      setBusy(true);
      const line1 = [effFlatNo.trim(), effStreetName.trim(), effArea.trim()].filter(Boolean).join(", ");
      const { data, error: insertError } = await supabase
        .from("addresses")
        .insert({
          user_id: user!.id,
          label: "Home",
          recipient_name: effRecipientName.trim(),
          recipient_phone: effRecipientPhone.trim(),
          line1,
          line2: effLine2.trim() || null,
          city: effCity.trim(),
          state: effState.trim(),
          postal_code: effPostalCode.trim(),
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

      if (insertError || !data) {
        setBusy(false);
        submittingRef.current = false;
        setError("Could not save that address. Please check the fields and try again.");
        return;
      }
      addressId = data.id;
      newAddressIdRef.current = data.id;
    }

    if (!addressId) {
      setBusy(false);
      submittingRef.current = false;
      setError("Please select or add a delivery address.");
      return;
    }

    setBusy(true);

    if (paymentMethod === "cod") {
      const res = await fetch("/api/orders/cod", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId, cart, promoCode }),
      });
      const json = await res.json();
      if (!res.ok) {
        await fail(json.error ?? "Could not place order.");
        return;
      }
      orderPlacedRef.current = true;
      newAddressIdRef.current = null;
      setBusy(false);
      clearCart();
      router.push(`/orders/${json.orderId}`);
      return;
    }

    // Online payment via Razorpay
    const createRes = await fetch("/api/razorpay/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart, promoCode }),
    });
    const createJson = await createRes.json();
    if (!createRes.ok) {
      await fail(createJson.error ?? "Could not start payment.");
      return;
    }

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      await fail("Could not load the payment gateway. Check your connection and try again.");
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
      prefill: { name: effRecipientName || defaultName, contact: effRecipientPhone || defaultPhone },
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
          body: JSON.stringify({ ...response, addressId, cart, promoCode }),
        });
        const verifyJson = await verifyRes.json();
        if (!verifyRes.ok) {
          await fail(verifyJson.error ?? "Payment could not be verified.");
          return;
        }
        orderPlacedRef.current = true;
        newAddressIdRef.current = null;
        setBusy(false);
        clearCart();
        router.push(`/orders/${verifyJson.orderId}`);
      },
      modal: {
        // Payment window closed/cancelled without completing — nothing was
        // ever charged or ordered, so an address created for this attempt
        // shouldn't stick around either.
        ondismiss: () => {
          void rollbackNewAddress();
          setBusy(false);
          submittingRef.current = false;
        },
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
                  ref={recipientNameRef}
                  className="checkout-input"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Recipient's name"
                  autoComplete="name"
                />
              </div>
              <div className="checkout-field-group" style={{ maxWidth: "none", marginBottom: 16 }}>
                <span className="checkout-field-label">Phone number</span>
                <div className="checkout-phone-input-wrap">
                  <span className="checkout-phone-input-wrap__prefix">+91</span>
                  <input
                    ref={recipientPhoneRef}
                    className="checkout-input"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="xxxxx xxxxx"
                    autoComplete="tel-national"
                    inputMode="numeric"
                  />
                </div>
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
                    ref={flatNoRef}
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
                    ref={streetNameRef}
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
                    ref={areaRef}
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
                  ref={line2Ref}
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
                    ref={cityRef}
                    className="checkout-input"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    autoComplete="address-level2"
                  />
                </div>
                <div>
                  <span className="checkout-field-label">Pincode</span>
                  <input
                    ref={postalCodeRef}
                    className="checkout-input"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="000000"
                    autoComplete="postal-code"
                  />
                </div>
              </div>
              <div className="checkout-address-form__row">
                <div>
                  <span className="checkout-field-label">State</span>
                  <input
                    ref={stateRef}
                    className="checkout-input"
                    value={stateVal}
                    onChange={(e) => setStateVal(e.target.value)}
                    placeholder="State"
                    autoComplete="address-level1"
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
                {totals.discountRupees > 0 && (
                  <div className="cart-summary__row cart-summary__row--discount">
                    <span>Promo ({totals.promoCode})</span>
                    <span>−{formatRupees(totals.discountRupees)}</span>
                  </div>
                )}
              </div>
              <div className="cart-summary__total">
                <span className="cart-summary__total-label">Total</span>
                <span className="cart-summary__total-value">{formatRupees(totals.totalRupees)}</span>
              </div>

              <div className="cart-summary__promo">
                <input
                  type="text"
                  placeholder="Promo code"
                  className="cart-summary__promo-input"
                  value={promoCode ?? promoInput}
                  onChange={(e) => {
                    setPromoInput(e.target.value);
                    if (promoError) setPromoError(null);
                  }}
                  disabled={!!promoCode || promoChecking}
                />
                <button
                  type="button"
                  className={`cart-summary__promo-btn${promoCode ? " cart-summary__promo-btn--remove" : ""}`}
                  onClick={promoCode ? removePromo : applyPromo}
                  disabled={promoChecking}
                >
                  {promoCode ? "Remove" : promoChecking ? "Checking…" : "Apply"}
                </button>
              </div>
              {promoError && (
                <div className="cart-summary__promo-note cart-summary__promo-note--error">{promoError}</div>
              )}

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
