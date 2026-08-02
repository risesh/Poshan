-- Adds a standing test-admin account (test-admin@poshan.test — credentials
-- in web/.env.local as TEST_ADMIN_EMAIL/TEST_ADMIN_PASSWORD) to every admin
-- RLS policy defined across prior migrations, with the same access real
-- admins have, so future testing (screenshots, manual QA, agent-driven
-- browser tests) has a real admin session to use without needing either
-- real admin's actual credentials. lib/admin.ts's ADMIN_EMAILS is kept in
-- sync with this list, same requirement 0003_admin_access.sql documents.
-- Each block below is a straight drop+recreate of an existing policy,
-- widening its email allowlist by one — the underlying rule (table,
-- action, using/with check shape) is unchanged from whichever migration
-- first defined it.

-- From 0003_admin_access.sql
drop policy "Admins can view all orders" on orders;
create policy "Admins can view all orders"
  on orders for select
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test'));

drop policy "Admins can view all order items" on order_items;
create policy "Admins can view all order items"
  on order_items for select
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test'));

drop policy "Admins can view all addresses" on addresses;
create policy "Admins can view all addresses"
  on addresses for select
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test'));

drop policy "Admins can view all profiles" on profiles;
create policy "Admins can view all profiles"
  on profiles for select
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test'));

-- From 0004_admin_order_status_update.sql
drop policy "Admins can update order status" on orders;
create policy "Admins can update order status"
  on orders for update
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test'))
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test'));

-- From 0006_admin_product_write.sql
drop policy "Admins can insert products" on products;
create policy "Admins can insert products"
  on products for insert
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test'));

drop policy "Admins can update products" on products;
create policy "Admins can update products"
  on products for update
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test'))
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test'));

drop policy "Admins can insert product variants" on product_variants;
create policy "Admins can insert product variants"
  on product_variants for insert
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test'));

drop policy "Admins can update product variants" on product_variants;
create policy "Admins can update product variants"
  on product_variants for update
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test'))
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test'));

-- From 0008_admin_promo_write.sql
drop policy "Admins can insert promo codes" on promo_codes;
create policy "Admins can insert promo codes"
  on promo_codes for insert
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test'));

drop policy "Admins can update promo codes" on promo_codes;
create policy "Admins can update promo codes"
  on promo_codes for update
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test'))
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test'));

drop policy "Admins can manage promo code product scoping" on promo_code_products;
create policy "Admins can manage promo code product scoping"
  on promo_code_products for all
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test'))
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test'));

-- From 0009_admin_promo_delete.sql
drop policy "Admins can delete promo codes" on promo_codes;
create policy "Admins can delete promo codes"
  on promo_codes for delete
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test'));

-- From 0010_admin_product_delete.sql
drop policy "Admins can delete products" on products;
create policy "Admins can delete products"
  on products for delete
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test'));
