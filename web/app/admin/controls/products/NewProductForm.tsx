"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product, Variant } from "@/lib/products";
import ProductHero from "@/app/components/ProductHero";
import ProductPanel from "@/app/components/ProductPanel";
import ScaledPreview from "./ScaledPreview";

const TAB_CATEGORY_OPTIONS = ["best-sellers", "seasonal", "probiotics", "energy"];

type VariantForm = {
  sizeLabel: string;
  sku: string;
  priceRupees: string;
  unitLabel: string;
  stockQuantity: string;
  isInStock: boolean;
};

type NutritionRowForm = { label: string; value: string };

const emptyVariant = (): VariantForm => ({
  sizeLabel: "",
  sku: "",
  priceRupees: "",
  unitLabel: "",
  stockQuantity: "0",
  isInStock: true,
});

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const commaList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const lineList = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

export default function NewProductForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  // null until the admin edits the slug field directly — until then it
  // tracks `name` automatically. Derived during render rather than synced
  // via an effect, so there's no extra render pass on every keystroke.
  const [manualSlug, setManualSlug] = useState<string | null>(null);
  const slug = manualSlug ?? slugify(name);
  const [category, setCategory] = useState("");
  const [badge, setBadge] = useState("");
  const [badgeStyle, setBadgeStyle] = useState<"dark" | "light">("light");
  const [shortDescription, setShortDescription] = useState("");
  const [attributes, setAttributes] = useState("");
  const [tabCategories, setTabCategories] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [gradient, setGradient] = useState<"amla" | "turmeric">("amla");
  const [description, setDescription] = useState("");
  const [descriptionBullets, setDescriptionBullets] = useState("");
  const [detailAttrs, setDetailAttrs] = useState("");
  const [usageBullets, setUsageBullets] = useState("");
  const [vegetarian, setVegetarian] = useState(true);
  const [ingredients, setIngredients] = useState("");
  const [netQuantity, setNetQuantity] = useState("");
  const [storage, setStorage] = useState("");
  const [shelfLife, setShelfLife] = useState("");
  const [cartBadge, setCartBadge] = useState("");
  const [thumbGradient, setThumbGradient] = useState("linear-gradient(135deg,#7A9B76 0%,#4A9B8E 100%)");
  const [thumbNameLines, setThumbNameLines] = useState("");
  const [thumbNameSize, setThumbNameSize] = useState("14px");
  const [nutritionBasis, setNutritionBasis] = useState("per 100 g");
  const [nutritionRows, setNutritionRows] = useState<NutritionRowForm[]>([{ label: "", value: "" }]);
  const [variants, setVariants] = useState<VariantForm[]>([emptyVariant()]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const toggleTabCategory = (value: string) => {
    setTabCategories((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
    );
  };

  const updateVariant = (i: number, patch: Partial<VariantForm>) => {
    setVariants((current) => current.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));
  };
  const addVariant = () => setVariants((current) => [...current, emptyVariant()]);
  const removeVariant = (i: number) =>
    setVariants((current) => (current.length > 1 ? current.filter((_, idx) => idx !== i) : current));

  const updateNutritionRow = (i: number, patch: Partial<NutritionRowForm>) => {
    setNutritionRows((current) => current.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const addNutritionRow = () => setNutritionRows((current) => [...current, { label: "", value: "" }]);
  const removeNutritionRow = (i: number) =>
    setNutritionRows((current) => (current.length > 1 ? current.filter((_, idx) => idx !== i) : current));

  // Live mock of the actual product detail page, built from real
  // ProductHero/ProductPanel components rather than a hand-built preview —
  // so it can never visually drift from what /products/[slug] actually
  // renders once this product is saved. Falls back to placeholder values
  // for anything not yet filled in, the same way the real components
  // already degrade gracefully (no image → gradient swatch, etc.).
  const draftProduct: Product = useMemo(() => {
    const parsedVariants: Variant[] = variants
      .filter((v) => v.sizeLabel.trim())
      .map((v, i) => ({
        id: `draft-${i}`,
        size: v.sizeLabel.trim(),
        priceRupees: Number(v.priceRupees) || 0,
        unitLabel: v.unitLabel.trim(),
        isInStock: v.isInStock,
      }));
    const effectiveVariants: Variant[] =
      parsedVariants.length > 0
        ? parsedVariants
        : [{ id: "draft-placeholder", size: "—", priceRupees: 0, unitLabel: "", isInStock: true }];
    const rows: [string, string][] = nutritionRows
      .filter((r) => r.label.trim() && r.value.trim())
      .map((r) => [r.label.trim(), r.value.trim()]);
    const parsedThumbLines = lineList(thumbNameLines);

    return {
      id: "draft",
      slug: slug || "draft",
      name: name || "New product",
      category: category || "Category",
      badge: badge || undefined,
      badgeStyle,
      desc: shortDescription,
      attrs: commaList(attributes),
      price: effectiveVariants[0].priceRupees,
      size: effectiveVariants[0].size,
      primaryVariantId: effectiveVariants[0].id,
      image: imageUrl || undefined,
      gradient: imageUrl ? undefined : gradient,
      inStock: effectiveVariants.some((v) => v.isInStock),
      tabCategories,
      description,
      descriptionBullets: lineList(descriptionBullets),
      detailAttrs: commaList(detailAttrs),
      usageBullets: lineList(usageBullets),
      vegetarian,
      ingredients,
      netQuantity,
      storage,
      shelfLife,
      nutritionBasis,
      nutritionRows: rows,
      variants: effectiveVariants,
      cartBadge,
      thumbGradient,
      thumbNameLines: parsedThumbLines.length > 0 ? parsedThumbLines : [name || "New product"],
      thumbNameSize,
    };
  }, [
    slug,
    name,
    category,
    badge,
    badgeStyle,
    shortDescription,
    attributes,
    imageUrl,
    gradient,
    tabCategories,
    description,
    descriptionBullets,
    detailAttrs,
    usageBullets,
    vegetarian,
    ingredients,
    netQuantity,
    storage,
    shelfLife,
    nutritionBasis,
    nutritionRows,
    cartBadge,
    thumbGradient,
    thumbNameLines,
    thumbNameSize,
    variants,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim() || !slug.trim() || !category.trim()) {
      setError("Name, slug, and category are required.");
      return;
    }
    const validVariants = variants.filter((v) => v.sizeLabel.trim());
    if (validVariants.length === 0) {
      setError("At least one variant (size) is required.");
      return;
    }
    for (const v of validVariants) {
      if (!v.sku.trim() || !(Number(v.priceRupees) > 0)) {
        setError("Every variant needs a SKU and a price greater than 0.");
        return;
      }
    }

    setSubmitting(true);
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: slug.trim(),
        name: name.trim(),
        category: category.trim(),
        badge: badge.trim() || null,
        badgeStyle,
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        attributes: commaList(attributes),
        gradient: imageUrl.trim() ? null : gradient,
        imageUrl: imageUrl.trim() || null,
        tabCategories,
        descriptionBullets: lineList(descriptionBullets),
        detailAttrs: commaList(detailAttrs),
        usageBullets: lineList(usageBullets),
        vegetarian,
        ingredients: ingredients.trim(),
        netQuantity: netQuantity.trim(),
        storage: storage.trim(),
        shelfLife: shelfLife.trim(),
        cartBadge: cartBadge.trim(),
        thumbGradient: thumbGradient.trim(),
        thumbNameLines: lineList(thumbNameLines),
        thumbNameSize: thumbNameSize.trim() || "14px",
        nutritionBasis: nutritionBasis.trim(),
        nutritionRows: nutritionRows
          .filter((r) => r.label.trim() && r.value.trim())
          .map((r) => [r.label.trim(), r.value.trim()]),
        variants: validVariants.map((v) => ({
          sizeLabel: v.sizeLabel.trim(),
          sku: v.sku.trim(),
          priceRupees: Number(v.priceRupees),
          unitLabel: v.unitLabel.trim(),
          stockQuantity: Number(v.stockQuantity) || 0,
          isInStock: v.isInStock,
        })),
      }),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(json.error ?? "Could not create product.");
      return;
    }
    setSuccess(`${name} created.`);
    router.refresh();
  };

  return (
    <div className="admin-controls-form-grid">
      <form className="admin-controls-form" onSubmit={handleSubmit}>
        <div className="admin-controls-form__section">
          <div className="admin-controls-form__section-title">Basics</div>
          <div className="admin-controls-form__row">
            <label className="admin-controls-field">
              <span>Name</span>
              <input className="admin-filter-bar__input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="admin-controls-field">
              <span>Slug</span>
              <input
                className="admin-filter-bar__input"
                value={slug}
                onChange={(e) => setManualSlug(e.target.value)}
              />
            </label>
          </div>
          <div className="admin-controls-form__row">
            <label className="admin-controls-field">
              <span>Category</span>
              <input className="admin-filter-bar__input" value={category} onChange={(e) => setCategory(e.target.value)} />
            </label>
            <label className="admin-controls-field">
              <span>Badge text</span>
              <input className="admin-filter-bar__input" value={badge} onChange={(e) => setBadge(e.target.value)} />
            </label>
            <label className="admin-controls-field admin-controls-field--narrow">
              <span>Badge style</span>
              <select
                className="admin-filter-bar__input"
                value={badgeStyle}
                onChange={(e) => setBadgeStyle(e.target.value as "dark" | "light")}
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
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
            />
          </label>
          <label className="admin-controls-field">
            <span>Card attributes (comma-separated)</span>
            <input className="admin-filter-bar__input" value={attributes} onChange={(e) => setAttributes(e.target.value)} />
          </label>
          <div className="admin-controls-field">
            <span>Tab categories</span>
            <div className="admin-controls-checkbox-row">
              {TAB_CATEGORY_OPTIONS.map((value) => (
                <label key={value} className="admin-controls-checkbox">
                  <input
                    type="checkbox"
                    checked={tabCategories.includes(value)}
                    onChange={() => toggleTabCategory(value)}
                  />
                  {value}
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
              <input className="admin-filter-bar__input" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            </label>
            <label className="admin-controls-field admin-controls-field--narrow">
              <span>Gradient fallback</span>
              <select
                className="admin-filter-bar__input"
                value={gradient}
                onChange={(e) => setGradient(e.target.value as "amla" | "turmeric")}
                disabled={!!imageUrl.trim()}
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
            <textarea className="admin-controls-textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="admin-controls-field">
            <span>Description bullets (one per line)</span>
            <textarea
              className="admin-controls-textarea"
              value={descriptionBullets}
              onChange={(e) => setDescriptionBullets(e.target.value)}
            />
          </label>
          <label className="admin-controls-field">
            <span>Detail attributes (comma-separated)</span>
            <input className="admin-filter-bar__input" value={detailAttrs} onChange={(e) => setDetailAttrs(e.target.value)} />
          </label>
          <label className="admin-controls-field">
            <span>Usage bullets (one per line)</span>
            <textarea className="admin-controls-textarea" value={usageBullets} onChange={(e) => setUsageBullets(e.target.value)} />
          </label>
        </div>

        <div className="admin-controls-form__section">
          <div className="admin-controls-form__section-title">Product facts</div>
          <label className="admin-controls-checkbox">
            <input type="checkbox" checked={vegetarian} onChange={(e) => setVegetarian(e.target.checked)} />
            Vegetarian
          </label>
          <label className="admin-controls-field">
            <span>Ingredients</span>
            <input className="admin-filter-bar__input" value={ingredients} onChange={(e) => setIngredients(e.target.value)} />
          </label>
          <div className="admin-controls-form__row">
            <label className="admin-controls-field">
              <span>Net quantity</span>
              <input className="admin-filter-bar__input" value={netQuantity} onChange={(e) => setNetQuantity(e.target.value)} />
            </label>
            <label className="admin-controls-field">
              <span>Storage</span>
              <input className="admin-filter-bar__input" value={storage} onChange={(e) => setStorage(e.target.value)} />
            </label>
            <label className="admin-controls-field">
              <span>Shelf life</span>
              <input className="admin-filter-bar__input" value={shelfLife} onChange={(e) => setShelfLife(e.target.value)} />
            </label>
          </div>
          <div className="admin-controls-field">
            <span>Nutrition</span>
            <div className="admin-controls-form__row">
              <input
                className="admin-filter-bar__input"
                placeholder="Basis, e.g. per 100 g"
                value={nutritionBasis}
                onChange={(e) => setNutritionBasis(e.target.value)}
              />
            </div>
            {nutritionRows.map((row, i) => (
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
                  disabled={nutritionRows.length === 1}
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
              <input className="admin-filter-bar__input" value={cartBadge} onChange={(e) => setCartBadge(e.target.value)} />
            </label>
            <label className="admin-controls-field admin-controls-field--narrow">
              <span>Thumb name size</span>
              <input className="admin-filter-bar__input" value={thumbNameSize} onChange={(e) => setThumbNameSize(e.target.value)} />
            </label>
          </div>
          <label className="admin-controls-field">
            <span>Thumb gradient (CSS)</span>
            <input className="admin-filter-bar__input" value={thumbGradient} onChange={(e) => setThumbGradient(e.target.value)} />
          </label>
          <label className="admin-controls-field">
            <span>Thumb name lines (1-2, one per line)</span>
            <textarea
              className="admin-controls-textarea"
              value={thumbNameLines}
              onChange={(e) => setThumbNameLines(e.target.value)}
            />
          </label>
        </div>

        <div className="admin-controls-form__section">
          <div className="admin-controls-form__section-title">Variants</div>
          {variants.map((v, i) => (
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
                <input
                  type="checkbox"
                  checked={v.isInStock}
                  onChange={(e) => updateVariant(i, { isInStock: e.target.checked })}
                />
                In stock
              </label>
              <button
                type="button"
                className="admin-controls-remove-btn"
                onClick={() => removeVariant(i)}
                disabled={variants.length === 1}
              >
                ×
              </button>
            </div>
          ))}
          <button type="button" className="admin-controls-add-btn" onClick={addVariant}>
            + Add variant
          </button>
        </div>

        {error && <div className="admin-status-select__error admin-controls-form__error">{error}</div>}
        {success && <div className="admin-controls-form__success">{success}</div>}

        <button type="submit" className="admin-filter-bar__apply" disabled={submitting}>
          {submitting ? "Creating…" : "Create product"}
        </button>
      </form>

      <div className="admin-controls-preview-pane">
        <div className="admin-controls-form__section-title">Live preview</div>
        <ScaledPreview>
          <ProductHero product={draftProduct} />
          <ProductPanel product={draftProduct} />
        </ScaledPreview>
      </div>
    </div>
  );
}
