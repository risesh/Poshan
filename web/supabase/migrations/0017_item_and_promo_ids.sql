-- Human-readable numeric identifiers, distinct from the internal uuid `id`
-- columns those tables already have — meant for a person to reference a
-- specific variant/promo (in conversation, a support ticket, a spreadsheet)
-- without reading out a UUID. Each gets its own reserved numeric range
-- (1xxxxx / 2xxxxx) so the two can never collide or be mistaken for each
-- other at a glance. Sequences (not just a default expression) so future
-- inserts keep getting the next value automatically, the same way the
-- uuid `id` columns auto-generate today.

create sequence product_variants_item_id_seq start with 100001 minvalue 100000 maxvalue 199999;

alter table product_variants
  add column item_id integer not null unique default nextval('product_variants_item_id_seq');
alter table product_variants
  add constraint product_variants_item_id_range check (item_id between 100000 and 199999);
alter sequence product_variants_item_id_seq owned by product_variants.item_id;

create sequence promo_codes_promo_id_seq start with 200001 minvalue 200000 maxvalue 299999;

alter table promo_codes
  add column promo_id integer not null unique default nextval('promo_codes_promo_id_seq');
alter table promo_codes
  add constraint promo_codes_promo_id_range check (promo_id between 200000 and 299999);
alter sequence promo_codes_promo_id_seq owned by promo_codes.promo_id;
