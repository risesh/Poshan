-- Lets the admin delete a promo code (active or expired) from the Controls
-- tab. Safe to allow: orders.discount_rupees is a plain rounded-rupee
-- snapshot (see 0001_init.sql), not a foreign key to promo_codes, so
-- deleting a promo code — even one used historically — never touches past
-- orders. promo_code_products rows for it are removed for free via its own
-- `on delete cascade` (0001_init.sql).
create policy "Admins can delete promo codes"
  on promo_codes for delete
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com'));
