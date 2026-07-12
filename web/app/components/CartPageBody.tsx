"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { getVariantById } from "@/lib/products";
import { computePromoDiscount, type PromoInfo } from "@/lib/order-math";
import { lookupPromoCode } from "@/lib/promo";

const formatRupees = (n: number) => "₹" + n.toLocaleString("en-IN");

export default function CartPageBody() {
  const { cart, total, incrementItem, decrementItem, removeItem, promoCode, setPromoCode } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [promoInput, setPromoInput] = useState("");
  const [promoChecking, setPromoChecking] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  // The full promo row for cart context's promoCode — re-fetched whenever
  // that code changes (including on hydration from localStorage on load),
  // so the discount always reflects the *current* promo definition rather
  // than a stale snapshot from whenever it was first applied.
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

  // Guards against showing a stale fetched promo after the code's been
  // cleared (removePromo doesn't wait for a re-render before the discount
  // needs to read as gone).
  const effectiveAppliedPromo = promoCode ? appliedPromo : null;

  const entries = Object.entries(cart);
  const itemCount = entries.length;
  const jarCount = total;

  const meta =
    itemCount === 0
      ? ""
      : `${itemCount} item${itemCount === 1 ? "" : "s"} · ${jarCount} jar${jarCount === 1 ? "" : "s"}`;

  if (itemCount === 0) {
    return (
      <>
        <section className="cart-header">
          <div className="cart-header__inner">
            <h1 className="cart-header__title">Your cart</h1>
            <div className="cart-header__meta">{meta}</div>
          </div>
        </section>
        <section className="cart-body">
          <div className="cart-empty">
            <h2 className="cart-empty__title">Your cart is empty</h2>
            <Link href="/#products" className="cart-empty__link">
              Browse products
            </Link>
          </div>
        </section>
      </>
    );
  }

  const subtotal = entries.reduce((sum, [id, qty]) => {
    const hit = getVariantById(id);
    return hit ? sum + hit.variant.priceRupees * qty : sum;
  }, 0);
  const shipping = subtotal >= 500 ? 0 : 49;
  const discount = computePromoDiscount(subtotal, effectiveAppliedPromo);
  const grandTotal = subtotal + shipping - discount;

  const applyPromo = async () => {
    const code = promoInput.trim();
    if (promoCode || !code || promoChecking) return;
    setPromoChecking(true);
    setPromoError(null);
    // RLS on promo_codes only allows selecting rows where active = true, so
    // an inactive code comes back as "no row" — indistinguishable from a
    // code that was never registered or one that's expired, which is fine:
    // all three should read as "not valid" here.
    const promo = await lookupPromoCode(supabase, code);
    setPromoChecking(false);

    if (!promo) {
      setPromoError("That promo code isn't valid or has expired.");
      return;
    }
    if (subtotal < promo.minOrderRupees) {
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

  const handleCheckout = () => {
    router.push(user ? "/checkout" : "/signin?return=/checkout");
  };

  return (
    <>
      <section className="cart-header">
        <div className="cart-header__inner">
          <h1 className="cart-header__title">Your cart</h1>
          <div className="cart-header__meta">{meta}</div>
        </div>
      </section>
      <section className="cart-body">
        <div className="cart-body__grid">
          <div className="cart-items">
            {entries.map(([id, qty]) => {
              const hit = getVariantById(id);
              if (!hit) return null;
              const { product, variant } = hit;
              return (
                <div className="cart-item" key={id}>
                  <div
                    className="cart-item__thumb"
                    style={{ background: product.thumbGradient }}
                  >
                    <div
                      className="cart-item__thumb-name"
                      style={{ fontSize: product.thumbNameSize }}
                    >
                      {product.thumbNameLines.map((line, i) => (
                        <span key={i}>
                          {i > 0 && <br />}
                          {line}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="cart-item__badge">{product.cartBadge}</div>
                    <div className="cart-item__name">{product.name}</div>
                    <div className="cart-item__size">
                      {variant.size === "500ml"
                        ? "500 ml"
                        : variant.size === "1L"
                          ? "1 L"
                          : variant.size}
                    </div>
                    <div className="cart-item__controls">
                      <div className="card__qty">
                        <button
                          className="card__qty-btn"
                          aria-label="Decrease quantity"
                          onClick={() => decrementItem(id)}
                        >
                          −
                        </button>
                        <span className="card__qty-count">{qty}</span>
                        <button
                          className="card__qty-btn"
                          aria-label="Increase quantity"
                          onClick={() => incrementItem(id)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="cart-item__remove"
                        onClick={() => removeItem(id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="cart-item__price">
                    {formatRupees(variant.priceRupees * qty)}
                  </div>
                </div>
              );
            })}
            <div className="cart-continue">
              <Link href="/#products" className="cart-continue__link">
                ← Continue shopping
              </Link>
            </div>
          </div>
          <aside className="cart-summary">
            <div className="cart-summary__label">Order summary</div>
            <div className="cart-summary__rows">
              <div className="cart-summary__row">
                <span>Subtotal</span>
                <span>{formatRupees(subtotal)}</span>
              </div>
              <div className="cart-summary__row">
                <span>Shipping</span>
                <span>{shipping === 0 ? "Free" : formatRupees(shipping)}</span>
              </div>
              {discount > 0 && (
                <div className="cart-summary__row cart-summary__row--discount">
                  <span>Promo ({effectiveAppliedPromo?.code})</span>
                  <span>−{formatRupees(discount)}</span>
                </div>
              )}
            </div>
            <div className="cart-summary__total">
              <span className="cart-summary__total-label">Total</span>
              <span className="cart-summary__total-value">{formatRupees(grandTotal)}</span>
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
            <button
              type="button"
              className="cart-summary__checkout"
              onClick={handleCheckout}
            >
              Checkout · {formatRupees(grandTotal)}
            </button>
            <div className="cart-summary__shipping-note">Free shipping over ₹500</div>
          </aside>
        </div>
      </section>
    </>
  );
}
