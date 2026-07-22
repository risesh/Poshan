"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminPromoCode } from "@/lib/admin-data";
import PromoCodeFields, { type PromoCodeFormValue } from "./PromoCodeFields";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function formatDiscount(promo: AdminPromoCode): string {
  const discount = promo.discount_type === "percent" ? `${promo.discount_value}% off` : `₹${promo.discount_value} off`;
  return promo.min_order_rupees > 0 ? `${discount} · min ₹${promo.min_order_rupees}` : discount;
}

function windowLabel(promo: AdminPromoCode): string {
  const now = new Date();
  const starts = promo.starts_at ? new Date(promo.starts_at) : null;
  const expires = promo.expires_at ? new Date(promo.expires_at) : null;

  if (starts && starts > now) return `Starts ${DATE_FMT.format(starts)}`;
  if (expires && expires < now) return `Expired ${DATE_FMT.format(expires)}`;
  if (!starts && !expires) return "Indefinite";
  if (expires) return `Until ${DATE_FMT.format(expires)}`;
  return "Active now";
}

// <input type="date"> wants YYYY-MM-DD. The create form round-trips a date
// through new Date(startsAt).toISOString(), i.e. midnight UTC on that
// calendar date — slicing the ISO string back to its date component here
// (rather than formatting in local time) undoes that symmetrically instead
// of drifting a day depending on the admin's timezone.
function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function formToValue(promo: AdminPromoCode): PromoCodeFormValue {
  return {
    code: promo.code,
    discountType: promo.discount_type,
    discountValue: String(promo.discount_value),
    minOrderRupees: String(promo.min_order_rupees),
    startsAt: toDateInputValue(promo.starts_at),
    expiresAt: toDateInputValue(promo.expires_at),
    scopeMode: promo.scopedProducts.length > 0 ? "specific" : "all",
    selectedProductIds: promo.scopedProducts.map((p) => p.id),
  };
}

export default function PromoCodeRow({
  promo,
  products,
}: {
  promo: AdminPromoCode;
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [active, setActive] = useState(promo.active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<PromoCodeFormValue>(() => formToValue(promo));
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const patchForm = (patch: Partial<PromoCodeFormValue>) => setForm((current) => ({ ...current, ...patch }));

  const openEdit = () => {
    setForm(formToValue(promo));
    setEditError(null);
    setIsEditing(true);
  };

  const onToggle = async (next: boolean) => {
    const previous = active;
    setActive(next);
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/promo-codes/${promo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: next }),
    });
    setSaving(false);
    if (!res.ok) {
      setActive(previous);
      setError("Could not save.");
    }
  };

  const onDelete = async () => {
    if (!window.confirm(`Delete promo code ${promo.code}? This can't be undone.`)) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/admin/promo-codes/${promo.id}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      setError("Could not delete.");
      return;
    }
    // Optimistic — hide the row immediately rather than waiting on the
    // server-refetched list from router.refresh() to drop it.
    setDeleted(true);
    router.refresh();
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (!form.code.trim()) {
      setEditError("Code is required.");
      return;
    }
    if (!(Number(form.discountValue) > 0)) {
      setEditError("Discount value must be greater than 0.");
      return;
    }
    if (form.scopeMode === "specific" && form.selectedProductIds.length === 0) {
      setEditError("Select at least one product, or switch back to All products.");
      return;
    }

    setEditSubmitting(true);
    const res = await fetch(`/api/admin/promo-codes/${promo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minOrderRupees: Number(form.minOrderRupees) || 0,
        startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        productIds: form.scopeMode === "specific" ? form.selectedProductIds : [],
      }),
    });
    const json = await res.json();
    setEditSubmitting(false);
    if (!res.ok) {
      setEditError(json.error ?? "Could not save changes.");
      return;
    }
    setIsEditing(false);
    router.refresh();
  };

  if (deleted) return null;

  if (isEditing) {
    return (
      <form className="admin-controls-form admin-controls-promo-edit" onSubmit={handleEditSubmit}>
        <PromoCodeFields value={form} onChange={patchForm} products={products} />

        {editError && <div className="admin-status-select__error admin-controls-form__error">{editError}</div>}

        <div className="admin-controls-form__row">
          <button type="submit" className="admin-filter-bar__apply" disabled={editSubmitting}>
            {editSubmitting ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            className="admin-controls-cancel-btn"
            onClick={() => setIsEditing(false)}
            disabled={editSubmitting}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="admin-controls-table__row admin-controls-table__row--promo">
      <span className="admin-controls-promo-code">{promo.code}</span>
      <span>{formatDiscount(promo)}</span>
      <span className="admin-order-card__muted">
        {promo.scopedProducts.length === 0
          ? "All products"
          : promo.scopedProducts.map((p) => p.name).join(", ")}
      </span>
      <span className="admin-order-card__muted">{windowLabel(promo)}</span>
      <div className="admin-controls-promo-row__actions">
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-label={`Toggle ${promo.code} active`}
          className={`admin-toggle${active ? " is-on" : ""}`}
          disabled={saving || deleting}
          onClick={() => onToggle(!active)}
        >
          <span className="admin-toggle__knob" />
        </button>
        <button type="button" className="admin-controls-edit-btn" onClick={openEdit} disabled={deleting}>
          Edit
        </button>
        <button
          type="button"
          className="admin-controls-remove-btn"
          aria-label={`Delete promo code ${promo.code}`}
          disabled={deleting}
          onClick={onDelete}
        >
          ×
        </button>
        {error && <div className="admin-status-select__error">{error}</div>}
      </div>
    </div>
  );
}
