"use client";

import { useEffect, useRef, useState } from "react";

// The real product page (app/products/[slug]/page.tsx) renders ProductHero/
// ProductPanel at full page width — their grid columns, image aspect ratio,
// and spacing are all tuned for that width. Rendering the same components
// inside a narrow sidebar (capping their width instead) squashes that grid
// into a cramped, differently-proportioned layout that doesn't match what
// the real page looks like. Instead, render them at the real page's
// reference width and scale the whole thing down uniformly, like a device
// preview, so every proportion matches exactly. 1280 mirrors this site's
// own --page-max-width token (app/site.css) — the widest a real page's
// content column ever gets.
const REFERENCE_WIDTH = 1280;

export default function ScaledPreview({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    // Two separate observers: outer width sets the scale, inner (unscaled)
    // height sets how tall the outer frame needs to be. Driving the outer
    // frame's height from the measured content height — rather than leaving
    // it to shrink-wrap the scaled-down box — is what avoids the blank gap
    // a naive transform: scale leaves behind (the outer box's own layout
    // size is untouched by a transform on its child).
    const widthObserver = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / REFERENCE_WIDTH);
    });
    const heightObserver = new ResizeObserver(([entry]) => {
      setContentHeight(entry.contentRect.height);
    });
    widthObserver.observe(outer);
    heightObserver.observe(inner);
    return () => {
      widthObserver.disconnect();
      heightObserver.disconnect();
    };
  }, []);

  return (
    <div
      ref={outerRef}
      className="admin-controls-preview"
      style={{ height: scale ? contentHeight * scale : undefined }}
    >
      <div
        ref={innerRef}
        className="admin-controls-preview__canvas"
        style={{ width: REFERENCE_WIDTH, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
