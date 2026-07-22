-- Extends products/product_variants with every field the storefront
-- components (ProductCard, ProductHero, ProductPanel) actually consume but
-- 0001_init.sql didn't yet capture — lib/products.ts's Product/Variant TS
-- shape was the source of truth for the app until now (see web/CLAUDE.md's
-- "Data layer" note); this migration is what lets that array be retired in
-- favor of a real Supabase-backed catalog. Typed columns for scalars/flat
-- lists, matching the existing `attributes text[]` precedent — jsonb stays
-- reserved for genuinely heterogeneous data (product_variants.nutrition,
-- unchanged here), not used for anything new below.

alter table products
  -- e.g. 'A tart, fermented probiotic drink' — the short blurb shown on the
  -- product listing card; distinct from `description`, which is the longer
  -- detail-page intro sentence.
  add column short_description text not null default '',

  -- e.g. 'amla' | 'turmeric' | null — the color-swatch fallback shown
  -- instead of a photo when `image_url` is null; the two values are the
  -- only swatches currently designed.
  add column gradient text check (gradient is null or gradient in ('amla', 'turmeric')),

  -- e.g. 'dark' | 'light' | null — which text color the badge pill on the
  -- product card needs for contrast, since badge background color varies
  -- by product.
  add column badge_style text check (badge_style is null or badge_style in ('dark', 'light')),

  -- e.g. 'https://.../kefir.jpg' — hosted product photo; null falls back
  -- to `gradient`. Plain URL, not a file upload — no Supabase Storage
  -- bucket exists in this repo yet.
  add column image_url text,

  -- e.g. ARRAY['best-sellers','probiotics'] — which homepage filter tabs
  -- this product appears under; values must match ProductsSection.tsx's
  -- known tab set.
  add column tab_categories text[] not null default '{}',

  -- e.g. ARRAY['30+ strains of bacteria & yeast v/s approx. 5 in Curd'] —
  -- bullet list rendered under the long description on the product detail
  -- page.
  add column description_bullets text[] not null default '{}',

  -- e.g. ARRAY['A2 milk','Made fresh for every order'] — attribute chips
  -- shown on the detail page hero (distinct from `attributes`, which is
  -- the card-listing version of this).
  add column detail_attrs text[] not null default '{}',

  -- e.g. ARRAY['Start slow, take 1-2 spoons per day...'] — "how to use"
  -- bullets on the detail page.
  add column usage_bullets text[] not null default '{}',

  -- e.g. true — whether the veg/non-veg mark shown on the detail page is
  -- vegetarian.
  add column vegetarian boolean not null default true,

  -- e.g. 'Pasteurised A2 cow milk, live kefir cultures...' — the
  -- ingredients line on the detail page's product panel.
  add column ingredients text not null default '',

  -- e.g. '500 ml' — the "net quantity" fact shown in the product panel.
  add column net_quantity text not null default '',

  -- e.g. 'Refrigerate below 4°C' — the storage instructions fact in the
  -- product panel.
  add column storage text not null default '',

  -- e.g. '3-5 days from packing, if kept refrigerated' — the shelf-life
  -- fact in the product panel.
  add column shelf_life text not null default '',

  -- e.g. 'Probiotic · Best seller' — short label shown on the cart-page
  -- line-item thumbnail (the cart has no real photos, just a gradient
  -- swatch + text, per the existing cart design).
  add column cart_badge text not null default '',

  -- e.g. 'linear-gradient(135deg,#1E3A34 0%,#4A9B8E 100%)' — the CSS
  -- gradient used for that cart-thumbnail swatch.
  add column thumb_gradient text not null default '',

  -- e.g. ARRAY['Kefir'] or ARRAY['Punjabi Mango','Pickle'] — the 1-2 lines
  -- of text overlaid on the cart thumbnail.
  add column thumb_name_lines text[] not null default '{}',

  -- e.g. '18px' | '14px' — font size for the cart-thumbnail text, since
  -- longer product names need a smaller size to fit the fixed thumbnail
  -- box.
  add column thumb_name_size text not null default '14px',

  -- e.g. false — true marks a product's descriptive content (ingredients,
  -- nutrition, bullets) as prototype placeholder text rather than
  -- launch-ready copy, matching the existing HTML-comment convention on
  -- the 3 non-Kefir product pages (see repo-root CLAUDE.md's "Placeholder
  -- content" note) — now a real flag instead of a source-file comment.
  add column placeholder_content boolean not null default false;

alter table product_variants
  -- e.g. '/ 500 ml jar' — the unit suffix shown next to the price on the
  -- detail page.
  add column unit_label text not null default '',

  -- e.g. 0 — display order among a product's variants, and which variant
  -- is "primary" for the card's displayed price/size and for deriving
  -- product-level nutrition display; size_label ('500 ml' vs '1 L')
  -- doesn't sort meaningfully on its own.
  add column sort_order integer not null default 0;

-- product_variants.nutrition jsonb already exists (0001_init.sql) — no new
-- column. This migration just formalizes its stored shape going forward as
-- {"basis": "per 100 ml", "rows": [["Energy","62 kcal"], ["Protein","3.3 g"], ...]},
-- an ordered pair array matching Product.nutritionRows exactly, superseding
-- the flat-key shape shown in 0001_init.sql's original comment. Enforced
-- in application code (lib/products.ts), not a DB constraint.
