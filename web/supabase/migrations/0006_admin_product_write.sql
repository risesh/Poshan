-- Admin write access for the catalog, same hardcoded-email-allowlist
-- pattern as 0003_admin_access.sql / 0004_admin_order_status_update.sql —
-- kept in sync with web/lib/admin.ts's ADMIN_EMAILS. No DELETE policy on
-- either table: the admin Controls tab only needs create + enable/disable
-- (see the plan), and order_items.product_variant_id has no `on delete`
-- clause specified against product_variants, so exposing delete here would
-- risk FK-violation errors against historical orders — better to leave
-- that pre-existing gap alone than paper over it with an admin delete path.
-- The corresponding app/api/admin/products/** routes narrow the actual
-- write surface further (e.g. only a small field whitelist per endpoint),
-- since RLS here is row-level, not column-level.

-- Lets the admin create new catalog entries from the Controls tab's
-- "Add product" form.
create policy "Admins can insert products"
  on products for insert
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com'));

-- Lets the admin toggle a product's is_instock master switch (and edit its
-- metadata fields) from the Controls tab.
create policy "Admins can update products"
  on products for update
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com'))
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com'));

-- Lets the admin add the initial (or later, additional) size/variant rows
-- for a product.
create policy "Admins can insert product variants"
  on product_variants for insert
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com'));

-- Lets the admin toggle a single variant's is_instock override and edit
-- stock_quantity — the per-variant inventory control the Controls tab's
-- product table exposes.
create policy "Admins can update product variants"
  on product_variants for update
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com'))
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com'));
