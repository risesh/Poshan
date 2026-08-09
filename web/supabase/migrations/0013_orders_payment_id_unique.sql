-- Backstop against replaying a single verified Razorpay payment into
-- multiple orders (see lib/create-order.ts's payment_id pre-check, which
-- is the primary defense — this constraint only catches the narrow race
-- where two verify requests for the same payment land concurrently).
-- Nulls (COD orders) are unaffected — Postgres treats each null as distinct
-- for uniqueness purposes.
alter table orders add constraint orders_payment_id_key unique (payment_id);
