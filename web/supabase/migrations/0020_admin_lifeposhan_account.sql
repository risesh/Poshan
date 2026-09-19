-- Adds lifeposhan@gmail.com (the operational admin inbox — see
-- lib/admin.ts's ORDER_NOTIFICATION_EMAILS) to every admin RLS policy
-- defined across prior migrations, with the same access the other real
-- admins have. lib/admin.ts's ADMIN_EMAILS is kept in sync with this list,
-- same requirement 0003_admin_access.sql documents. Each block below is a
-- straight drop+recreate of an existing policy, widening its email
-- allowlist by one — same mechanism 0012_test_admin_account.sql used to
-- add the test account — the underlying rule (table, action, using/with
-- check shape) is unchanged from whichever migration first defined it.

-- From 0003_admin_access.sql
drop policy "Admins can view all orders" on orders;
create policy "Admins can view all orders"
  on orders for select
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test'));

drop policy "Admins can view all order items" on order_items;
create policy "Admins can view all order items"
  on order_items for select
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test'));

drop policy "Admins can view all addresses" on addresses;
create policy "Admins can view all addresses"
  on addresses for select
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test'));

drop policy "Admins can view all profiles" on profiles;
create policy "Admins can view all profiles"
  on profiles for select
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test'));

-- From 0004_admin_order_status_update.sql
drop policy "Admins can update order status" on orders;
create policy "Admins can update order status"
  on orders for update
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test'))
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test'));

-- From 0006_admin_product_write.sql
drop policy "Admins can insert products" on products;
create policy "Admins can insert products"
  on products for insert
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test'));

drop policy "Admins can update products" on products;
create policy "Admins can update products"
  on products for update
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test'))
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test'));

drop policy "Admins can insert product variants" on product_variants;
create policy "Admins can insert product variants"
  on product_variants for insert
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test'));

drop policy "Admins can update product variants" on product_variants;
create policy "Admins can update product variants"
  on product_variants for update
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test'))
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test'));

-- From 0008_admin_promo_write.sql
drop policy "Admins can insert promo codes" on promo_codes;
create policy "Admins can insert promo codes"
  on promo_codes for insert
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test'));

drop policy "Admins can update promo codes" on promo_codes;
create policy "Admins can update promo codes"
  on promo_codes for update
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test'))
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test'));

drop policy "Admins can manage promo code product scoping" on promo_code_products;
create policy "Admins can manage promo code product scoping"
  on promo_code_products for all
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test'))
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test'));

-- From 0009_admin_promo_delete.sql
drop policy "Admins can delete promo codes" on promo_codes;
create policy "Admins can delete promo codes"
  on promo_codes for delete
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test'));

-- From 0010_admin_product_delete.sql
drop policy "Admins can delete products" on products;
create policy "Admins can delete products"
  on products for delete
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test'));

-- From 0014_product_images.sql
drop policy "Admins can insert product images" on product_images;
create policy "Admins can insert product images"
  on product_images for insert
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test'));

drop policy "Admins can update product images" on product_images;
create policy "Admins can update product images"
  on product_images for update
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test'))
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test'));

drop policy "Admins can delete product images" on product_images;
create policy "Admins can delete product images"
  on product_images for delete
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test'));

drop policy "Admins can upload product image files" on storage.objects;
create policy "Admins can upload product image files"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test')
  );

drop policy "Admins can update product image files" on storage.objects;
create policy "Admins can update product image files"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test')
  );

drop policy "Admins can delete product image files" on storage.objects;
create policy "Admins can delete product image files"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'lifeposhan@gmail.com', 'test-admin@poshan.test')
  );
