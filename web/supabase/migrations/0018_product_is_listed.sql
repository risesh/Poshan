-- Fully hides a product from the storefront (listing grid, direct product
-- page URL, sitemap) without touching any of its stored data — distinct
-- from is_instock, which keeps a product visible (shown as an out-of-stock
-- card) but unpurchasable. Defaults to true so nothing existing changes
-- visibility the moment this ships.
alter table products add column is_listed boolean not null default true;
