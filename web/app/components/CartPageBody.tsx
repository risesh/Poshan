"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { fetchVariantsByIds, type VariantLookup } from "@/lib/products";
import { computeCartPricing, MIN_ORDER_RUPEES, type PromoInfo } from "@/lib/order-math";
import { lookupPromoCode } from "@/lib/promo";
import PromoCodeField from "./PromoCodeField";

const formatRupees = (n: number) => "₹" + n.toLocaleString("en-IN");

export default function CartPageBody() {
  const { cart, total, incrementItem, decrementItem, removeItem, promoCode } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
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

  // Cart pricing now needs a Supabase round trip (variant ids/prices no
  // longer live in a bundled static array) — resolved once per cart
  // change, same idiom as the appliedPromo effect above.
  const [variantLookup, setVariantLookup] = useState<VariantLookup | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchVariantsByIds(supabase, Object.keys(cart)).then((lookup) => {
      if (!cancelled) setVariantLookup(lookup);
    });
    return () => {
      cancelled = true;
    };
  }, [cart, supabase]);

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

  if (!variantLookup) {
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
            <h2 className="cart-empty__title">Loading your cart…</h2>
          </div>
        </section>
      </>
    );
  }

  let pricing;
  try {
    pricing = computeCartPricing(cart, effectiveAppliedPromo, variantLookup);
  } catch {
    pricing = null;
  }
  const subtotal = pricing?.subtotalRupees ?? 0;
  // No delivery address yet on the cart page, so no real shipping fee can
  // be shown here — it's distance-based now (lib/shipping.ts), computed
  // once a delivery location is chosen at checkout.
  const discount = pricing?.discountRupees ?? 0;
  const grandTotal = subtotal - discount;
  const belowMinimum = subtotal < MIN_ORDER_RUPEES;
  const amountToMinimum = MIN_ORDER_RUPEES - subtotal;

  const handleCheckout = () => {
    if (belowMinimum || !pricing) return;
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
              const hit = variantLookup.get(id);
              if (!hit) return null;
              const { product, variant } = hit;
              return (
                <div className="cart-item" key={id}>
                  {product.image ? (
                    <div
                      className="cart-item__thumb"
                      style={{
                        backgroundImage: `url('${product.image}')`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    />
                  ) : (
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
                  )}
                  <div>
                    <div className="cart-item__badge">{product.cartBadge}</div>
                    <div className="cart-item__name">{product.name}</div>
                    <div className="cart-item__size">{variant.size}</div>
                    {!variant.isInStock && (
                      <div className="cart-summary__promo-note cart-summary__promo-note--error">
                        No longer in stock — remove to continue
                      </div>
                    )}
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
                <span style={{ color: "rgba(30,58,52,0.55)" }}>Calculated at checkout</span>
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
            {belowMinimum && (
              <div className="cart-summary__promo-note cart-summary__promo-note--error">
                Add {formatRupees(amountToMinimum)} more to reach the {formatRupees(MIN_ORDER_RUPEES)} minimum
                order value.
              </div>
            )}
            {!pricing && (
              <div className="cart-summary__promo-note cart-summary__promo-note--error">
                Remove any out-of-stock items above to continue.
              </div>
            )}
            <PromoCodeField subtotalRupees={subtotal} />
            <button
              type="button"
              className="cart-summary__checkout"
              onClick={handleCheckout}
              disabled={belowMinimum || !pricing}
            >
              Checkout · {formatRupees(grandTotal)}
            </button>
            <ul className="cart-summary__shipping-note cart-summary__shipping-note--list">
              <li>Minimum order value – ₹250</li>
              <li>Free shipping under 5km, ₹10 extra per km above 5km</li>
              <li>Free delivery for order values above ₹500</li>
            </ul>
          </aside>
        </div>
      </section>
    </>
  );
}
