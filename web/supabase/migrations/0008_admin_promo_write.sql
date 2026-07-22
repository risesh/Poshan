-- Admin write access for promo codes, same hardcoded-email-allowlist
-- pattern as 0003/0004/0006. promo_code_products gets a `for all` policy
-- (the one exception in this migration set that includes DELETE) because
-- editing a promo's product scope means deleting its old scoping rows and
-- inserting the new set — unlike orders/order_items or the catalog tables,
-- this join table carries no history worth preserving, so delete is safe
-- to expose here.

-- Lets the admin create a new promo code from the Controls tab's
-- "Add promo code" form.
create policy "Admins can insert promo codes"
  on promo_codes for insert
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com'));

-- Lets the admin toggle `active` and edit the date-bound window
-- (starts_at/expires_at) on an existing promo code from the Controls tab.
create policy "Admins can update promo codes"
  on promo_codes for update
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com'))
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com'));

-- Lets the admin set/replace which products a promo code is scoped to (or
-- leave it unscoped, i.e. "all products" — see 0001_init.sql's comment on
-- this table).
create policy "Admins can manage promo code product scoping"
  on promo_code_products for all
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com'))
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com'));
