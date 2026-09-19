-- Lets the admin control the order products appear on the storefront
-- (lib/products.ts's getAllProducts) — same reasoning product_images got
-- its own sort_order in 0014_product_images.sql, since creation order
-- isn't a deliberate merchandising choice. Backfilled from the current
-- created_at order so nothing visibly reshuffles the moment this ships.
alter table products add column sort_order integer not null default 0;

update products
set sort_order = ranked.rn
from (
  select id, row_number() over (order by created_at) as rn
  from products
) as ranked
where products.id = ranked.id;
