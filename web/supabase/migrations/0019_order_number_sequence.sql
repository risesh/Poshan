-- order_number was a random 5-digit number (Math.random(), see the old
-- generateOrderNumber in lib/order-math.ts) formatted as text ('PSN-24817')
-- and generated in application code, with a retry-on-collision loop in
-- lib/create-order.ts — unlike product_variants.item_id / promo_codes.
-- promo_id (0017_item_and_promo_ids.sql), which use a real Postgres
-- sequence in a reserved numeric range. This brings order_number in line
-- with that same pattern: a dedicated 9xxxxxx range, sequence-backed, no
-- app-side randomness, no retry, no "PSN-" prefix (a bare integer, like
-- item_id/promo_id).
--
-- All existing orders are deleted first, at the requester's explicit
-- instruction — order_number is switching from a text "PSN-NNNNN" format to
-- a bare integer, so there's no 1:1 mapping from the old format into the
-- new range, and order_items.order_id references orders(id) on delete
-- cascade, so this also clears out every existing order's line items.
delete from orders;

alter table orders drop column order_number;

create sequence orders_order_number_seq start with 9000000 minvalue 9000000 maxvalue 9999999;

alter table orders
  add column order_number integer not null unique default nextval('orders_order_number_seq');
alter table orders
  add constraint orders_order_number_range check (order_number between 9000000 and 9999999);
alter sequence orders_order_number_seq owned by orders.order_number;
