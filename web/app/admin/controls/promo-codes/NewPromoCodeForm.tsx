"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PromoCodeFields, { emptyPromoCodeForm, type PromoCodeFormValue } from "./PromoCodeFields";

export default function NewPromoCodeForm({ products }: { products: { id: string; name: string }[] }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<PromoCodeFormValue>(emptyPromoCodeForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patchForm = (patch: Partial<PromoCodeFormValue>) => setForm((current) => ({ ...current, ...patch }));

  const close = () => {
    setForm(emptyPromoCodeForm());
    setError(null);
    setIsOpen(false);
  };

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
    const res = await fetch("/api/admin/promo-codes", {
      method: "POST",
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
      setError(json.error ?? "Could not create promo code.");
      return;
    }
    close();
    router.refresh();
  };

  if (!isOpen) {
    return (
      <button type="button" className="admin-controls-add-btn" onClick={() => setIsOpen(true)}>
        + Create new promo code
      </button>
    );
  }

  return (
    <form className="admin-controls-form" onSubmit={handleSubmit}>
      <PromoCodeFields value={form} onChange={patchForm} products={products} />

      {error && <div className="admin-status-select__error admin-controls-form__error">{error}</div>}

      <div className="admin-controls-form__row">
        <button type="submit" className="admin-filter-bar__apply" disabled={submitting}>
          {submitting ? "Creating…" : "Create promo code"}
        </button>
        <button type="button" className="admin-controls-cancel-btn" onClick={close} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
