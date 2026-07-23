"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminProduct, AdminProductVariant } from "@/lib/admin-data";

const formatRupees = (n: number) => "₹" + n.toLocaleString("en-IN");

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`admin-toggle${checked ? " is-on" : ""}`}
      disabled={disabled}
      onClick={(e) => {
        // Stops the click from also triggering ProductRow's row-wide
        // expand/collapse handler, since this button now lives inside
        // that clickable row rather than being a separate target.
        e.stopPropagation();
        onChange(!checked);
      }}
    >
      <span className="admin-toggle__knob" />
    </button>
  );
}

type VariantState = { isInStock: boolean; stockQuantity: number; saving: boolean; error: string | null };

function VariantRow({
  variant,
  state,
  onToggle,
  onQuantityCommit,
}: {
  variant: AdminProductVariant;
  state: VariantState;
  onToggle: (next: boolean) => void;
  onQuantityCommit: (next: number) => void;
}) {
  // Only the in-progress typed text is local — the committed value (used
  // for saving and for the parent's stock summary) lives in the parent,
  // so it survives this row unmounting when its product is collapsed.
  const [inputValue, setInputValue] = useState(String(state.stockQuantity));

  return (
    <div className="admin-controls-variant-row">
      <span className="admin-controls-variant-row__size">{variant.sizeLabel}</span>
      <span className="admin-controls-variant-row__sku">{variant.sku}</span>
      <span className="admin-controls-variant-row__price">{formatRupees(variant.priceRupees)}</span>
      <label className="admin-controls-variant-row__qty">
        <span>Stock</span>
        <input
          type="number"
          min={0}
          className="admin-filter-bar__input admin-controls-qty-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={() => {
            const parsed = Math.max(0, Math.round(Number(inputValue) || 0));
            setInputValue(String(parsed));
            if (parsed !== state.stockQuantity) onQuantityCommit(parsed);
          }}
          disabled={state.saving}
        />
      </label>
      <Toggle
        checked={state.isInStock}
        disabled={state.saving}
        onChange={onToggle}
        label={`Toggle ${variant.sizeLabel} availability`}
      />
      {state.error && <span className="admin-status-select__error">{state.error}</span>}
    </div>
  );
}

export default function ProductRow({ product, onEdit }: { product: AdminProduct; onEdit: () => void }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [isInStock, setIsInStock] = useState(product.isInStock);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  // Lives here, not inside VariantRow, so it (a) survives the row
  // unmounting on collapse/expand — previously each toggle silently
  // reverted to the original page-load value once you collapsed and
  // re-expanded, even though the save had actually gone through — and
  // (b) can drive the "N of M sizes in stock" summary below without
  // reaching into child component state.
  const [variantStates, setVariantStates] = useState<Record<string, VariantState>>(() =>
    Object.fromEntries(
      product.variants.map((v) => [v.id, { isInStock: v.isInStock, stockQuantity: v.stockQuantity, saving: false, error: null }])
    )
  );

  const purchasableCount = product.variants.filter((v) => {
    const s = variantStates[v.id];
    return s.isInStock && s.stockQuantity > 0;
  }).length;
  // The exact confusing state that prompted this: the product-level
  // switch is on (still "carried"), but every size is either toggled off
  // or at 0 stock, so nothing about it is actually purchasable — the
  // storefront will show it as out of stock regardless of this toggle.
  const noneAvailableDespiteEnabled = isInStock && purchasableCount === 0;

  const patchVariant = async (variantId: string, body: { isInStock?: boolean; stockQuantity?: number }) => {
    setVariantStates((current) => ({ ...current, [variantId]: { ...current[variantId], saving: true, error: null } }));
    const res = await fetch(`/api/admin/products/${product.id}/variants/${variantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setVariantStates((current) => ({ ...current, [variantId]: { ...current[variantId], ...body, saving: false } }));
      // For a single-variant product, the server keeps the product-level
      // toggle in sync with this variant automatically — reflect that
      // here too so the collapsed row's toggle doesn't show stale state.
      const json = (await res.json()) as { productIsInStock?: boolean };
      if (typeof json.productIsInStock === "boolean") setIsInStock(json.productIsInStock);
    } else {
      setVariantStates((current) => ({ ...current, [variantId]: { ...current[variantId], saving: false, error: "Could not save." } }));
    }
  };

  const onToggleProduct = async (next: boolean) => {
    const previous = isInStock;
    setIsInStock(next);
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isInStock: next }),
    });
    setSaving(false);
    if (!res.ok) {
      setIsInStock(previous);
      setError("Could not save.");
    }
  };

  const onDelete = async () => {
    if (!window.confirm(`Delete ${product.name}? This can't be undone.`)) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setDeleting(false);
      setError(json.error ?? "Could not delete.");
      return;
    }
    // Optimistic — hide the row immediately rather than waiting on the
    // server-refetched list from router.refresh() to drop it.
    setDeleted(true);
    router.refresh();
  };

  if (deleted) return null;

  return (
    <div className="admin-controls-product-row">
      <div
        className="admin-controls-product-row__main"
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={`${expanded ? "Collapse" : "Expand"} ${product.name} sizes`}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
      >
        <span className="admin-controls-expand-btn">
          <span className={`admin-controls-expand-btn__chevron${expanded ? " is-open" : ""}`}>▸</span>
          {product.name}
        </span>
        <span className="admin-order-card__muted">{product.category}</span>
        <Toggle
          checked={isInStock}
          disabled={saving}
          onChange={onToggleProduct}
          label={`Toggle ${product.name} availability`}
        />
        <span className={noneAvailableDespiteEnabled ? "admin-controls-stock-warning" : "admin-order-card__muted"}>
          {purchasableCount} of {product.variants.length} size{product.variants.length === 1 ? "" : "s"} in stock
          {noneAvailableDespiteEnabled && " — hidden on site"}
        </span>
        <div className="admin-controls-row__actions" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="admin-controls-edit-btn" onClick={onEdit} disabled={deleting}>
            Edit
          </button>
          <button
            type="button"
            className="admin-controls-remove-btn"
            aria-label={`Delete ${product.name}`}
            disabled={deleting}
            onClick={onDelete}
          >
            ×
          </button>
        </div>
      </div>
      {error && <div className="admin-status-select__error">{error}</div>}
      {expanded && (
        <div className="admin-controls-variant-list">
          {product.variants.map((variant) => (
            <VariantRow
              key={variant.id}
              variant={variant}
              state={variantStates[variant.id]}
              onToggle={(next) => patchVariant(variant.id, { isInStock: next })}
              onQuantityCommit={(next) => patchVariant(variant.id, { stockQuantity: next })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
