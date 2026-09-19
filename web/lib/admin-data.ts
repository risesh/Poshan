import type { SupabaseClient } from "@supabase/supabase-js";
import { istStartOfMonth, istStartOfQuarter, istStartOfYear, istDateString, istDayStart } from "./order-math";

// Server-only data-fetching for /admin. Every query here relies on the
// admin-only RLS policies in supabase/migrations/0003_admin_access.sql —
// the Supabase client passed in must be a server client carrying the
// signed-in admin's session cookies, not the anon client.

type OrderRow = {
  id: string;
  order_number: number;
  created_at: string;
  total_rupees: number;
  order_status: string;
  payment_method: string;
  payment_status: string;
};

// "Revenue" here means the recorded total of every non-cancelled order —
// including COD orders not yet collected — since this is a sales
// dashboard, not a cash ledger. Paid-vs-pending is visible separately via
// the payment method/status chart, rather than folded into what "revenue"
// means.
const CANCELLED = "cancelled";

async function getOrdersSince(supabase: SupabaseClient, since: Date): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, created_at, total_rupees, order_status, payment_method, payment_status")
    .neq("order_status", CANCELLED)
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OrderRow[];
}

export type PeriodSummary = { revenueRupees: number; orderCount: number };
export type RevenueSummary = { mtd: PeriodSummary; qtd: PeriodSummary; ytd: PeriodSummary };

// YTD's window is a superset of MTD/QTD, so one query (the widest range)
// covers all three — sliced client-side by boundary instead of firing
// three separate round trips. istStartOf*/istDateString (lib/order-math.ts)
// anchor every boundary here to India's calendar, not the server
// process's own timezone — see their own comments for why that matters.
export async function getRevenueSummary(supabase: SupabaseClient): Promise<RevenueSummary> {
  const now = new Date();
  const ytdOrders = await getOrdersSince(supabase, istStartOfYear(now));
  const monthStart = istStartOfMonth(now);
  const quarterStart = istStartOfQuarter(now);

  const summarize = (orders: OrderRow[]): PeriodSummary => ({
    revenueRupees: orders.reduce((sum, o) => sum + o.total_rupees, 0),
    orderCount: orders.length,
  });

  return {
    mtd: summarize(ytdOrders.filter((o) => new Date(o.created_at) >= monthStart)),
    qtd: summarize(ytdOrders.filter((o) => new Date(o.created_at) >= quarterStart)),
    ytd: summarize(ytdOrders),
  };
}

export type SkuRevenue = { label: string; revenueRupees: number; quantity: number };

type OrderItemWithOrder = {
  product_name_snapshot: string;
  variant_label_snapshot: string;
  quantity: number;
  line_total_rupees: number;
};

export async function getRevenueBySku(supabase: SupabaseClient, since: Date): Promise<SkuRevenue[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select(
      "product_name_snapshot, variant_label_snapshot, quantity, line_total_rupees, orders!inner(created_at, order_status)"
    )
    .gte("orders.created_at", since.toISOString())
    .neq("orders.order_status", CANCELLED);
  if (error) throw error;

  const bySku = new Map<string, SkuRevenue>();
  for (const row of (data ?? []) as OrderItemWithOrder[]) {
    const label = `${row.product_name_snapshot} (${row.variant_label_snapshot})`;
    const existing = bySku.get(label) ?? { label, revenueRupees: 0, quantity: 0 };
    existing.revenueRupees += row.line_total_rupees;
    existing.quantity += row.quantity;
    bySku.set(label, existing);
  }
  return [...bySku.values()].sort((a, b) => b.revenueRupees - a.revenueRupees);
}

export type DailyRevenue = { date: string; revenueRupees: number; orderCount: number };

// Fixed-width trailing window (defaults to 30 days) with every day present
// even at ₹0 — a chart with gaps on slow days reads as broken data, not as
// "no sales that day".
export async function getDailyRevenueTrend(supabase: SupabaseClient, days = 30): Promise<DailyRevenue[]> {
  // IST midnight of today, walked back (days - 1) days via UTC date
  // arithmetic on that already-correct instant (safe — no DST in UTC or
  // IST to reinterpret it against), not Date#setDate/setHours, which
  // would apply the server process's own local calendar instead.
  const since = istDayStart(istDateString());
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const orders = await getOrdersSince(supabase, since);

  const byDay = new Map<string, DailyRevenue>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setUTCDate(d.getUTCDate() + i);
    const key = istDateString(d);
    byDay.set(key, { date: key, revenueRupees: 0, orderCount: 0 });
  }
  for (const o of orders) {
    // istDateString, not a raw slice of the timestamp string — that was
    // bucketing by the UTC calendar day, which for an order placed late at
    // night IST can be the wrong day from an India-based admin's view.
    const bucket = byDay.get(istDateString(new Date(o.created_at)));
    if (bucket) {
      bucket.revenueRupees += o.total_rupees;
      bucket.orderCount += 1;
    }
  }
  return [...byDay.values()];
}

export type PaymentBreakdown = { method: string; revenueRupees: number; orderCount: number };

export async function getPaymentMethodBreakdown(supabase: SupabaseClient, since: Date): Promise<PaymentBreakdown[]> {
  const orders = await getOrdersSince(supabase, since);
  const byMethod = new Map<string, PaymentBreakdown>();
  for (const o of orders) {
    const existing = byMethod.get(o.payment_method) ?? { method: o.payment_method, revenueRupees: 0, orderCount: 0 };
    existing.revenueRupees += o.total_rupees;
    existing.orderCount += 1;
    byMethod.set(o.payment_method, existing);
  }
  return [...byMethod.values()];
}

export type StatusBreakdown = { status: string; orderCount: number };

// Deliberately not filtered to exclude cancelled orders (unlike every
// other function here) — this chart's whole point is to show cancellation
// rate alongside the rest of the fulfillment pipeline.
export async function getOrderStatusBreakdown(supabase: SupabaseClient, since: Date): Promise<StatusBreakdown[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("order_status")
    .gte("created_at", since.toISOString());
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as { order_status: string }[]) {
    counts.set(row.order_status, (counts.get(row.order_status) ?? 0) + 1);
  }
  return [...counts.entries()].map(([status, orderCount]) => ({ status, orderCount }));
}

export type AdminOrderDetail = {
  id: string;
  order_number: number;
  created_at: string;
  order_status: string;
  payment_method: string;
  payment_status: string;
  subtotal_rupees: number;
  shipping_rupees: number;
  discount_rupees: number;
  total_rupees: number;
  customer_name: string | null;
  customer_email: string;
  items: { product_name_snapshot: string; variant_label_snapshot: string; quantity: number; line_total_rupees: number }[];
  address: {
    recipient_name: string;
    recipient_phone: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  } | null;
};

const digitsOnly = (s: string) => s.replace(/\D/g, "");

// `from`/`to` must already be exact instants — the caller's job (see
// lib/order-math.ts's istDayStart/istDayEnd), not this function's. An
// earlier version took calendar-day Dates and called `to.setHours(23, 59,
// 59, 999)` here to make `to` inclusive, but Date#setHours mutates using
// the server process's own local timezone — on a host not running in UTC
// (e.g. a dev machine set to IST), that silently moved the cutoff hours
// away from the caller's intended day and made orders placed near the
// server's local midnight disappear from "today". Resolving both ends to
// real instants before they ever reach this function removes that whole
// class of bug instead of just relocating it.
//
// `search` matches against order number, customer name/email, and the
// delivery contact's phone — addresses.recipient_phone, not profiles.phone.
// profiles.phone is never actually written anywhere in the app (only
// date_of_birth/gender get saved post-signup in AuthPanel.tsx; checkout
// only ever writes phone onto the address row, see CheckoutBody.tsx), so
// it's always null in practice — recipient_phone is the only phone number
// that's ever really populated. Applied in JS after the fetch rather than
// as a Postgrest filter: an OR across orders' own column and two joined
// tables' columns isn't expressible in one Postgrest query, and the admin
// dashboard's per-range order volume is small enough that this costs
// nothing real.
export async function getOrderList(
  supabase: SupabaseClient,
  from: Date,
  to: Date,
  search?: string
): Promise<AdminOrderDetail[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, created_at, order_status, payment_method, payment_status, subtotal_rupees, shipping_rupees, discount_rupees, total_rupees, " +
        "order_items(product_name_snapshot, variant_label_snapshot, quantity, line_total_rupees), " +
        "addresses(recipient_name, recipient_phone, line1, line2, city, state, postal_code, country), " +
        "profiles(name, email)"
    )
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .order("created_at", { ascending: false });
  if (error) throw error;

  type Row = Omit<AdminOrderDetail, "items" | "address" | "customer_name" | "customer_email"> & {
    order_items: AdminOrderDetail["items"];
    addresses: AdminOrderDetail["address"];
    profiles: { name: string | null; email: string } | null;
  };

  let rows = (data ?? []) as unknown as Row[];

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    const q = trimmedSearch.toLowerCase();
    const qDigits = digitsOnly(trimmedSearch);
    rows = rows.filter((o) => {
      if (qDigits && String(o.order_number).includes(qDigits)) return true;
      if (o.profiles?.name?.toLowerCase().includes(q)) return true;
      if (o.profiles?.email.toLowerCase().includes(q)) return true;
      if (qDigits && digitsOnly(o.addresses?.recipient_phone ?? "").includes(qDigits)) return true;
      return false;
    });
  }

  return rows.map((o) => ({
    id: o.id,
    order_number: o.order_number,
    created_at: o.created_at,
    order_status: o.order_status,
    payment_method: o.payment_method,
    payment_status: o.payment_status,
    subtotal_rupees: o.subtotal_rupees,
    shipping_rupees: o.shipping_rupees,
    discount_rupees: o.discount_rupees,
    total_rupees: o.total_rupees,
    customer_name: o.profiles?.name ?? null,
    customer_email: o.profiles?.email ?? "",
    items: o.order_items ?? [],
    address: o.addresses ?? null,
  }));
}

export type AdminProductVariant = {
  id: string;
  // Human-readable 1xxxxx identifier (0017_item_and_promo_ids.sql) — shown
  // in the admin UI instead of `id`, which stays the real uuid used
  // everywhere else (cart lines, order lines, RLS).
  itemId: number;
  sizeLabel: string;
  sku: string;
  priceRupees: number;
  stockQuantity: number;
  isInStock: boolean; // raw admin override, not computed against stockQuantity
  unitLabel: string;
};

export type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  isInStock: boolean; // raw products.is_instock master toggle
  // is_listed (0018_product_is_listed.sql) — whether this product appears
  // on the storefront at all, distinct from isInStock (which keeps it
  // visible but shows it as unpurchasable). Deliberately NOT filtered out
  // of this admin list when false, unlike lib/products.ts's getAllProducts —
  // an admin needs to see a hidden product to un-hide it.
  isListed: boolean;
  variants: AdminProductVariant[];
  // Full descriptive fields — the list view only used the fields above,
  // but editing a product needs everything NewProductForm's create path
  // already collects, so the edit form can be pre-filled from this same
  // object rather than a second, edit-specific fetch.
  badge: string | null;
  badgeStyle: "dark" | "light" | null;
  shortDescription: string;
  description: string;
  attributes: string[];
  gradient: "amla" | "turmeric" | null;
  imageUrl: string | null;
  tabCategories: string[];
  descriptionBullets: string[];
  detailAttrs: string[];
  usageBullets: string[];
  vegetarian: boolean;
  ingredients: string;
  netQuantity: string;
  storage: string;
  shelfLife: string;
  cartBadge: string;
  thumbGradient: string;
  thumbNameLines: string[];
  thumbNameSize: string;
  // Stored per-variant in the DB (see 0005_product_catalog_fields.sql's
  // migration note) but only ever populated on the primary (sort_order 0)
  // variant — surfaced at the product level here to match how the create
  // form and the storefront (lib/products.ts's mapRowToProduct) both treat
  // it as one product-level fact, not a per-size one.
  nutritionBasis: string;
  nutritionRows: [string, string][];
  // Ordered product_images rows (0014_product_images.sql) — the storefront
  // carousel this feeds is built from the same table, sorted the same way
  // (see lib/products.ts's mapRowToProduct). Empty for a product that only
  // has the legacy imageUrl above and was never given additional photos.
  productImages: { id: string; imageUrl: string; sortOrder: number }[];
  // The storefront listing order (0016_product_sort_order.sql) — surfaced
  // here so ProductsManager.tsx's reorder buttons have something to swap.
  sortOrder: number;
};

// Unlike lib/products.ts's getAllProducts (storefront-shaped: folds
// is_instock + stock_quantity into a single computed `isInStock` per
// variant), the Controls tab needs the two raw fields separately so the
// admin can edit each independently.
export async function getAdminProductList(supabase: SupabaseClient): Promise<AdminProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, category, is_instock, is_listed, badge, badge_style, short_description, description, attributes, " +
        "gradient, image_url, tab_categories, description_bullets, detail_attrs, usage_bullets, vegetarian, " +
        "ingredients, net_quantity, storage, shelf_life, cart_badge, thumb_gradient, thumb_name_lines, thumb_name_size, " +
        "sort_order, " +
        "product_variants ( id, item_id, size_label, sku, price_rupees, stock_quantity, is_instock, unit_label, sort_order, nutrition ), " +
        "product_images ( id, image_url, sort_order )"
    )
    .order("sort_order");
  if (error) throw error;

  type NutritionJson = { basis?: string; rows?: [string, string][] };
  type VariantRow = {
    id: string;
    item_id: number;
    size_label: string;
    sku: string;
    price_rupees: number;
    stock_quantity: number;
    is_instock: boolean;
    unit_label: string;
    sort_order: number;
    nutrition: NutritionJson | null;
  };
  type Row = {
    id: string;
    slug: string;
    name: string;
    category: string;
    is_instock: boolean;
    is_listed: boolean;
    badge: string | null;
    badge_style: "dark" | "light" | null;
    short_description: string;
    description: string | null;
    attributes: string[];
    gradient: "amla" | "turmeric" | null;
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
    sort_order: number;
    product_variants: VariantRow[];
    product_images: { id: string; image_url: string; sort_order: number }[];
  };

  return ((data ?? []) as unknown as Row[]).map((row) => {
    const sortedVariants = [...row.product_variants].sort(
      (a, b) => a.sort_order - b.sort_order || a.size_label.localeCompare(b.size_label)
    );
    const nutrition = sortedVariants[0]?.nutrition ?? {};
    const sortedImages = [...row.product_images].sort((a, b) => a.sort_order - b.sort_order);
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      category: row.category,
      isInStock: row.is_instock,
      isListed: row.is_listed,
      variants: sortedVariants.map((v) => ({
        id: v.id,
        itemId: v.item_id,
        sizeLabel: v.size_label,
        sku: v.sku,
        priceRupees: v.price_rupees,
        stockQuantity: v.stock_quantity,
        isInStock: v.is_instock,
        unitLabel: v.unit_label,
      })),
      badge: row.badge,
      badgeStyle: row.badge_style,
      shortDescription: row.short_description,
      description: row.description ?? "",
      attributes: row.attributes,
      gradient: row.gradient,
      imageUrl: row.image_url,
      tabCategories: row.tab_categories,
      descriptionBullets: row.description_bullets,
      detailAttrs: row.detail_attrs,
      usageBullets: row.usage_bullets,
      vegetarian: row.vegetarian,
      ingredients: row.ingredients,
      netQuantity: row.net_quantity,
      storage: row.storage,
      shelfLife: row.shelf_life,
      cartBadge: row.cart_badge,
      thumbGradient: row.thumb_gradient,
      thumbNameLines: row.thumb_name_lines,
      thumbNameSize: row.thumb_name_size,
      nutritionBasis: nutrition.basis ?? "",
      nutritionRows: nutrition.rows ?? [],
      productImages: sortedImages.map((img) => ({
        id: img.id,
        imageUrl: img.image_url,
        sortOrder: img.sort_order,
      })),
      sortOrder: row.sort_order,
    };
  });
}

export type AdminPromoCode = {
  id: string;
  // Human-readable 2xxxxx identifier (0017_item_and_promo_ids.sql),
  // snake_case to match this type's existing field-naming convention
  // (unlike AdminProductVariant's camelCase itemId).
  promo_id: number;
  code: string;
  discount_type: "flat" | "percent";
  discount_value: number;
  min_order_rupees: number;
  active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  scopedProducts: { id: string; name: string }[];
};

// Unlike lib/promo.ts's listActivePromoCodes (which filters to currently-
// active, in-window codes for the customer-facing picker), this returns
// every promo code regardless of state — the Controls tab needs to show
// and re-enable disabled/expired ones too, not just what's live right now.
export async function getAdminPromoCodeList(supabase: SupabaseClient): Promise<AdminPromoCode[]> {
  const { data, error } = await supabase
    .from("promo_codes")
    .select(
      "id, promo_id, code, discount_type, discount_value, min_order_rupees, active, starts_at, expires_at, promo_code_products ( products ( id, name ) )"
    )
    .order("code");
  if (error) throw error;

  type Row = Omit<AdminPromoCode, "scopedProducts"> & {
    promo_code_products: { products: { id: string; name: string } | null }[];
  };

  return ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    promo_id: row.promo_id,
    code: row.code,
    discount_type: row.discount_type,
    discount_value: row.discount_value,
    min_order_rupees: row.min_order_rupees,
    active: row.active,
    starts_at: row.starts_at,
    expires_at: row.expires_at,
    scopedProducts: row.promo_code_products
      .map((r) => r.products)
      .filter((p): p is { id: string; name: string } => !!p),
  }));
}
