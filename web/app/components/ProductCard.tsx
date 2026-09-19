"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@/lib/products";
import ImageLightbox from "./ImageLightbox";

// Stops the click from bubbling up to the card's own onClick (which
// navigates to the product page) — these buttons need their click to stay
// local to the cart action, not also trigger a navigation underneath it.
function stopCardNavigation(e: React.MouseEvent) {
  e.stopPropagation();
}

function CardBody({ product }: { product: Product }) {
  const { cart, addItem, incrementItem, decrementItem } = useCart();
  // Cart lines are keyed by variant id, not product id — for products.id
  // === product_variants.id was true by coincidence in the old hardcoded
  // data (single-variant products), but that no longer holds now that
  // both are real, independent Supabase UUIDs. primaryVariantId (not
  // variants[0].id) so the card's Add button always acts on the same
  // in-stock variant its price/size are already showing.
  const defaultVariantId = product.primaryVariantId;
  const qty = cart[defaultVariantId] || 0;

  // Same "cycle through images with prev/next + swipe" behavior as the PDP
  // carousel (ProductHero.tsx) — product.images is never empty when
  // product.image is set (see lib/products.ts's comment on the field), so
  // this and the old single-image path render identically for a product
  // with only one image.
  const [imageIndex, setImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const hasImages = product.images.length > 0;
  const activeImage = product.images[imageIndex];
  const showNav = product.images.length > 1;
  const goToImage = (i: number) => setImageIndex((i + product.images.length) % product.images.length);

  const touchStartX = useRef<number | null>(null);
  const handleImageTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleImageTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX === null) return;
    const delta = e.changedTouches[0].clientX - startX;
    // Below this, treat it as a tap and let onClick (open the lightbox)
    // fire normally instead of hijacking it as a swipe.
    if (Math.abs(delta) < 40) return;
    e.preventDefault();
    goToImage(imageIndex + (delta < 0 ? 1 : -1));
  };

  const imageStyle = activeImage
    ? { backgroundImage: `url('${activeImage}')` }
    : undefined;
  const imageClass = product.gradient ? ` card__image--${product.gradient}` : "";

  return (
    <>
      <div className="card__image-wrap">
        {hasImages ? (
          // A real photo opens the fullscreen carousel on click — the card
          // still gets you to the PDP via the title link or the rest of
          // the card body (see ProductCard's own onClick below).
          <div
            className="card__image-link"
            onClick={(e) => {
              stopCardNavigation(e);
              setLightboxOpen(true);
            }}
            onTouchStart={showNav ? handleImageTouchStart : undefined}
            onTouchEnd={showNav ? handleImageTouchEnd : undefined}
          >
            <div className={`card__image${imageClass}`} style={imageStyle}>
              <span className={`card__pill card__pill--${product.badgeStyle ?? "light"}`}>
                {product.badge}
              </span>
            </div>
          </div>
        ) : (
          // No photo yet (gradient placeholder) — nothing for a lightbox
          // to show, so the image area keeps its old job of linking to the
          // PDP instead.
          <Link href={`/products/${product.slug}`} className="card__image-link" onClick={stopCardNavigation}>
            <div className={`card__image${imageClass}`}>
              <span className={`card__pill card__pill--${product.badgeStyle ?? "light"}`}>
                {product.badge}
              </span>
              <span className="card__image-title">{product.name}</span>
            </div>
          </Link>
        )}
        {showNav && (
          <>
            <button
              type="button"
              className="card__image-nav card__image-nav--prev"
              aria-label="Previous image"
              onClick={(e) => {
                stopCardNavigation(e);
                goToImage(imageIndex - 1);
              }}
            >
              ‹
            </button>
            <button
              type="button"
              className="card__image-nav card__image-nav--next"
              aria-label="Next image"
              onClick={(e) => {
                stopCardNavigation(e);
                goToImage(imageIndex + 1);
              }}
            >
              ›
            </button>
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
      <div className="card__body">
        <div className="card__category">{product.category}</div>
        <h3 className="card__name">
          <Link href={`/products/${product.slug}`} className="card__name-link" onClick={stopCardNavigation}>
            {product.name}
          </Link>
        </h3>
        <p className="card__desc">{product.desc}</p>
        <div className="card__attrs">
          {product.attrs.map((attr) => (
            <span className="card__attr" key={attr}>
              {attr}
            </span>
          ))}
        </div>
        <div className="card__footer">
          <span className="card__price">₹{product.price}</span>
          <span className="card__size">{product.size}</span>
          {product.inStock ? (
            qty > 0 ? (
              <div className="card__qty" onClick={stopCardNavigation}>
                <button
                  className="card__qty-btn"
                  aria-label="Decrease quantity"
                  onClick={() => decrementItem(defaultVariantId)}
                >
                  −
                </button>
                <span className="card__qty-count">{qty}</span>
                <button
                  className="card__qty-btn"
                  aria-label="Increase quantity"
                  onClick={() => incrementItem(defaultVariantId)}
                >
                  +
                </button>
              </div>
            ) : (
              <button
                className="card__add"
                onClick={(e) => {
                  stopCardNavigation(e);
                  addItem(defaultVariantId);
                }}
              >
                Add
              </button>
            )
          ) : (
            <button className="card__add" disabled aria-disabled="true" onClick={stopCardNavigation}>
              Add
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// Structure has to match the original exactly, not just visually: in-stock
// cards put the .card class directly on the <article> (it's a CSS Grid
// direct child, which is what gets sized/positioned by .products__grid),
// while the out-of-stock variant wraps an inner .card in an
// .card--out-of-stock article for the overlay badge. A shared wrapper
// element around .card in both cases would break the grid sizing.
export default function ProductCard({ product }: { product: Product }) {
  const categories = product.tabCategories.join(" ");
  const router = useRouter();
  // Whole card navigates on click (except the cart controls, which stop
  // propagation above) — the image/title keep their own real <Link> too,
  // for right-click/middle-click/keyboard access.
  const goToProduct = () => router.push(`/products/${product.slug}`);

  if (!product.inStock) {
    return (
      <article className="card--out-of-stock" data-categories={categories}>
        <div className="card" onClick={goToProduct}>
          <CardBody product={product} />
        </div>
        <div className="card--out-of-stock__overlay">
          <span className="card--out-of-stock__badge">Out of stock</span>
        </div>
      </article>
    );
  }

  return (
    <article
      className="card"
      data-categories={categories}
      data-product-id={product.id}
      onClick={goToProduct}>
      <CardBody product={product} />
    </article>
  );
}
