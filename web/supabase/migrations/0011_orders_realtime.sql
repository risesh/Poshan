-- Lets Postgres broadcast changes on `orders` over Supabase Realtime, so
-- app/admin/NewOrderListener.tsx can show a live toast when a new order
-- comes in while an admin already has the dashboard open. The existing
-- "Admins can view all orders" RLS policy (0003_admin_access.sql) already
-- scopes who receives these events once this is on — no new policy needed,
-- Realtime respects the same row-level security as a normal select.
alter publication supabase_realtime add table orders;
