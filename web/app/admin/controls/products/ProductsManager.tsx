"use client";

import { useMemo, useState } from "react";
import type { AdminProduct } from "@/lib/admin-data";
import { createClient } from "@/lib/supabase/client";
import ProductRow from "./ProductRow";
import ProductForm from "./ProductForm";

type Slot = { mode: "closed" } | { mode: "create" } | { mode: "edit"; product: AdminProduct };

// Owns the one shared "Add a product" / "Edit product" slot so a row's
// Edit click and the standalone Add button both resolve to the same
// place on the page, never two forms open at once. Deleting doesn't need
// this — it's a self-contained action inside each row.
export default function ProductsManager({ products: initialProducts }: { products: AdminProduct[] }) {
  const supabase = useMemo(() => createClient(), []);
  // Local, reorderable copy of the server-fetched list — same pattern as
  // ProductImagesField's own `images` state, and for the same reason: a
  // reorder is a local array-position swap first, persisted after, not
  // something worth a full server round-trip just to re-render in the new
  // order.
  const [products, setProducts] = useState<AdminProduct[]>(initialProducts);
  const [slot, setSlot] = useState<Slot>({ mode: "closed" });
  const [orderError, setOrderError] = useState<string | null>(null);
  const closeSlot = () => setSlot({ mode: "closed" });

  // Adjacent-swap reorder, identical in shape to ProductImagesField's
  // move() — only the two swapped rows' sort_order actually changes, so
  // only those two get written back. RLS already allows this (0006's
  // "Admins can update products" policy already covers arbitrary column
  // updates, sort_order included), so no new policy was needed for 0016.
  const moveProduct = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= products.length) return;

    const a = products[index];
    const b = products[targetIndex];
    const reordered = [...products];
    reordered[index] = { ...b, sortOrder: a.sortOrder };
    reordered[targetIndex] = { ...a, sortOrder: b.sortOrder };
    setProducts(reordered);
    setOrderError(null);

    const [{ error: err1 }, { error: err2 }] = await Promise.all([
      supabase.from("products").update({ sort_order: b.sortOrder }).eq("id", a.id),
      supabase.from("products").update({ sort_order: a.sortOrder }).eq("id", b.id),
    ]);
    if (err1 || err2) {
      setOrderError("Could not save the new order. Please refresh and try again.");
    }
  };

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
              <span>Listed</span>
              <span></span>
              <span></span>
            </div>
            {products.map((product, i) => (
              <ProductRow
                key={product.id}
                product={product}
                onEdit={() => setSlot({ mode: "edit", product })}
                onMoveUp={() => moveProduct(i, -1)}
                onMoveDown={() => moveProduct(i, 1)}
                isFirst={i === 0}
                isLast={i === products.length - 1}
              />
            ))}
          </div>
        )}
        {orderError && <div className="admin-status-select__error">{orderError}</div>}
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
