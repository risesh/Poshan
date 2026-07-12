-- Admin read access for the internal /admin dashboard (revenue charts,
-- full order list). Deliberately RLS-policy-based rather than a Supabase
-- service-role key: a service key bypasses RLS entirely and would have to
-- be handled with extra care to never leak to the client; a scoped SELECT
-- policy keyed on the signed-in user's own JWT email claim is auditable
-- Postgres policy, consistent with "RLS on every table" for this project,
-- and needs no secret beyond the session the admin already has by signing
-- in normally. Additive: these live alongside each table's existing
-- owner-scoped policy (Postgres RLS OR's multiple policies for the same
-- action together), so regular users are unaffected.
--
-- The email allowlist is intentionally hardcoded in SQL, not read from a
-- table — two people, changed rarely enough that a migration is fine, and
-- it avoids a chicken-and-egg "who can edit the admins table" problem.
-- lib/admin.ts's ADMIN_EMAILS must be kept in sync with this list — that
-- file gates page/nav visibility, this migration is the actual security
-- boundary.

create policy "Admins can view all orders"
  on orders for select
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com'));

create policy "Admins can view all order items"
  on order_items for select
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com'));

create policy "Admins can view all addresses"
  on addresses for select
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com'));

create policy "Admins can view all profiles"
  on profiles for select
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com'));
