"use client";

import { useState } from "react";
import type { AdminProduct } from "@/lib/admin-data";
import ProductRow from "./ProductRow";
import ProductForm from "./ProductForm";

type Slot = { mode: "closed" } | { mode: "create" } | { mode: "edit"; product: AdminProduct };

// Owns the one shared "Add a product" / "Edit product" slot so a row's
// Edit click and the standalone Add button both resolve to the same
// place on the page, never two forms open at once. Deleting doesn't need
// this — it's a self-contained action inside each row.
export default function ProductsManager({ products }: { products: AdminProduct[] }) {
  const [slot, setSlot] = useState<Slot>({ mode: "closed" });
  const closeSlot = () => setSlot({ mode: "closed" });

  return (
    <>
      <div className="admin-card admin-controls-card">
        <div className="admin-card__header">
          <span className="admin-card__title">Products ({products.length})</span>
        </div>
        {products.length === 0 ? (
          <div className="admin-chart-empty">No products yet.</div>
        ) : (
          <div className="admin-controls-table">
            <div className="admin-controls-table__head">
              <span>Product</span>
              <span>Category</span>
              <span>Enabled</span>
              <span></span>
              <span></span>
            </div>
            {products.map((product) => (
              <ProductRow key={product.id} product={product} onEdit={() => setSlot({ mode: "edit", product })} />
            ))}
          </div>
        )}
      </div>

      <div className="admin-controls-divider" role="separator" />

      <div className="admin-card admin-controls-card">
        <div className="admin-card__header">
          <span className="admin-card__title">{slot.mode === "edit" ? `Edit ${slot.product.name}` : "Add a product"}</span>
        </div>
        {slot.mode === "closed" && (
          <button type="button" className="admin-controls-add-btn" onClick={() => setSlot({ mode: "create" })}>
            + Add a product
          </button>
        )}
        {slot.mode === "create" && <ProductForm product={null} onDone={closeSlot} onCancel={closeSlot} />}
        {slot.mode === "edit" && <ProductForm product={slot.product} onDone={closeSlot} onCancel={closeSlot} />}
      </div>
    </>
  );
}
