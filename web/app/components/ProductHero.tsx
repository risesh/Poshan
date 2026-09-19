"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/lib/cart-context";
import type { Product, Variant } from "@/lib/products";
import ImageLightbox from "./ImageLightbox";

// size_label is free text ("500 ml" | "1 L" | "250 g" | "1 kg" — see
// supabase/migrations/0001_init.sql) with no separate numeric column, so
// comparing variants on a per-unit basis means parsing it. Unrecognized
// formats return null rather than guessing, and get excluded from the
// savings comparison below instead of showing a wrong percentage.
function parseSizeToBaseUnit(sizeLabel: string): { value: number; unit: "ml" | "g" } | null {
  const match = sizeLabel.trim().match(/^([\d.]+)\s*(ml|l|g|kg)$/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === "l") return { value: value * 1000, unit: "ml" };
  if (unit === "kg") return { value: value * 1000, unit: "g" };
  return { value, unit: unit as "ml" | "g" };
}

// % cheaper per unit than the product's lowest-priced variant — e.g. a
// 500 ml jar at ₹250 (₹0.50/ml) vs. a 1 L jar at ₹450 (₹0.45/ml) is 10%
// cheaper per ml. Only computed against that one baseline (not every
// pair), and only when both sizes parse into the same base unit; a
// variant that isn't actually cheaper per unit gets no tag rather than a
// negative one.
function perUnitSavingsPercent(variant: Variant, baseline: Variant): number | null {
  if (variant.id === baseline.id) return null;
  const variantSize = parseSizeToBaseUnit(variant.size);
  const baselineSize = parseSizeToBaseUnit(baseline.size);
  if (!variantSize || !baselineSize || variantSize.unit !== baselineSize.unit) return null;
  const baselineRate = baseline.priceRupees / baselineSize.value;
  const variantRate = variant.priceRupees / variantSize.value;
  if (variantRate >= baselineRate) return null;
  const percent = Math.round(((baselineRate - variantRate) / baselineRate) * 100);
  return percent > 0 ? percent : null;
}

export default function ProductHero({ product }: { product: Product }) {
  // Defaults to the same variant the product card already committed to
  // (primaryVariantId — an in-stock one when any exists), so landing on
  // the detail page doesn't greet you with "Out of stock" just because
  // the first-listed size happens to be the disabled one.
  const [selected, setSelected] = useState(
    () => product.variants.find((v) => v.id === product.primaryVariantId) ?? product.variants[0]
  );
  const { cart, addItem, incrementItem, decrementItem } = useCart();
  const qty = cart[selected.id] || 0;

  // The "lowest variant" per-unit rate every other size's tag is measured
  // against — the one with the lowest absolute price, per the product's
  // own listed order rather than assumed to be the smallest size.
  const lowestPriceVariant = useMemo(
    () => product.variants.reduce((min, v) => (v.priceRupees < min.priceRupees ? v : min), product.variants[0]),
    [product.variants]
  );

  // Independent of `selected` (the variant) — images are per-product, not
  // per-size, so switching sizes never touches this.
  const [imageIndex, setImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const activeImage = product.images[imageIndex];

  const imageStyle = activeImage
    ? {
        backgroundImage: `linear-gradient(to bottom, rgba(30,58,52,0.45) 0%, rgba(30,58,52,0) 20%, rgba(30,58,52,0) 62%, rgba(30,58,52,0.55) 100%), url('${activeImage}')`,
      }
    : undefined;
  const imageClass = activeImage
    ? " product-hero__image--photo"
    : product.gradient
      ? ` product-hero__image--${product.gradient}`
      : "";

  return (
    <section className="product-hero">
      <div className="product-hero__grid">
        <div
          className={`product-hero__image${imageClass}`}
          style={imageStyle}
          onClick={() => product.images.length > 0 && setLightboxOpen(true)}
        >
          <div className="product-hero__image-top">
            <span className={`card__pill card__pill--${product.badgeStyle ?? "light"}`}>
              {product.badge}
            </span>
          </div>
          <div>
            <div className="product-hero__image-category">{product.category}</div>
            <div className="product-hero__image-name">{product.name}</div>
          </div>

          {product.images.length > 1 && (
            <>
              <button
                type="button"
                className="product-hero__image-nav product-hero__image-nav--prev"
                aria-label="Previous image"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageIndex((i) => (i - 1 + product.images.length) % product.images.length);
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="product-hero__image-nav product-hero__image-nav--next"
                aria-label="Next image"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageIndex((i) => (i + 1) % product.images.length);
                }}
              >
                ›
              </button>
              <div className="product-hero__image-dots">
                {product.images.map((img, i) => (
                  <button
                    key={img + i}
                    type="button"
                    className={`product-hero__image-dot${i === imageIndex ? " is-active" : ""}`}
                    aria-label={`Show image ${i + 1} of ${product.images.length}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageIndex(i);
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {lightboxOpen && (
          <ImageLightbox
            images={product.images}
            index={imageIndex}
            productName={product.name}
            onIndexChange={setImageIndex}
            onClose={() => setLightboxOpen(false)}
          />
        )}

        <div className="product-info">
          <div className="product-info__pills">
            <span className="product-info__category-pill">{product.category}</span>
          </div>
          <h1 className="product-info__title">{product.name}</h1>
          <p className="product-info__desc">{product.description}</p>
          <ul className="product-info__desc-list">
            {product.descriptionBullets.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
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
                {product.variants.map((variant) => {
                  const savingsPercent = perUnitSavingsPercent(variant, lowestPriceVariant);
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      className={`product-info__size-btn${variant.id === selected.id ? " is-active" : ""}${!variant.isInStock ? " product-info__size-btn--disabled" : ""}`}
                      aria-disabled={!variant.isInStock}
                      onClick={() => setSelected(variant)}
                    >
                      {savingsPercent !== null && (
                        <span className="product-info__size-btn__discount">{savingsPercent}% off</span>
                      )}
                      {variant.size}
                      {!variant.isInStock && <span className="product-info__size-btn__note">Out of stock</span>}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="product-info__price-row">
              <span className="product-info__price">₹{selected.priceRupees}</span>
              <span className="product-info__unit">{selected.unitLabel}</span>
            </div>
            <div className="product-info__cart-row">
              {selected.isInStock ? (
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
            <ul className="product-info__usage-list">
              {product.usageBullets.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
