"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { createClient } from "@/lib/supabase/client";
import { listActivePromoCodes, describePromoCode } from "@/lib/promo";
import type { PromoInfo } from "@/lib/order-math";

const formatRupees = (n: number) => "₹" + n.toLocaleString("en-IN");

// Shared by the cart and checkout order summaries — picking a code from
// the dropdown applies it immediately (no separate "Apply" step, unlike
// the old free-text field this replaced) via cart context's promoCode, the
// same way both pages already read/display whatever's applied.
export default function PromoCodeField({ subtotalRupees }: { subtotalRupees: number }) {
  const { promoCode, setPromoCode } = useCart();
  const supabase = useMemo(() => createClient(), []);
  const [codes, setCodes] = useState<PromoInfo[] | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listActivePromoCodes(supabase).then((list) => {
      if (!cancelled) setCodes(list);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const select = (promo: PromoInfo) => {
    setOpen(false);
    if (subtotalRupees < promo.minOrderRupees) {
      setError(`This code needs a minimum order of ${formatRupees(promo.minOrderRupees)}.`);
      return;
    }
    setError(null);
    setPromoCode(promo.code);
  };

  const remove = () => {
    setPromoCode(null);
    setError(null);
  };

  if (promoCode) {
    return (
      <div className="cart-summary__promo">
        <div className="cart-summary__promo-input cart-summary__promo-input--applied">{promoCode}</div>
        <button type="button" className="cart-summary__promo-btn cart-summary__promo-btn--remove" onClick={remove}>
          Remove
        </button>
      </div>
    );
  }

  const noCodesAvailable = codes !== null && codes.length === 0;

  return (
    <div className="promo-dropdown-wrap">
      <div className="cart-summary__promo">
        <button
          type="button"
          className={`cart-summary__promo-input promo-dropdown-trigger${open ? " is-open" : ""}`}
          disabled={noCodesAvailable}
          onClick={() => setOpen((v) => !v)}
          onBlur={() => setOpen(false)}
        >
          <span className="promo-dropdown-trigger__label">
            {noCodesAvailable ? "No promo codes available" : "Select a promo code"}
          </span>
          <svg
            className="promo-dropdown-trigger__chevron"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>
      {open && codes && codes.length > 0 && (
        <div className="promo-dropdown">
          {codes.map((promo) => (
            <button
              key={promo.code}
              type="button"
              className="promo-dropdown__item"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(promo)}
            >
              <div className="promo-dropdown__code">{promo.code}</div>
              <div className="promo-dropdown__desc">{describePromoCode(promo)}</div>
            </button>
          ))}
        </div>
      )}
      {error && <div className="cart-summary__promo-note cart-summary__promo-note--error">{error}</div>}
    </div>
  );
}
