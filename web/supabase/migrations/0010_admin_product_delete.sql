-- Lets the admin delete a product from the Controls tab. Unlike promo
-- codes, this is NOT unconditionally safe: product_variants.product_id has
-- `on delete cascade` (0001_init.sql), so deleting a product also deletes
-- its variants — but order_items.product_variant_id references
-- product_variants with no cascade rule (defaults to RESTRICT), so the
-- cascade will fail with a foreign-key violation if any variant has ever
-- been ordered. That's intentional: it's the DB refusing to silently
-- orphan historical order data, not a bug. The admin API route
-- (app/api/admin/products/[id]/route.ts) catches that specific error and
-- tells the admin to disable the product instead — this policy just makes
-- the attempt possible for products that were never actually sold.
create policy "Admins can delete products"
  on products for delete
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com'));
