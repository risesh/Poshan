import type { SupabaseClient } from "@supabase/supabase-js";

// Server-only data-fetching for /admin. Every query here relies on the
// admin-only RLS policies in supabase/migrations/0003_admin_access.sql —
// the Supabase client passed in must be a server client carrying the
// signed-in admin's session cookies, not the anon client.

type OrderRow = {
  id: string;
  order_number: string;
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

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfQuarter(d: Date) {
  const q = Math.floor(d.getMonth() / 3);
  return new Date(d.getFullYear(), q * 3, 1);
}
function startOfYear(d: Date) {
  return new Date(d.getFullYear(), 0, 1);
}

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
// three separate round trips.
export async function getRevenueSummary(supabase: SupabaseClient): Promise<RevenueSummary> {
  const now = new Date();
  const ytdOrders = await getOrdersSince(supabase, startOfYear(now));
  const monthStart = startOfMonth(now);
  const quarterStart = startOfQuarter(now);

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
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const orders = await getOrdersSince(supabase, since);

  const byDay = new Map<string, DailyRevenue>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, { date: key, revenueRupees: 0, orderCount: 0 });
  }
  for (const o of orders) {
    const bucket = byDay.get(o.created_at.slice(0, 10));
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
  order_number: string;
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

// `to` is treated as inclusive of the whole calendar day.
export async function getOrderList(supabase: SupabaseClient, from: Date, to: Date): Promise<AdminOrderDetail[]> {
  const inclusiveTo = new Date(to);
  inclusiveTo.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, created_at, order_status, payment_method, payment_status, subtotal_rupees, shipping_rupees, discount_rupees, total_rupees, " +
        "order_items(product_name_snapshot, variant_label_snapshot, quantity, line_total_rupees), " +
        "addresses(recipient_name, recipient_phone, line1, line2, city, state, postal_code, country), " +
        "profiles(name, email)"
    )
    .gte("created_at", from.toISOString())
    .lte("created_at", inclusiveTo.toISOString())
    .order("created_at", { ascending: false });
  if (error) throw error;

  type Row = Omit<AdminOrderDetail, "items" | "address" | "customer_name" | "customer_email"> & {
    order_items: AdminOrderDetail["items"];
    addresses: AdminOrderDetail["address"];
    profiles: { name: string | null; email: string } | null;
  };

  return ((data ?? []) as unknown as Row[]).map((o) => ({
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
};

// Unlike lib/products.ts's getAllProducts (storefront-shaped: folds
// is_instock + stock_quantity into a single computed `isInStock` per
// variant), the Controls tab needs the two raw fields separately so the
// admin can edit each independently.
export async function getAdminProductList(supabase: SupabaseClient): Promise<AdminProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, slug, name, category, is_instock, badge, badge_style, short_description, description, attributes, " +
        "gradient, image_url, tab_categories, description_bullets, detail_attrs, usage_bullets, vegetarian, " +
        "ingredients, net_quantity, storage, shelf_life, cart_badge, thumb_gradient, thumb_name_lines, thumb_name_size, " +
        "product_variants ( id, size_label, sku, price_rupees, stock_quantity, is_instock, unit_label, sort_order, nutrition )"
    )
    .order("created_at");
  if (error) throw error;

  type NutritionJson = { basis?: string; rows?: [string, string][] };
  type VariantRow = {
    id: string;
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
    product_variants: VariantRow[];
  };

  return ((data ?? []) as unknown as Row[]).map((row) => {
    const sortedVariants = [...row.product_variants].sort(
      (a, b) => a.sort_order - b.sort_order || a.size_label.localeCompare(b.size_label)
    );
    const nutrition = sortedVariants[0]?.nutrition ?? {};
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      category: row.category,
      isInStock: row.is_instock,
      variants: sortedVariants.map((v) => ({
        id: v.id,
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
    };
  });
}

export type AdminPromoCode = {
  id: string;
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
      "id, code, discount_type, discount_value, min_order_rupees, active, starts_at, expires_at, promo_code_products ( products ( id, name ) )"
    )
    .order("code");
  if (error) throw error;

  type Row = Omit<AdminPromoCode, "scopedProducts"> & {
    promo_code_products: { products: { id: string; name: string } | null }[];
  };

  return ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
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
