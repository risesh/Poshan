"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { getVariantById } from "@/lib/products";

const formatRupees = (n: number) => "₹" + n.toLocaleString("en-IN");

export default function CartPageBody() {
  const { cart, total, incrementItem, decrementItem, removeItem } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  // Deliberately not persisted — resets on reload, matches the old
  // main.js behavior ("no logic, just a promo code applied").
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoInput, setPromoInput] = useState("");

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
  const discount = promoApplied ? 40 : 0;
  const grandTotal = subtotal + shipping - discount;

  const applyPromo = () => {
    if (promoApplied || !promoInput.trim()) return;
    setPromoApplied(true);
  };

  const removePromo = () => {
    setPromoApplied(false);
    setPromoInput("");
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
              {promoApplied && (
                <div className="cart-summary__row cart-summary__row--discount">
                  <span>Promo</span>
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
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                disabled={promoApplied}
              />
              <button
                type="button"
                className={`cart-summary__promo-btn${promoApplied ? " cart-summary__promo-btn--remove" : ""}`}
                onClick={promoApplied ? removePromo : applyPromo}
              >
                {promoApplied ? "Remove" : "Apply"}
              </button>
            </div>
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
