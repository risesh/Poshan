"use client";

import { useState } from "react";
import type { Product } from "@/lib/products";
import ProductCard from "./ProductCard";

const TABS = [
  { label: "All", value: "all" },
  { label: "Best sellers", value: "best-sellers" },
  { label: "Seasonal", value: "seasonal" },
  { label: "Probiotics", value: "probiotics" },
  { label: "Energy", value: "energy" },
];

export default function ProductsSection({ products }: { products: Product[] }) {
  const [activeTab, setActiveTab] = useState("all");

  const visible = products.filter(
    (p) => activeTab === "all" || p.tabCategories.includes(activeTab)
  );

  return (
    <section className="products" id="products">
      <div className="products__label-row">
        <div className="products__label">Our products</div>
      </div>

      <div className="products__tabs" role="tablist" aria-label="Product categories">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            className={`products__tab${activeTab === tab.value ? " is-active" : ""}`}
            role="tab"
            aria-selected={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="products__grid">
        {visible.map((product) => (
          <ProductCard product={product} key={product.id} />
        ))}
      </div>
    </section>
  );
}
