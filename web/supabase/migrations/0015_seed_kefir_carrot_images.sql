-- Seeds product_images for Kefir and Lacto Ferments of Carrots from the
-- files uploaded to the product-images Storage bucket. Run the SELECT
-- below first and confirm it returns exactly the two products you expect
-- (one row each) before running the inserts — this file uses name
-- matching, not a hardcoded product_id, since that wasn't available when
-- writing it.
select id, name, slug from products where name = 'Kefir' or name ilike '%carrot%';

-- Kefir: the 4 new photos first, the pre-existing site image
-- (web/public/kefir.jpg, still referenced by products.image_url) moved to
-- last per the request — nothing about that existing row changes, it's
-- simply no longer the only image once these rows exist.
insert into product_images (product_id, image_url, sort_order)
select id, v.image_url, v.sort_order
from products, (values
  ('https://tztobnszmyzdwdlqkodu.supabase.co/storage/v1/object/public/product-images/Kefir%201.jpeg', 0),
  ('https://tztobnszmyzdwdlqkodu.supabase.co/storage/v1/object/public/product-images/Kefir%202.jpeg', 1),
  ('https://tztobnszmyzdwdlqkodu.supabase.co/storage/v1/object/public/product-images/Kefir%203.jpeg', 2),
  ('https://tztobnszmyzdwdlqkodu.supabase.co/storage/v1/object/public/product-images/Kefir%204.jpeg', 3),
  ('/kefir.jpg', 4)
) as v(image_url, sort_order)
where products.name = 'Kefir';

-- Lacto Ferments of Carrots: the 2 new photos — no pre-existing image to
-- preserve here (that product currently falls back to its gradient swatch).
insert into product_images (product_id, image_url, sort_order)
select id, v.image_url, v.sort_order
from products, (values
  ('https://tztobnszmyzdwdlqkodu.supabase.co/storage/v1/object/public/product-images/LactoCarrot%201.jpeg', 0),
  ('https://tztobnszmyzdwdlqkodu.supabase.co/storage/v1/object/public/product-images/LactoCarrot%202.jpeg', 1)
) as v(image_url, sort_order)
where products.name ilike '%carrot%';
