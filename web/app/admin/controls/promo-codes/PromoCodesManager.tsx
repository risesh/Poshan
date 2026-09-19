"use client";

import { useState } from "react";
import type { AdminPromoCode } from "@/lib/admin-data";
import PromoCodeRow from "./PromoCodeRow";
import PromoCodeForm from "./PromoCodeForm";

type Slot = { mode: "closed" } | { mode: "create" } | { mode: "edit"; promo: AdminPromoCode };

// Owns the one shared "Add a promo code" / "Edit promo code" slot so a
// row's Edit click and the standalone Add button both resolve to the same
// place on the page, never two forms open at once — same pattern as
// ProductsManager.tsx. Deleting doesn't need this — it's a self-contained
// action inside each row.
export default function PromoCodesManager({
  promoCodes,
  products,
}: {
  promoCodes: AdminPromoCode[];
  products: { id: string; name: string }[];
}) {
  const [slot, setSlot] = useState<Slot>({ mode: "closed" });
  const closeSlot = () => setSlot({ mode: "closed" });

  return (
    <>
      <div className="admin-card admin-controls-card">
        <div className="admin-card__header">
          <span className="admin-card__title">Promo codes ({promoCodes.length})</span>
        </div>
        {promoCodes.length === 0 ? (
          <div className="admin-chart-empty">No promo codes yet.</div>
        ) : (
          <div className="admin-controls-table">
            <div className="admin-controls-table__head admin-controls-table__head--promo">
              <span>Promo ID</span>
              <span>Code</span>
              <span>Discount</span>
              <span>Scope</span>
              <span>Window</span>
              <span>Active</span>
            </div>
            {promoCodes.map((promo) => (
              <PromoCodeRow key={promo.id} promo={promo} onEdit={() => setSlot({ mode: "edit", promo })} />
            ))}
          </div>
        )}
      </div>

      <div className="admin-controls-divider" role="separator" />

      <div className="admin-card admin-controls-card">
        <div className="admin-card__header">
          <span className="admin-card__title">{slot.mode === "edit" ? `Edit ${slot.promo.code}` : "Add a promo code"}</span>
        </div>
        {slot.mode === "closed" && (
          <button type="button" className="admin-controls-add-btn" onClick={() => setSlot({ mode: "create" })}>
            + Create new promo code
          </button>
        )}
        {slot.mode === "create" && <PromoCodeForm promo={null} products={products} onDone={closeSlot} onCancel={closeSlot} />}
        {slot.mode === "edit" && (
          <PromoCodeForm promo={slot.promo} products={products} onDone={closeSlot} onCancel={closeSlot} />
        )}
      </div>
    </>
  );
}
