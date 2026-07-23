"use client";

import type { AdminProduct } from "@/lib/admin-data";

const TAB_CATEGORY_OPTIONS = ["best-sellers", "seasonal", "probiotics", "energy"];

export type VariantForm = {
  // Present only for a variant that already exists in the DB (pre-filled
  // during edit) — its absence is exactly what tells the API route
  // (app/api/admin/products/[id]/route.ts) to insert a new row instead of
  // updating one. Never set for a brand-new row added in the form.
  id?: string;
  sizeLabel: string;
  sku: string;
  priceRupees: string;
  unitLabel: string;
  stockQuantity: string;
  isInStock: boolean;
};

export type NutritionRowForm = { label: string; value: string };

export type ProductFormValue = {
  name: string;
  slug: string;
  category: string;
  badge: string;
  badgeStyle: "dark" | "light";
  shortDescription: string;
  attributes: string;
  tabCategories: string[];
  imageUrl: string;
  gradient: "amla" | "turmeric";
  description: string;
  descriptionBullets: string;
  detailAttrs: string;
  usageBullets: string;
  vegetarian: boolean;
  ingredients: string;
  netQuantity: string;
  storage: string;
  shelfLife: string;
  cartBadge: string;
  thumbGradient: string;
  thumbNameLines: string;
  thumbNameSize: string;
  nutritionBasis: string;
  nutritionRows: NutritionRowForm[];
  variants: VariantForm[];
};

export const emptyVariant = (): VariantForm => ({
  sizeLabel: "",
  sku: "",
  priceRupees: "",
  unitLabel: "",
  stockQuantity: "0",
  isInStock: true,
});

export function emptyProductForm(): ProductFormValue {
  return {
    name: "",
    slug: "",
    category: "",
    badge: "",
    badgeStyle: "light",
    shortDescription: "",
    attributes: "",
    tabCategories: [],
    imageUrl: "",
    gradient: "amla",
    description: "",
    descriptionBullets: "",
    detailAttrs: "",
    usageBullets: "",
    vegetarian: true,
    ingredients: "",
    netQuantity: "",
    storage: "",
    shelfLife: "",
    cartBadge: "",
    thumbGradient: "linear-gradient(135deg,#7A9B76 0%,#4A9B8E 100%)",
    thumbNameLines: "",
    thumbNameSize: "14px",
    nutritionBasis: "per 100 g",
    nutritionRows: [{ label: "", value: "" }],
    variants: [emptyVariant()],
  };
}

// Pre-fills the edit form from an existing product — the inverse of the
// submit-time serialization in ProductForm.tsx.
export function productToFormValue(product: AdminProduct): ProductFormValue {
  return {
    name: product.name,
    slug: product.slug,
    category: product.category,
    badge: product.badge ?? "",
    badgeStyle: product.badgeStyle ?? "light",
    shortDescription: product.shortDescription,
    attributes: product.attributes.join(", "),
    tabCategories: product.tabCategories,
    imageUrl: product.imageUrl ?? "",
    gradient: product.gradient ?? "amla",
    description: product.description,
    descriptionBullets: product.descriptionBullets.join("\n"),
    detailAttrs: product.detailAttrs.join(", "),
    usageBullets: product.usageBullets.join("\n"),
    vegetarian: product.vegetarian,
    ingredients: product.ingredients,
    netQuantity: product.netQuantity,
    storage: product.storage,
    shelfLife: product.shelfLife,
    cartBadge: product.cartBadge,
    thumbGradient: product.thumbGradient,
    thumbNameLines: product.thumbNameLines.join("\n"),
    thumbNameSize: product.thumbNameSize,
    nutritionBasis: product.nutritionBasis,
    nutritionRows:
      product.nutritionRows.length > 0
        ? product.nutritionRows.map(([label, value]) => ({ label, value }))
        : [{ label: "", value: "" }],
    variants: product.variants.map((v) => ({
      id: v.id,
      sizeLabel: v.sizeLabel,
      sku: v.sku,
      priceRupees: String(v.priceRupees),
      unitLabel: v.unitLabel,
      stockQuantity: String(v.stockQuantity),
      isInStock: v.isInStock,
    })),
  };
}

export default function ProductFields({
  value,
  onChange,
}: {
  value: ProductFormValue;
  onChange: (patch: Partial<ProductFormValue>) => void;
}) {
  const toggleTabCategory = (tab: string) => {
    onChange({
      tabCategories: value.tabCategories.includes(tab)
        ? value.tabCategories.filter((v) => v !== tab)
        : [...value.tabCategories, tab],
    });
  };

  const updateVariant = (i: number, patch: Partial<VariantForm>) => {
    onChange({ variants: value.variants.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) });
  };
  const addVariant = () => onChange({ variants: [...value.variants, emptyVariant()] });
  const removeVariant = (i: number) =>
    onChange({ variants: value.variants.length > 1 ? value.variants.filter((_, idx) => idx !== i) : value.variants });

  const updateNutritionRow = (i: number, patch: Partial<NutritionRowForm>) => {
    onChange({ nutritionRows: value.nutritionRows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
  };
  const addNutritionRow = () => onChange({ nutritionRows: [...value.nutritionRows, { label: "", value: "" }] });
  const removeNutritionRow = (i: number) =>
    onChange({
      nutritionRows: value.nutritionRows.length > 1 ? value.nutritionRows.filter((_, idx) => idx !== i) : value.nutritionRows,
    });

  return (
    <>
      <div className="admin-controls-form__section">
        <div className="admin-controls-form__section-title">Basics</div>
        <div className="admin-controls-form__row">
          <label className="admin-controls-field">
            <span>Name</span>
            <input className="admin-filter-bar__input" value={value.name} onChange={(e) => onChange({ name: e.target.value })} />
          </label>
          <label className="admin-controls-field">
            <span>Slug</span>
            <input className="admin-filter-bar__input" value={value.slug} onChange={(e) => onChange({ slug: e.target.value })} />
          </label>
        </div>
        <div className="admin-controls-form__row">
          <label className="admin-controls-field">
            <span>Category</span>
            <input className="admin-filter-bar__input" value={value.category} onChange={(e) => onChange({ category: e.target.value })} />
          </label>
          <label className="admin-controls-field">
            <span>Badge text</span>
            <input className="admin-filter-bar__input" value={value.badge} onChange={(e) => onChange({ badge: e.target.value })} />
          </label>
          <label className="admin-controls-field admin-controls-field--narrow">
            <span>Badge style</span>
            <select
              className="admin-filter-bar__input"
              value={value.badgeStyle}
              onChange={(e) => onChange({ badgeStyle: e.target.value as "dark" | "light" })}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </div>
        <label className="admin-controls-field">
          <span>Short description (card blurb)</span>
          <input
            className="admin-filter-bar__input"
            value={value.shortDescription}
            onChange={(e) => onChange({ shortDescription: e.target.value })}
          />
        </label>
        <label className="admin-controls-field">
          <span>Card attributes (comma-separated)</span>
          <input className="admin-filter-bar__input" value={value.attributes} onChange={(e) => onChange({ attributes: e.target.value })} />
        </label>
        <div className="admin-controls-field">
          <span>Tab categories</span>
          <div className="admin-controls-checkbox-row">
            {TAB_CATEGORY_OPTIONS.map((tab) => (
              <label key={tab} className="admin-controls-checkbox">
                <input type="checkbox" checked={value.tabCategories.includes(tab)} onChange={() => toggleTabCategory(tab)} />
                {tab}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="admin-controls-form__section">
        <div className="admin-controls-form__section-title">Image</div>
        <div className="admin-controls-form__row">
          <label className="admin-controls-field">
            <span>Image URL</span>
            <input className="admin-filter-bar__input" value={value.imageUrl} onChange={(e) => onChange({ imageUrl: e.target.value })} />
          </label>
          <label className="admin-controls-field admin-controls-field--narrow">
            <span>Gradient fallback</span>
            <select
              className="admin-filter-bar__input"
              value={value.gradient}
              onChange={(e) => onChange({ gradient: e.target.value as "amla" | "turmeric" })}
              disabled={!!value.imageUrl.trim()}
            >
              <option value="amla">Amla</option>
              <option value="turmeric">Turmeric</option>
            </select>
          </label>
        </div>
      </div>

      <div className="admin-controls-form__section">
        <div className="admin-controls-form__section-title">Detail page content</div>
        <label className="admin-controls-field">
          <span>Long description</span>
          <textarea className="admin-controls-textarea" value={value.description} onChange={(e) => onChange({ description: e.target.value })} />
        </label>
        <label className="admin-controls-field">
          <span>Description bullets (one per line)</span>
          <textarea
            className="admin-controls-textarea"
            value={value.descriptionBullets}
            onChange={(e) => onChange({ descriptionBullets: e.target.value })}
          />
        </label>
        <label className="admin-controls-field">
          <span>Detail attributes (comma-separated)</span>
          <input className="admin-filter-bar__input" value={value.detailAttrs} onChange={(e) => onChange({ detailAttrs: e.target.value })} />
        </label>
        <label className="admin-controls-field">
          <span>Usage bullets (one per line)</span>
          <textarea className="admin-controls-textarea" value={value.usageBullets} onChange={(e) => onChange({ usageBullets: e.target.value })} />
        </label>
      </div>

      <div className="admin-controls-form__section">
        <div className="admin-controls-form__section-title">Product facts</div>
        <label className="admin-controls-checkbox">
          <input type="checkbox" checked={value.vegetarian} onChange={(e) => onChange({ vegetarian: e.target.checked })} />
          Vegetarian
        </label>
        <label className="admin-controls-field">
          <span>Ingredients</span>
          <input className="admin-filter-bar__input" value={value.ingredients} onChange={(e) => onChange({ ingredients: e.target.value })} />
        </label>
        <div className="admin-controls-form__row">
          <label className="admin-controls-field">
            <span>Net quantity</span>
            <input className="admin-filter-bar__input" value={value.netQuantity} onChange={(e) => onChange({ netQuantity: e.target.value })} />
          </label>
          <label className="admin-controls-field">
            <span>Storage</span>
            <input className="admin-filter-bar__input" value={value.storage} onChange={(e) => onChange({ storage: e.target.value })} />
          </label>
          <label className="admin-controls-field">
            <span>Shelf life</span>
            <input className="admin-filter-bar__input" value={value.shelfLife} onChange={(e) => onChange({ shelfLife: e.target.value })} />
          </label>
        </div>
        <div className="admin-controls-field">
          <span>Nutrition</span>
          <div className="admin-controls-form__row">
            <input
              className="admin-filter-bar__input"
              placeholder="Basis, e.g. per 100 g"
              value={value.nutritionBasis}
              onChange={(e) => onChange({ nutritionBasis: e.target.value })}
            />
          </div>
          {value.nutritionRows.map((row, i) => (
            <div className="admin-controls-form__row admin-controls-repeatable-row" key={i}>
              <input
                className="admin-filter-bar__input"
                placeholder="Label, e.g. Energy"
                value={row.label}
                onChange={(e) => updateNutritionRow(i, { label: e.target.value })}
              />
              <input
                className="admin-filter-bar__input"
                placeholder="Value, e.g. 62 kcal"
                value={row.value}
                onChange={(e) => updateNutritionRow(i, { value: e.target.value })}
              />
              <button
                type="button"
                className="admin-controls-remove-btn"
                onClick={() => removeNutritionRow(i)}
                disabled={value.nutritionRows.length === 1}
              >
                ×
              </button>
            </div>
          ))}
          <button type="button" className="admin-controls-add-btn" onClick={addNutritionRow}>
            + Add nutrition row
          </button>
        </div>
      </div>

      <div className="admin-controls-form__section">
        <div className="admin-controls-form__section-title">Cart thumbnail</div>
        <div className="admin-controls-form__row">
          <label className="admin-controls-field">
            <span>Cart badge text</span>
            <input className="admin-filter-bar__input" value={value.cartBadge} onChange={(e) => onChange({ cartBadge: e.target.value })} />
          </label>
          <label className="admin-controls-field admin-controls-field--narrow">
            <span>Thumb name size</span>
            <input className="admin-filter-bar__input" value={value.thumbNameSize} onChange={(e) => onChange({ thumbNameSize: e.target.value })} />
          </label>
        </div>
        <label className="admin-controls-field">
          <span>Thumb gradient (CSS)</span>
          <input className="admin-filter-bar__input" value={value.thumbGradient} onChange={(e) => onChange({ thumbGradient: e.target.value })} />
        </label>
        <label className="admin-controls-field">
          <span>Thumb name lines (1-2, one per line)</span>
          <textarea className="admin-controls-textarea" value={value.thumbNameLines} onChange={(e) => onChange({ thumbNameLines: e.target.value })} />
        </label>
      </div>

      <div className="admin-controls-form__section">
        <div className="admin-controls-form__section-title">Variants</div>
        {value.variants.map((v, i) => (
          <div className="admin-controls-variant-form-row" key={i}>
            <input
              className="admin-filter-bar__input"
              placeholder="Size, e.g. 500 ml"
              value={v.sizeLabel}
              onChange={(e) => updateVariant(i, { sizeLabel: e.target.value })}
            />
            <input
              className="admin-filter-bar__input"
              placeholder="SKU"
              value={v.sku}
              onChange={(e) => updateVariant(i, { sku: e.target.value })}
            />
            <input
              className="admin-filter-bar__input"
              placeholder="Price ₹"
              type="number"
              min={0}
              value={v.priceRupees}
              onChange={(e) => updateVariant(i, { priceRupees: e.target.value })}
            />
            <input
              className="admin-filter-bar__input"
              placeholder="Unit label, e.g. / 500 ml jar"
              value={v.unitLabel}
              onChange={(e) => updateVariant(i, { unitLabel: e.target.value })}
            />
            <input
              className="admin-filter-bar__input"
              placeholder="Stock"
              type="number"
              min={0}
              value={v.stockQuantity}
              onChange={(e) => updateVariant(i, { stockQuantity: e.target.value })}
            />
            <label className="admin-controls-checkbox">
              <input type="checkbox" checked={v.isInStock} onChange={(e) => updateVariant(i, { isInStock: e.target.checked })} />
              In stock
            </label>
            <button
              type="button"
              className="admin-controls-remove-btn"
              onClick={() => removeVariant(i)}
              disabled={value.variants.length === 1 || !!v.id}
              title={v.id ? "Already-saved sizes can't be removed here — use the in-stock toggle instead" : undefined}
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" className="admin-controls-add-btn" onClick={addVariant}>
          + Add variant
        </button>
      </div>
    </>
  );
}
