"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product, Variant } from "@/lib/products";
import type { AdminProduct } from "@/lib/admin-data";
import ProductHero from "@/app/components/ProductHero";
import ProductPanel from "@/app/components/ProductPanel";
import ScaledPreview from "./ScaledPreview";
import ProductFields, { emptyProductForm, productToFormValue, type ProductFormValue } from "./ProductFields";

// Rendered both above and below the (long) field list — repeated at the
// top so Cancel and Save/Create are reachable without scrolling through
// every section first, not just as a final action after filling the form.
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
          {submitting ? (isEditing ? "Saving…" : "Creating…") : isEditing ? "Save changes" : "Create product"}
        </button>
        <button type="button" className="admin-controls-cancel-btn" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
      {error && <div className="admin-status-select__error admin-controls-form__error">{error}</div>}
    </>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const commaList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const lineList = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

// Shared by both "Add a product" and "Edit product" — which one this is
// comes down to whether `product` is null, everything else (fields, live
// preview, validation) is identical. Both render in the same page slot
// (see ProductsManager.tsx), never at the same time.
export default function ProductForm({
  product,
  onDone,
  onCancel,
}: {
  product: AdminProduct | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const isEditing = product !== null;

  const [form, setForm] = useState<ProductFormValue>(() => (product ? productToFormValue(product) : emptyProductForm()));
  // Slug tracks the name automatically until the admin edits it directly —
  // in edit mode it starts "already touched" (locked to the saved slug),
  // so correcting a typo in the name can't silently change the product's
  // URL out from under it. Kept outside `form` (derived into it below) so
  // this stays exactly the same reliable mechanism the create-only form
  // used, not a new one prone to stale-closure bugs.
  const [manualSlug, setManualSlug] = useState<string | null>(product ? product.slug : null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayForm: ProductFormValue = useMemo(
    () => ({ ...form, slug: manualSlug ?? slugify(form.name) }),
    [form, manualSlug]
  );

  const patchForm = (patch: Partial<ProductFormValue>) => {
    if (patch.slug !== undefined) {
      setManualSlug(patch.slug);
      return;
    }
    setForm((current) => ({ ...current, ...patch }));
  };

  // Live mock of the actual product detail page, built from real
  // ProductHero/ProductPanel components rather than a hand-built preview —
  // so it can never visually drift from what /products/[slug] actually
  // renders once this product is saved. Falls back to placeholder values
  // for anything not yet filled in, the same way the real components
  // already degrade gracefully (no image → gradient swatch, etc.).
  const draftProduct: Product = useMemo(() => {
    const parsedVariants: Variant[] = displayForm.variants
      .filter((v) => v.sizeLabel.trim())
      .map((v, i) => ({
        id: v.id ?? `draft-${i}`,
        size: v.sizeLabel.trim(),
        priceRupees: Number(v.priceRupees) || 0,
        unitLabel: v.unitLabel.trim(),
        isInStock: v.isInStock,
      }));
    const effectiveVariants: Variant[] =
      parsedVariants.length > 0
        ? parsedVariants
        : [{ id: "draft-placeholder", size: "—", priceRupees: 0, unitLabel: "", isInStock: true }];
    const rows: [string, string][] = displayForm.nutritionRows
      .filter((r) => r.label.trim() && r.value.trim())
      .map((r) => [r.label.trim(), r.value.trim()]);
    const parsedThumbLines = lineList(displayForm.thumbNameLines);

    return {
      id: product?.id ?? "draft",
      slug: displayForm.slug || "draft",
      name: displayForm.name || "New product",
      category: displayForm.category || "Category",
      badge: displayForm.badge || undefined,
      badgeStyle: displayForm.badgeStyle,
      desc: displayForm.shortDescription,
      attrs: commaList(displayForm.attributes),
      price: effectiveVariants[0].priceRupees,
      size: effectiveVariants[0].size,
      primaryVariantId: effectiveVariants[0].id,
      image: displayForm.imageUrl || undefined,
      // The admin form only edits the single legacy image_url field — this
      // preview doesn't have a multi-image carousel to draft, so it's
      // always a single-item (or empty) array here.
      images: displayForm.imageUrl ? [displayForm.imageUrl] : [],
      gradient: displayForm.imageUrl ? undefined : displayForm.gradient,
      inStock: effectiveVariants.some((v) => v.isInStock),
      tabCategories: displayForm.tabCategories,
      description: displayForm.description,
      descriptionBullets: lineList(displayForm.descriptionBullets),
      detailAttrs: commaList(displayForm.detailAttrs),
      usageBullets: lineList(displayForm.usageBullets),
      vegetarian: displayForm.vegetarian,
      ingredients: displayForm.ingredients,
      netQuantity: displayForm.netQuantity,
      storage: displayForm.storage,
      shelfLife: displayForm.shelfLife,
      nutritionBasis: displayForm.nutritionBasis,
      nutritionRows: rows,
      variants: effectiveVariants,
      cartBadge: displayForm.cartBadge,
      thumbGradient: displayForm.thumbGradient,
      thumbNameLines: parsedThumbLines.length > 0 ? parsedThumbLines : [displayForm.name || "New product"],
      thumbNameSize: displayForm.thumbNameSize,
    };
  }, [displayForm, product?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!displayForm.name.trim() || !displayForm.slug.trim() || !displayForm.category.trim()) {
      setError("Name, slug, and category are required.");
      return;
    }
    const validVariants = displayForm.variants.filter((v) => v.sizeLabel.trim());
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
    const res = await fetch(isEditing ? `/api/admin/products/${product.id}` : "/api/admin/products", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: displayForm.slug.trim(),
        name: displayForm.name.trim(),
        category: displayForm.category.trim(),
        badge: displayForm.badge.trim() || null,
        badgeStyle: displayForm.badgeStyle,
        shortDescription: displayForm.shortDescription.trim(),
        description: displayForm.description.trim(),
        attributes: commaList(displayForm.attributes),
        gradient: displayForm.imageUrl.trim() ? null : displayForm.gradient,
        imageUrl: displayForm.imageUrl.trim() || null,
        tabCategories: displayForm.tabCategories,
        descriptionBullets: lineList(displayForm.descriptionBullets),
        detailAttrs: commaList(displayForm.detailAttrs),
        usageBullets: lineList(displayForm.usageBullets),
        vegetarian: displayForm.vegetarian,
        ingredients: displayForm.ingredients.trim(),
        netQuantity: displayForm.netQuantity.trim(),
        storage: displayForm.storage.trim(),
        shelfLife: displayForm.shelfLife.trim(),
        cartBadge: displayForm.cartBadge.trim(),
        thumbGradient: displayForm.thumbGradient.trim(),
        thumbNameLines: lineList(displayForm.thumbNameLines),
        thumbNameSize: displayForm.thumbNameSize.trim() || "14px",
        nutritionBasis: displayForm.nutritionBasis.trim(),
        nutritionRows: displayForm.nutritionRows
          .filter((r) => r.label.trim() && r.value.trim())
          .map((r) => [r.label.trim(), r.value.trim()]),
        variants: validVariants.map((v) => ({
          id: v.id,
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
      setError(json.error ?? `Could not ${isEditing ? "save" : "create"} product.`);
      return;
    }
    router.refresh();
    onDone();
  };

  return (
    <div className="admin-controls-form-grid">
      <form className="admin-controls-form" onSubmit={handleSubmit}>
        <FormActions isEditing={isEditing} submitting={submitting} onCancel={onCancel} error={error} />

        <ProductFields value={displayForm} onChange={patchForm} />

        <FormActions isEditing={isEditing} submitting={submitting} onCancel={onCancel} error={error} />
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
