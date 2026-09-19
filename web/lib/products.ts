import type { SupabaseClient } from "@supabase/supabase-js";

// Supabase-backed product catalog (supabase/migrations/0001_init.sql +
// 0005_product_catalog_fields.sql define the `products`/`product_variants`
// tables this reads). Every call site is written against the same
// Product/Variant shape the old hardcoded array used, so the swap away
// from a static array only changed this file plus the handful of callers
// that now need to `await` a fetch (see order-math.ts's VariantLookup and
// cart-context.tsx) — not every component that reads product data.
export type Variant = {
  id: string; // product_variants.id (uuid) — the real cart-line/order-line id
  size: string; // e.g. '500 ml' | '1 L'
  priceRupees: number;
  unitLabel: string; // e.g. '/ 500 ml jar'
  isInStock: boolean; // is_instock && stock_quantity > 0 — per-variant admin toggle
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  badge?: string;
  badgeStyle?: "dark" | "light";
  desc: string;
  attrs: string[];
  price: number;
  size: string;
  image?: string;
  gradient?: "amla" | "turmeric";
  inStock: boolean; // products.is_instock && at least one variant is in stock
  // The variant `price`/`size` above describe, and the one ProductCard's
  // Add button should act on — prefers an in-stock variant (see
  // mapRowToProduct) so a card never shows/sells the one disabled size
  // out of several just because it happens to sort first.
  primaryVariantId: string;
  tabCategories: string[];
  // Ordered PDP carousel (ProductHero.tsx) — sourced from product_images
  // (supabase/migrations/0014_product_images.sql) when any rows exist for
  // this product, falling back to a single-item array built from `image`
  // for a product that hasn't been migrated to multi-image yet. Never
  // empty when `image` is set, so ProductHero doesn't need a separate
  // "zero images" case for the common product.
  images: string[];

  // Detail-page-only fields
  description: string;
  descriptionBullets: string[];
  detailAttrs: string[];
  usageBullets: string[];
  vegetarian: boolean;
  ingredients: string;
  netQuantity: string;
  storage: string;
  shelfLife: string;
  nutritionBasis: string;
  nutritionRows: [string, string][];
  variants: Variant[];
  placeholderContent?: boolean;

  // Cart line-item thumbnail (cart has no product photos, just a gradient
  // swatch + name)
  cartBadge: string;
  thumbGradient: string;
  thumbNameLines: string[];
  thumbNameSize: string;
};

// What every cart-pricing call site needs per cart line: enough of the
// parent product to render a thumbnail/name, plus the resolved variant.
// Exported so lib/order-math.ts can type its VariantLookup parameter
// against this without importing any runtime code from this file (only
// fetchVariantsByIds below actually touches Supabase).
export type VariantLookup = Map<
  string,
  {
    product: {
      id: string;
      name: string;
      image?: string;
      cartBadge: string;
      thumbGradient: string;
      thumbNameLines: string[];
      thumbNameSize: string;
    };
    variant: Variant;
  }
>;

type NutritionJson = { basis?: string; rows?: [string, string][] };

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  badge: string | null;
  description: string | null;
  attributes: string[];
  is_instock: boolean;
  short_description: string;
  gradient: "amla" | "turmeric" | null;
  badge_style: "dark" | "light" | null;
  image_url: string | null;
  tab_categories: string[];
  description_bullets: string[];
  detail_attrs: string[];
  usage_bullets: string[];
  vegetarian: boolean;
  ingredients: string;
  net_quantity: string;
  storage: string;
  shelf_life: string;
  cart_badge: string;
  thumb_gradient: string;
  thumb_name_lines: string[];
  thumb_name_size: string;
  placeholder_content: boolean;
  product_variants: VariantRow[];
  product_images: ProductImageRow[];
};

type VariantRow = {
  id: string;
  size_label: string;
  price_rupees: number;
  stock_quantity: number;
  is_instock: boolean;
  nutrition: NutritionJson | null;
  unit_label: string;
  sort_order: number;
};

type ProductImageRow = {
  image_url: string;
  sort_order: number;
};

const PRODUCT_SELECT = `
  id, slug, name, category, badge, description, attributes, is_instock,
  short_description, gradient, badge_style, image_url, tab_categories,
  description_bullets, detail_attrs, usage_bullets, vegetarian, ingredients,
  net_quantity, storage, shelf_life, cart_badge, thumb_gradient,
  thumb_name_lines, thumb_name_size, placeholder_content,
  product_variants ( id, size_label, price_rupees, stock_quantity, is_instock, nutrition, unit_label, sort_order ),
  product_images ( image_url, sort_order )
`;

function mapRowToProduct(row: ProductRow): Product {
  const sortedVariantRows = [...row.product_variants].sort(
    (a, b) => a.sort_order - b.sort_order || a.size_label.localeCompare(b.size_label)
  );
  const variants: Variant[] = sortedVariantRows.map((v) => ({
    id: v.id,
    size: v.size_label,
    priceRupees: v.price_rupees,
    unitLabel: v.unit_label,
    // ANDed with the product's own master flag, not just this variant's —
    // otherwise a disabled product (row.is_instock = false) with a variant
    // whose own is_instock/stock_quantity still look fine would render as
    // out-of-stock on the PLP grid (which reads the combined `inStock`
    // below) but still show that size as selectable/purchasable here on
    // the PDP (ProductHero.tsx reads variant.isInStock directly) — the two
    // pages disagreeing about the same product.
    isInStock: row.is_instock && v.is_instock && v.stock_quantity > 0,
  }));
  // Nutrition is only ever populated on the sort_order-0 variant row (see
  // 0005_product_catalog_fields.sql's migration note) — stays tied to that
  // row regardless of stock, independent of the "which variant does the
  // card represent" choice below, so an out-of-stock primary variant
  // doesn't blank out the detail page's nutrition panel.
  const nutrition = sortedVariantRows[0]?.nutrition ?? {};

  // Card display (price/size) and the variant id ProductCard's Add button
  // acts on prefer an actually-purchasable variant, so a product with one
  // disabled size still reads as available and sellable from the card —
  // falls back to the first variant by sort_order only when every variant
  // is unavailable (the fully-out-of-stock case, where it doesn't matter
  // which one is shown since Add is disabled regardless).
  const availableRow =
    (row.is_instock && sortedVariantRows.find((v) => v.is_instock && v.stock_quantity > 0)) ||
    sortedVariantRows[0];

  const images =
    row.product_images.length > 0
      ? [...row.product_images].sort((a, b) => a.sort_order - b.sort_order).map((img) => img.image_url)
      : row.image_url
        ? [row.image_url]
        : [];

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    badge: row.badge ?? undefined,
    badgeStyle: row.badge_style ?? undefined,
    desc: row.short_description,
    attrs: row.attributes,
    price: availableRow?.price_rupees ?? 0,
    size: availableRow?.size_label ?? "",
    primaryVariantId: availableRow?.id ?? "",
    // Derived from `images` (first item), not the raw column directly —
    // once a product has product_images rows, its card/thumbnail should
    // reflect the new first photo, not a stale image_url that's no longer
    // being kept in sync. images[0] === row.image_url for anything not
    // yet migrated to the multi-image system, so this changes nothing for
    // the rest of the catalog.
    image: images[0],
    images,
    gradient: row.gradient ?? undefined,
    inStock: row.is_instock && variants.some((v) => v.isInStock),
    tabCategories: row.tab_categories,
    description: row.description ?? "",
    descriptionBullets: row.description_bullets,
    detailAttrs: row.detail_attrs,
    usageBullets: row.usage_bullets,
    vegetarian: row.vegetarian,
    ingredients: row.ingredients,
    netQuantity: row.net_quantity,
    storage: row.storage,
    shelfLife: row.shelf_life,
    nutritionBasis: nutrition.basis ?? "",
    nutritionRows: nutrition.rows ?? [],
    variants,
    placeholderContent: row.placeholder_content || undefined,
    cartBadge: row.cart_badge,
    thumbGradient: row.thumb_gradient,
    thumbNameLines: row.thumb_name_lines,
    thumbNameSize: row.thumb_name_size,
  };
}

// Every product, including disabled ones — visibility filtering (e.g.
// hiding a fully-disabled product from the storefront) is the caller's
// job, since the admin Controls tab needs to see disabled items too.
export async function getAllProducts(supabase: SupabaseClient): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    // is_listed (0018_product_is_listed.sql) — a temporarily-hidden
    // product is excluded here entirely, not just shown disabled like
    // is_instock=false is; the admin Controls tab's own getAdminProductList
    // (lib/admin-data.ts) deliberately does NOT filter on this, since an
    // admin needs to see a hidden product to un-hide it again.
    .eq("is_listed", true)
    // Admin-controlled merchandising order (0016_product_sort_order.sql),
    // not creation order — see ProductsManager.tsx's reorder buttons.
    .order("sort_order");
  if (error) throw error;
  return ((data ?? []) as unknown as ProductRow[]).map(mapRowToProduct);
}

export async function getProductBySlug(
  supabase: SupabaseClient,
  slug: string
): Promise<Product | undefined> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    // Same is_listed rule as getAllProducts — a hidden product's direct
    // page URL 404s (via this returning undefined, see the [slug] page's
    // notFound() call) instead of staying reachable once it's off the grid.
    .eq("is_listed", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  return mapRowToProduct(data as unknown as ProductRow);
}

// Resolves a batch of cart-line ids (product_variants.id values) in a
// single query — every real call site (a cart) needs multiple ids at
// once, so this replaces the old one-id-at-a-time getVariantById.
export async function fetchVariantsByIds(
  supabase: SupabaseClient,
  ids: string[]
): Promise<VariantLookup> {
  const lookup: VariantLookup = new Map();
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return lookup;

  const { data, error } = await supabase
    .from("product_variants")
    .select(
      "id, size_label, price_rupees, unit_label, is_instock, stock_quantity, products ( id, name, image_url, cart_badge, thumb_gradient, thumb_name_lines, thumb_name_size, is_instock, product_images ( image_url, sort_order ) )"
    )
    .in("id", uniqueIds);
  if (error) throw error;

  type Row = {
    id: string;
    size_label: string;
    price_rupees: number;
    unit_label: string;
    is_instock: boolean;
    stock_quantity: number;
    products: {
      id: string;
      name: string;
      image_url: string | null;
      cart_badge: string;
      thumb_gradient: string;
      thumb_name_lines: string[];
      thumb_name_size: string;
      is_instock: boolean;
      product_images: ProductImageRow[];
    } | null;
  };

  for (const row of (data ?? []) as unknown as Row[]) {
    if (!row.products) continue;
    // Same first-of-images derivation as mapRowToProduct, so a cart/order
    // line's thumbnail matches whatever the product page is now showing
    // instead of a stale image_url.
    const productImages =
      row.products.product_images.length > 0
        ? [...row.products.product_images].sort((a, b) => a.sort_order - b.sort_order)
        : [];
    const image = productImages[0]?.image_url ?? row.products.image_url ?? undefined;
    lookup.set(row.id, {
      product: {
        id: row.products.id,
        name: row.products.name,
        image,
        cartBadge: row.products.cart_badge,
        thumbGradient: row.products.thumb_gradient,
        thumbNameLines: row.products.thumb_name_lines,
        thumbNameSize: row.products.thumb_name_size,
      },
      variant: {
        id: row.id,
        size: row.size_label,
        priceRupees: row.price_rupees,
        unitLabel: row.unit_label,
        // ANDed with the product's own master flag — see mapRowToProduct's
        // matching comment. This is the one that actually matters: without
        // it, computeCartPricing (lib/order-math.ts) would let an order go
        // through for a variant whose own is_instock/stock_quantity still
        // look fine even though the product itself was disabled, not just
        // a display glitch on the storefront.
        isInStock: row.products.is_instock && row.is_instock && row.stock_quantity > 0,
      },
    });
  }

  return lookup;
}
