"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminPromoCode } from "@/lib/admin-data";
import PromoCodeFields, { emptyPromoCodeForm, promoToFormValue, type PromoCodeFormValue } from "./PromoCodeFields";

// Rendered both above and below the field list — repeated at the top so
// Cancel and Save/Create are reachable without scrolling through the whole
// form first, not just as a final action after filling it in.
function FormActions({
  isEditing,
  submitting,
  onCancel,
  error,
}: {
  isEditing: boolean;
  submitting: boolean;
  onCancel: () => void;
  error: string | null;
}) {
  return (
    <>
      <div className="admin-controls-form__row">
        <button type="submit" className="admin-filter-bar__apply" disabled={submitting}>
          {submitting ? (isEditing ? "Saving…" : "Creating…") : isEditing ? "Save changes" : "Create promo code"}
        </button>
        <button type="button" className="admin-controls-cancel-btn" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
      {error && <div className="admin-status-select__error admin-controls-form__error">{error}</div>}
    </>
  );
}

// Shared by both "Add a promo code" and "Edit promo code" — which one this
// is comes down to whether `promo` is null, everything else (fields,
// validation) is identical. Both render in the same page slot (see
// PromoCodesManager.tsx), never at the same time.
export default function PromoCodeForm({
  promo,
  products,
  onDone,
  onCancel,
}: {
  promo: AdminPromoCode | null;
  products: { id: string; name: string }[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const isEditing = promo !== null;

  const [form, setForm] = useState<PromoCodeFormValue>(() => (promo ? promoToFormValue(promo) : emptyPromoCodeForm()));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchForm = (patch: Partial<PromoCodeFormValue>) => setForm((current) => ({ ...current, ...patch }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.code.trim()) {
      setError("Code is required.");
      return;
    }
    if (!(Number(form.discountValue) > 0)) {
      setError("Discount value must be greater than 0.");
      return;
    }
    if (form.scopeMode === "specific" && form.selectedProductIds.length === 0) {
      setError("Select at least one product, or switch back to All products.");
      return;
    }

    setSubmitting(true);
    const res = await fetch(isEditing ? `/api/admin/promo-codes/${promo.id}` : "/api/admin/promo-codes", {
      method: isEditing ? "PATCH" : "POST",
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
    setSubmitting(false);
    if (!res.ok) {
      setError(json.error ?? `Could not ${isEditing ? "save changes" : "create promo code"}.`);
      return;
    }
    router.refresh();
    onDone();
  };

  return (
    <form className="admin-controls-form" onSubmit={handleSubmit}>
      <FormActions isEditing={isEditing} submitting={submitting} onCancel={onCancel} error={error} />

      <PromoCodeFields value={form} onChange={patchForm} products={products} />

      <FormActions isEditing={isEditing} submitting={submitting} onCancel={onCancel} error={error} />
    </form>
  );
}
