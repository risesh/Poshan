-- ============================================================
-- PROFILES — one row per signed-up user, extends Supabase's
-- built-in auth.users (which already holds id + email + hashed
-- password/OAuth identity — we don't duplicate the password,
-- just add app-specific fields Supabase doesn't have).
-- ============================================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,  -- same id as auth.users, e.g. '9c1f2a3e-...'
  email text not null,                    -- denormalized copy of auth.users.email, e.g. 'riya@example.com' — kept here too so you can query/join profiles without reaching into the auth schema
  name text,                              -- e.g. 'Riya Sharma', from the sign-up form or Google profile
  phone text,                             -- e.g. '+919876543210', optional until they add one at checkout
  date_of_birth date,                     -- e.g. '1996-03-14', from the optional "a little about you" step
  gender text,                            -- e.g. 'woman' | 'man' | 'non-binary' | 'prefer-not-to-say', optional, free text is fine at this scale
  created_at timestamptz not null default now()   -- e.g. '2026-07-08 10:15:00+05:30'
);

alter table profiles enable row level security;

create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Auto-create a profiles row whenever a new auth.users row appears
-- (e.g. right after Google OAuth sign-up), so app code never has to
-- remember to do it manually.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ADDRESSES — a user can save multiple delivery addresses.
-- Shaped to map onto Google Place Details API output: city/state/
-- postal_code correspond to Places' locality/administrative_area_
-- level_1/postal_code components; lat/lng to geometry.location.
-- Indian addresses often don't decompose cleanly into
-- street_number+route, so line1/line2 stay free-text and editable
-- rather than strictly parsed from components.
-- ============================================================
create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  label text not null default 'Home',      -- e.g. 'Home' | 'Work' | 'Other' — the pill shown next to the address
  recipient_name text not null,            -- e.g. 'Ananya Sharma' — who receives the delivery; may differ from the account holder
  recipient_phone text not null,           -- e.g. '+919876543210' — the delivery contact number, likewise may differ from the account owner's own number
  line1 text not null,                     -- e.g. '42, Ranjit Avenue' — usually pre-filled from Google's formatted_address, user-editable
  line2 text,                              -- e.g. 'Near Hall Bazaar, 2nd floor' — landmark/apartment detail, commonly needed for Indian delivery addresses
  city text not null,                      -- e.g. 'Amritsar' — Google's `locality` component
  state text not null,                     -- e.g. 'Punjab' — Google's `administrative_area_level_1` component
  postal_code text not null,               -- e.g. '143001' — Google's `postal_code` component
  country text not null default 'India',  -- e.g. 'India' — Google's `country` component
  lat numeric(9,6),                        -- e.g. 31.634200 — Google's geometry.location.lat; the pinned location, draggable by the user
  lng numeric(9,6),                        -- e.g. 74.872100 — geometry.location.lng
  formatted_address text,                  -- e.g. '42 Ranjit Ave, Amritsar, Punjab 143001, India' — raw Google-formatted string, kept as a display/fallback value
  google_place_id text,                    -- e.g. 'ChIJn6qP...' — lets you re-look-up the place later without re-geocoding
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

alter table addresses enable row level security;

create policy "Users can manage own addresses"
  on addresses for all using (auth.uid() = user_id);

-- ============================================================
-- PRODUCTS — one row per product family (e.g. "Kefir"). Sizes and
-- prices live on product_variants below, since one product can
-- come in more than one size.
-- ============================================================
create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,               -- e.g. 'kefir' — matches the current kefir.html filename convention
  name text not null,                      -- e.g. 'Kefir'
  category text not null,                  -- e.g. 'Probiotic' | 'Energy' — the small uppercase label above the product name
  badge text,                              -- e.g. 'Best Seller' | 'Seasonal' | 'New' | null — the colored pill on the product card
  description text,                        -- e.g. 'Kefir is a tart, fermented drink made by soaking "Kefir grains"...'
  attributes text[] not null default '{}', -- e.g. ARRAY['Fermented','A2 milk','Small batch'] — the DM-Mono pills on the product card
  is_instock boolean not null default true, -- e.g. true — whether this product is carried at all right now; day-to-day sold-out is tracked per variant below, this is more "still part of the catalog" than moment-to-moment stock
  created_at timestamptz not null default now()
);

alter table products enable row level security;

create policy "Products are publicly readable"
  on products for select using (true);

-- ============================================================
-- PRODUCT_VARIANTS — the actual sellable/priced thing (one size
-- of one product). Every cart line, order line, and price always
-- refers to a variant, never the parent product directly.
-- ============================================================
create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  size_label text not null,                -- e.g. '500 ml' | '1 L' | '250 g'
  sku text unique not null,                -- e.g. 'KEFIR-500ML' — internal stock-keeping code
  price_rupees integer not null,           -- e.g. 240 — whole rupees only, no paise anywhere on the site or in storage
  stock_quantity integer not null default 0, -- e.g. 42 — units currently available; 0 means sold out
  is_instock boolean not null default true, -- e.g. true — manual override to hide this variant even if stock_quantity > 0 (e.g. paused for a quality check); ordinary day-to-day "sold out" should just be stock_quantity = 0
  nutrition jsonb not null default '{}',   -- e.g. {"basis":"per 100 ml","energy_kcal":62,"protein_g":3.3,"fat_g":3.5,"carbohydrate_g":4.2,"calcium_mg":115} — field set varies per product (Laddoo uses iron_mg, Pickle uses sodium_mg instead of calcium_mg); jsonb avoids a rigid nutrient-column table for ~5 rows per product
  unique (product_id, size_label)
);

alter table product_variants enable row level security;

create policy "Product variants are publicly readable"
  on product_variants for select using (true);

-- ============================================================
-- PROMO_CODES + product scoping.
-- ============================================================
create table promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                -- e.g. 'WELCOME10'
  discount_type text not null check (discount_type in ('flat','percent')),  -- e.g. 'flat' or 'percent'
  discount_value integer not null,          -- e.g. 40 — means ₹40 off if discount_type='flat', or 10% off if discount_type='percent'; whole rupees / whole percent, no paise
  min_order_rupees integer not null default 0,  -- e.g. 500 — promo only applies if subtotal is at least this much
  active boolean not null default true,
  expires_at timestamptz                    -- e.g. '2026-12-31 23:59:59+05:30'; null = never expires
);

-- Which products a promo applies to. No rows for a given promo_code_id
-- means "applies to every product" — the simplest default, and avoids
-- having to backfill every existing site-wide promo with one row per product.
create table promo_code_products (
  promo_code_id uuid not null references promo_codes(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  primary key (promo_code_id, product_id)
);

alter table promo_codes enable row level security;
alter table promo_code_products enable row level security;

create policy "Active promo codes are publicly readable"
  on promo_codes for select using (active);
create policy "Promo code product scoping is publicly readable"
  on promo_code_products for select using (true);

-- ============================================================
-- CARTS / CART_ITEMS — server-side cart, replacing localStorage.
-- ============================================================
create table carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,  -- e.g. null for a guest cart not yet tied to an account, populated after sign-in
  created_at timestamptz not null default now()
);

create table cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts(id) on delete cascade,
  product_variant_id uuid not null references product_variants(id),
  quantity integer not null check (quantity > 0),  -- e.g. 2
  unique (cart_id, product_variant_id)
);

alter table carts enable row level security;
alter table cart_items enable row level security;

create policy "Users can manage own cart"
  on carts for all using (auth.uid() = user_id);
create policy "Users can manage own cart items"
  on cart_items for all using (
    exists (select 1 from carts where carts.id = cart_items.cart_id and carts.user_id = auth.uid())
  );

-- ============================================================
-- ORDERS / ORDER_ITEMS
--
-- IMPORTANT — when a row gets created: an `orders` row is only ever
-- inserted once there's a real order — i.e. the customer chose COD, or
-- an online payment actually succeeded. A failed/abandoned online
-- payment attempt never produces a row here at all (Razorpay's own
-- dashboard is the record of attempts; this table is the record of
-- orders). That's why payment_status below has no 'failed' value —
-- by the time a row exists, the payment already succeeded or wasn't
-- required yet (COD).
-- ============================================================
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,        -- e.g. 'PSN-24817' — sequence-generated, shown to the customer on the order confirmation page
  user_id uuid not null references profiles(id),
  address_id uuid not null references addresses(id),
  order_status text not null default 'pending'
    check (order_status in ('pending','shipped','delivered','cancelled')),  -- e.g. 'pending' — fulfillment status; more granular states (packed, out-for-delivery) can be added later once that level of tracking actually exists in your process
  payment_method text not null
    check (payment_method in ('upi','card','netbanking','cod')),  -- e.g. 'upi' | 'cod' — how the customer is paying
  payment_status text not null default 'pending'
    check (payment_status in ('pending','paid','refunded')),  -- e.g. 'paid' — set immediately for a successful online payment (the row is created *at* that moment); 'pending' — a COD order, cash not yet collected; 'refunded' — a later cancellation/return on an order that had been paid. No 'failed': see note above
  subtotal_rupees integer not null,         -- e.g. 490 — sum of order_items line totals
  shipping_rupees integer not null,         -- e.g. 40
  discount_rupees integer not null default 0,  -- e.g. 30 — already rounded to the nearest rupee if it came from a percent-based promo
  total_rupees integer not null,            -- e.g. 500 — subtotal + shipping - discount, already rounded; this exact number is what's shown at checkout AND stored here, never recomputed separately for the confirmation page
  payment_provider text default 'razorpay', -- e.g. 'razorpay'; null/ignored when payment_method='cod'
  payment_id text,                          -- e.g. 'pay_...' — Razorpay's payment id, for webhook reconciliation; null for COD
  estimated_delivery date,                  -- e.g. '2026-07-09'
  created_at timestamptz not null default now()  -- e.g. '2026-07-07 14:03:00+05:30' — the "order date" shown on the confirmation page
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_variant_id uuid references product_variants(id),  -- nullable: kept even if the variant is later deleted; snapshots below still hold the historical truth
  product_name_snapshot text not null,      -- e.g. 'Kefir' — copied at order time so a later product rename doesn't rewrite history
  variant_label_snapshot text not null,     -- e.g. '500 ml'
  unit_price_rupees_snapshot integer not null,  -- e.g. 240 — the price actually paid, independent of today's live price
  quantity integer not null,                -- e.g. 1
  line_total_rupees integer not null        -- e.g. 240 — unit_price_rupees_snapshot * quantity
);

alter table orders enable row level security;
alter table order_items enable row level security;

create policy "Users can view own orders"
  on orders for select using (auth.uid() = user_id);
create policy "Users can insert own orders"
  on orders for insert with check (auth.uid() = user_id);
create policy "Users can view own order items"
  on order_items for select using (
    exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
  );
create policy "Users can insert own order items"
  on order_items for insert with check (
    exists (select 1 from orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
  );
