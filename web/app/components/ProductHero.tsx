"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@/lib/products";

export default function ProductHero({ product }: { product: Product }) {
  const [selected, setSelected] = useState(product.variants[0]);
  const { cart, addItem, incrementItem, decrementItem } = useCart();
  const qty = cart[selected.id] || 0;

  const imageStyle = product.image
    ? {
        backgroundImage: `linear-gradient(to bottom, rgba(30,58,52,0.45) 0%, rgba(30,58,52,0) 20%, rgba(30,58,52,0) 62%, rgba(30,58,52,0.55) 100%), url('${product.image}')`,
      }
    : undefined;
  const imageClass = product.image
    ? " product-hero__image--photo"
    : product.gradient
      ? ` product-hero__image--${product.gradient}`
      : "";

  return (
    <section className="product-hero">
      <div className="product-hero__grid">
        <div className={`product-hero__image${imageClass}`} style={imageStyle}>
          <div className="product-hero__image-top">
            <span className={`card__pill card__pill--${product.badgeStyle ?? "light"}`}>
              {product.badge}
            </span>
          </div>
          <div>
            <div className="product-hero__image-category">{product.category}</div>
            <div className="product-hero__image-name">{product.name}</div>
          </div>
        </div>

        <div className="product-info">
          <div className="product-info__pills">
            <span className="product-info__category-pill">{product.category}</span>
          </div>
          <h1 className="product-info__title">{product.name}</h1>
          <p className="product-info__desc">
            {product.descriptionLines.map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {line}
              </span>
            ))}
          </p>
          <div className="product-info__attrs">
            {product.detailAttrs.map((attr) => (
              <span className="card__attr" key={attr}>
                {attr}
              </span>
            ))}
          </div>

          <div className="product-info__size-block">
            <div className="product-info__size-label">Size</div>
            {product.variants.length > 1 && (
              <div className="product-info__size-options">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    className={`product-info__size-btn${variant.id === selected.id ? " is-active" : ""}`}
                    onClick={() => setSelected(variant)}
                  >
                    {variant.size}
                  </button>
                ))}
              </div>
            )}
            <div className="product-info__price-row">
              <span className="product-info__price">₹{selected.priceRupees}</span>
              <span className="product-info__unit">{selected.unitLabel}</span>
            </div>
            <div className="product-info__cart-row">
              {product.inStock ? (
                qty > 0 ? (
                  <div className="card__qty card__qty--lg">
                    <button
                      className="card__qty-btn"
                      aria-label="Decrease quantity"
                      onClick={() => decrementItem(selected.id)}
                    >
                      −
                    </button>
                    <span className="card__qty-count">{qty}</span>
                    <button
                      className="card__qty-btn"
                      aria-label="Increase quantity"
                      onClick={() => incrementItem(selected.id)}
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    className="card__add card__add--block"
                    onClick={() => addItem(selected.id)}
                  >
                    Add to cart · ₹{selected.priceRupees}
                  </button>
                )
              ) : (
                <button className="card__add card__add--block" disabled aria-disabled="true">
                  Out of stock
                </button>
              )}
            </div>
          </div>

          <div className="product-info__usage">
            <div className="product-info__usage-label">Usage details</div>
            <p className="product-info__usage-text">
              {product.usageLines.map((line, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
