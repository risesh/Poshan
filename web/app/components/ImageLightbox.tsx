"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

type ImageLightboxProps = {
  images: string[];
  index: number;
  productName: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
};

// Portaled to document.body rather than rendered in place — .card has a
// hover `transition: transform`, and any ancestor with a transform creates
// a new containing block for position:fixed descendants, which would
// otherwise pin this to the card instead of the viewport.
export default function ImageLightbox({ images, index, productName, onIndexChange, onClose }: ImageLightboxProps) {
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") onIndexChange((index + 1) % images.length);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [index, images.length, onClose, onIndexChange]);

  const goTo = (i: number) => onIndexChange((i + images.length) % images.length);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX === null) return;
    const delta = e.changedTouches[0].clientX - startX;
    // Below this, treat it as a tap rather than a swipe.
    if (Math.abs(delta) < 40) return;
    goTo(index + (delta < 0 ? 1 : -1));
  };

  // React bubbles portal events through the *component* tree, not the DOM
  // tree — a click anywhere in here would otherwise reach the product
  // card's own onClick (navigate to the PDP) despite this being rendered
  // into document.body. Every handler below that can be the first to see a
  // click (the backdrop, the close button, and .image-lightbox__stage
  // itself) stops propagation, same reason the nav/dot buttons do.
  return createPortal(
    <div
      className="image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`${productName} photos`}
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <button
        type="button"
        className="image-lightbox__close"
        aria-label="Close"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        ×
      </button>
      <div
        className="image-lightbox__stage"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a viewer for
            arbitrary Supabase Storage URLs, not a build-time-known asset
            next/image could optimize */}
        <img className="image-lightbox__image" src={images[index]} alt={`${productName} photo ${index + 1} of ${images.length}`} />

        {images.length > 1 && (
          <>
            <button
              type="button"
              className="image-lightbox__nav image-lightbox__nav--prev"
              aria-label="Previous image"
              onClick={(e) => {
                e.stopPropagation();
                goTo(index - 1);
              }}
            >
              ‹
            </button>
            <button
              type="button"
              className="image-lightbox__nav image-lightbox__nav--next"
              aria-label="Next image"
              onClick={(e) => {
                e.stopPropagation();
                goTo(index + 1);
              }}
            >
              ›
            </button>
            <div className="image-lightbox__dots">
              {images.map((img, i) => (
                <button
                  key={img + i}
                  type="button"
                  className={`image-lightbox__dot${i === index ? " is-active" : ""}`}
                  aria-label={`Show image ${i + 1} of ${images.length}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    goTo(i);
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
