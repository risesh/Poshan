"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@/lib/products";

function CardBody({ product }: { product: Product }) {
  const { cart, addItem, incrementItem, decrementItem } = useCart();
  const qty = cart[product.id] || 0;

  const imageStyle = product.image
    ? { backgroundImage: `url('${product.image}')` }
    : undefined;
  const imageClass = product.gradient ? ` card__image--${product.gradient}` : "";

  return (
    <>
      <Link href={`/products/${product.slug}`} className="card__image-link">
        <div className={`card__image${imageClass}`} style={imageStyle}>
          <span className={`card__pill card__pill--${product.badgeStyle ?? "light"}`}>
            {product.badge}
          </span>
          {!product.image && (
            <span className="card__image-title">{product.name}</span>
          )}
        </div>
      </Link>
      <div className="card__body">
        <div className="card__category">{product.category}</div>
        <h3 className="card__name">
          <Link href={`/products/${product.slug}`} className="card__name-link">
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
              <div className="card__qty">
                <button
                  className="card__qty-btn"
                  aria-label="Decrease quantity"
                  onClick={() => decrementItem(product.id)}
                >
                  −
                </button>
                <span className="card__qty-count">{qty}</span>
                <button
                  className="card__qty-btn"
                  aria-label="Increase quantity"
                  onClick={() => incrementItem(product.id)}
                >
                  +
                </button>
              </div>
            ) : (
              <button className="card__add" onClick={() => addItem(product.id)}>
                Add
              </button>
            )
          ) : (
            <button className="card__add" disabled aria-disabled="true">
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

  if (!product.inStock) {
    return (
      <article className="card--out-of-stock" data-categories={categories}>
        <div className="card">
          <CardBody product={product} />
        </div>
        <div className="card--out-of-stock__overlay">
          <span className="card--out-of-stock__badge">Out of stock</span>
        </div>
      </article>
    );
  }

  return (
    <article className="card" data-categories={categories} data-product-id={product.id}>
      <CardBody product={product} />
    </article>
  );
}
