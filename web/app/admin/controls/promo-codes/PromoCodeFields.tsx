"use client";

// Shared field set for both the create form (NewPromoCodeForm) and the
// inline edit form (PromoCodeRow) — same shape either way, just seeded
// from an empty form vs. an existing promo code's current values.
export type PromoCodeFormValue = {
  code: string;
  discountType: "flat" | "percent";
  discountValue: string;
  minOrderRupees: string;
  startsAt: string;
  expiresAt: string;
  // "All products" is the default so a portfolio-wide promo (the common
  // case, e.g. WELCOME10) takes zero extra clicks — scoping to specific
  // products is something the admin opts into, not something that happens
  // by accident from leaving a list empty.
  scopeMode: "all" | "specific";
  selectedProductIds: string[];
};

export const emptyPromoCodeForm = (): PromoCodeFormValue => ({
  code: "",
  discountType: "percent",
  discountValue: "",
  minOrderRupees: "0",
  startsAt: "",
  expiresAt: "",
  scopeMode: "all",
  selectedProductIds: [],
});

export default function PromoCodeFields({
  value,
  onChange,
  products,
}: {
  value: PromoCodeFormValue;
  onChange: (patch: Partial<PromoCodeFormValue>) => void;
  products: { id: string; name: string }[];
}) {
  const toggleProduct = (id: string) => {
    onChange({
      selectedProductIds: value.selectedProductIds.includes(id)
        ? value.selectedProductIds.filter((x) => x !== id)
        : [...value.selectedProductIds, id],
    });
  };

  return (
    <>
      <div className="admin-controls-form__row">
        <label className="admin-controls-field">
          <span>Code</span>
          <input
            className="admin-filter-bar__input"
            value={value.code}
            onChange={(e) => onChange({ code: e.target.value.toUpperCase() })}
            placeholder="e.g. WELCOME10"
          />
        </label>
        <label className="admin-controls-field admin-controls-field--narrow">
          <span>Discount type</span>
          <select
            className="admin-filter-bar__input"
            value={value.discountType}
            onChange={(e) => onChange({ discountType: e.target.value as "flat" | "percent" })}
          >
            <option value="percent">Percent off</option>
            <option value="flat">Flat ₹ off</option>
          </select>
        </label>
        <label className="admin-controls-field admin-controls-field--narrow">
          <span>{value.discountType === "percent" ? "Percent (%)" : "Amount (₹)"}</span>
          <input
            className="admin-filter-bar__input"
            type="number"
            min={0}
            value={value.discountValue}
            onChange={(e) => onChange({ discountValue: e.target.value })}
          />
        </label>
        <label className="admin-controls-field admin-controls-field--narrow">
          <span>Min order (₹)</span>
          <input
            className="admin-filter-bar__input"
            type="number"
            min={0}
            value={value.minOrderRupees}
            onChange={(e) => onChange({ minOrderRupees: e.target.value })}
          />
        </label>
      </div>

      <div className="admin-controls-form__row">
        <label className="admin-controls-field">
          <span>Starts on (optional — blank means immediately)</span>
          <input
            className="admin-filter-bar__input"
            type="date"
            value={value.startsAt}
            onChange={(e) => onChange({ startsAt: e.target.value })}
          />
        </label>
        <label className="admin-controls-field">
          <span>Ends on (optional — blank means never expires)</span>
          <input
            className="admin-filter-bar__input"
            type="date"
            value={value.expiresAt}
            onChange={(e) => onChange({ expiresAt: e.target.value })}
          />
        </label>
      </div>

      <div className="admin-controls-field">
        <span>Applies to</span>
        <div className="admin-controls-scope-toggle">
          <button
            type="button"
            className={`admin-tab${value.scopeMode === "all" ? " is-active" : ""}`}
            onClick={() => onChange({ scopeMode: "all" })}
          >
            All products
          </button>
          <button
            type="button"
            className={`admin-tab${value.scopeMode === "specific" ? " is-active" : ""}`}
            onClick={() => onChange({ scopeMode: "specific" })}
          >
            Specific products
          </button>
        </div>
        {value.scopeMode === "specific" && (
          <div className="admin-controls-checkbox-row">
            {products.map((p) => (
              <label key={p.id} className="admin-controls-checkbox">
                <input
                  type="checkbox"
                  checked={value.selectedProductIds.includes(p.id)}
                  onChange={() => toggleProduct(p.id)}
                />
                {p.name}
              </label>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
