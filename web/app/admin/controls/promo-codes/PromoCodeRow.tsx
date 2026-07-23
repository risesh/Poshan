"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminPromoCode } from "@/lib/admin-data";

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

export default function PromoCodeRow({
  promo,
  onEdit,
}: {
  promo: AdminPromoCode;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [active, setActive] = useState(promo.active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

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

  if (deleted) return null;

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
      <div className="admin-controls-row__actions">
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
        <button type="button" className="admin-controls-edit-btn" onClick={onEdit} disabled={deleting}>
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
