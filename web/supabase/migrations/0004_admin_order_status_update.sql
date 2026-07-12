-- Lets /admin/orders change an order's fulfillment status (pending →
-- shipped/delivered/cancelled etc.) — 0003_admin_access.sql only granted
-- SELECT. Same admin email allowlist, kept in sync with lib/admin.ts.
--
-- RLS grants row-level access, not per-column — this policy alone would
-- technically allow updating any column on a matching row, not just
-- order_status. app/api/admin/orders/[id]/status/route.ts is the only
-- caller and only ever sends { order_status }, so that route (not this
-- policy) is what keeps the actual write surface narrow.
create policy "Admins can update order status"
  on orders for update
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com'))
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com'));
