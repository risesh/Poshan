import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

const GRADIENTS = ["amla", "turmeric"];
const BADGE_STYLES = ["dark", "light"];

type VariantInput = {
  id?: string;
  sizeLabel?: string;
  sku?: string;
  priceRupees?: number;
  unitLabel?: string;
  stockQuantity?: number;
  isInStock?: boolean;
};

type FullEditBody = {
  slug?: string;
  name?: string;
  category?: string;
  badge?: string | null;
  badgeStyle?: string | null;
  shortDescription?: string;
  description?: string;
  attributes?: string[];
  gradient?: string | null;
  imageUrl?: string | null;
  tabCategories?: string[];
  descriptionBullets?: string[];
  detailAttrs?: string[];
  usageBullets?: string[];
  vegetarian?: boolean;
  ingredients?: string;
  netQuantity?: string;
  storage?: string;
  shelfLife?: string;
  cartBadge?: string;
  thumbGradient?: string;
  thumbNameLines?: string[];
  thumbNameSize?: string;
  nutritionBasis?: string;
  nutritionRows?: [string, string][];
  variants?: VariantInput[];
};

// Product-level enable/disable — the master "still part of the catalog"
// switch (distinct from a variant's own is_instock, patched separately at
// /api/admin/products/[id]/variants/[variantId]) — is a lightweight
// shortcut of this same route: a request with only `isInStock` in the body
// skips all the full-edit validation below and just flips that one column,
// same as before this route grew edit-form support.
export async function PATCH(request: Request, props: RouteContext<"/api/admin/products/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth alongside proxy.ts's /admin gate — see
  // supabase/migrations/0006_admin_product_write.sql for the actual
  // boundary if this check is ever bypassed.
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = (await request.json()) as { isInStock?: boolean } & FullEditBody;

  if (Object.keys(body).length === 1 && typeof body.isInStock === "boolean") {
    const { error } = await supabase.from("products").update({ is_instock: body.isInStock }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const {
    slug,
    name,
    category,
    badge,
    badgeStyle,
    shortDescription,
    description,
    attributes,
    gradient,
    imageUrl,
    tabCategories,
    descriptionBullets,
    detailAttrs,
    usageBullets,
    vegetarian,
    ingredients,
    netQuantity,
    storage,
    shelfLife,
    cartBadge,
    thumbGradient,
    thumbNameLines,
    thumbNameSize,
    nutritionBasis,
    nutritionRows,
    variants,
    isInStock,
  } = body;

  if (!slug?.trim() || !name?.trim() || !category?.trim()) {
    return NextResponse.json({ error: "Name, slug, and category are required" }, { status: 400 });
  }
  if (badgeStyle != null && !BADGE_STYLES.includes(badgeStyle)) {
    return NextResponse.json({ error: "Invalid badge style" }, { status: 400 });
  }
  if (gradient != null && !GRADIENTS.includes(gradient)) {
    return NextResponse.json({ error: "Invalid gradient" }, { status: 400 });
  }
  if (!Array.isArray(variants) || variants.length === 0) {
    return NextResponse.json({ error: "At least one variant is required" }, { status: 400 });
  }
  for (const v of variants) {
    if (!v.sizeLabel?.trim() || !v.sku?.trim() || !(Number(v.priceRupees) > 0)) {
      return NextResponse.json(
        { error: "Every variant needs a size, SKU, and a price greater than 0" },
        { status: 400 }
      );
    }
  }

  const { error: productError } = await supabase
    .from("products")
    .update({
      slug: slug.trim(),
      name: name.trim(),
      category: category.trim(),
      badge: badge?.trim() || null,
      badge_style: badgeStyle ?? null,
      description: description?.trim() || null,
      attributes: attributes ?? [],
      short_description: shortDescription?.trim() ?? "",
      gradient: gradient ?? null,
      image_url: imageUrl?.trim() || null,
      tab_categories: tabCategories ?? [],
      description_bullets: descriptionBullets ?? [],
      detail_attrs: detailAttrs ?? [],
      usage_bullets: usageBullets ?? [],
      vegetarian: vegetarian ?? true,
      ingredients: ingredients?.trim() ?? "",
      net_quantity: netQuantity?.trim() ?? "",
      storage: storage?.trim() ?? "",
      shelf_life: shelfLife?.trim() ?? "",
      cart_badge: cartBadge?.trim() ?? "",
      thumb_gradient: thumbGradient?.trim() ?? "",
      thumb_name_lines: thumbNameLines ?? [],
      thumb_name_size: thumbNameSize?.trim() || "14px",
      ...(typeof isInStock === "boolean" ? { is_instock: isInStock } : {}),
    })
    .eq("id", id);

  if (productError) {
    return NextResponse.json({ error: productError.message }, { status: 400 });
  }

  const nutrition = nutritionBasis || nutritionRows?.length ? { basis: nutritionBasis ?? "", rows: nutritionRows ?? [] } : {};

  // Existing variants (have an id) are updated in place; new ones (no id,
  // added in the edit form) are inserted. Removing an already-saved
  // variant isn't offered by the edit form at all — order_items can
  // reference a variant with no cascade rule, so deleting one that's ever
  // been ordered would fail; the existing per-variant enable/disable
  // toggle is the supported way to stop selling a size.
  const toInsert = variants.filter((v) => !v.id);

  for (const [i, v] of variants.entries()) {
    if (!v.id) continue;
    const { error } = await supabase
      .from("product_variants")
      .update({
        size_label: v.sizeLabel!.trim(),
        sku: v.sku!.trim(),
        price_rupees: Math.round(Number(v.priceRupees)),
        stock_quantity: Math.max(0, Math.round(Number(v.stockQuantity ?? 0))),
        is_instock: v.isInStock ?? true,
        unit_label: v.unitLabel?.trim() ?? "",
        sort_order: i,
        nutrition: i === 0 ? nutrition : {},
      })
      .eq("id", v.id)
      .eq("product_id", id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("product_variants").insert(
      toInsert.map((v) => ({
        product_id: id,
        size_label: v.sizeLabel!.trim(),
        sku: v.sku!.trim(),
        price_rupees: Math.round(Number(v.priceRupees)),
        stock_quantity: Math.max(0, Math.round(Number(v.stockQuantity ?? 0))),
        is_instock: v.isInStock ?? true,
        unit_label: v.unitLabel?.trim() ?? "",
        sort_order: variants.indexOf(v),
        nutrition: variants.indexOf(v) === 0 ? nutrition : {},
      }))
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, props: RouteContext<"/api/admin/products/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    // 23503 = foreign_key_violation — a variant of this product has been
    // ordered (order_items.product_variant_id references it with no
    // cascade rule), so the DB correctly refuses to delete it. See
    // 0010_admin_product_delete.sql's comment on why this is expected,
    // not a bug — surfacing the real fix (disable it) instead of the raw
    // constraint error.
    if (error.code === "23503") {
      return NextResponse.json(
        { error: "This product has past orders and can't be deleted. Disable it instead." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
