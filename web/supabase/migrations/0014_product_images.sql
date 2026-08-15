-- Multiple ordered images per product (a PDP carousel — see
-- app/components/ProductHero.tsx), stored in Supabase Storage instead of
-- web/public/ so adding a photo is a Storage upload + a DB insert, not a
-- git commit + Netlify deploy (see next.config.ts's long-standing comment
-- flagging this as the intended future state).
--
-- image_url is a plain URL, the same convention products.image_url already
-- uses — deliberately NOT a bucket-relative path, so a mix of Storage URLs
-- and a legacy web/public/ path (e.g. '/kefir.jpg') can sit in the same
-- ordered list without any special-casing at render time; CSS/next/image
-- both resolve either form the same way.
create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table product_images enable row level security;

create policy "Product images are publicly readable"
  on product_images for select using (true);

-- Same hardcoded-email-allowlist pattern as every other admin write policy
-- (0006_admin_product_write.sql etc.) — kept in sync with web/lib/admin.ts.
create policy "Admins can insert product images"
  on product_images for insert
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test'));

create policy "Admins can update product images"
  on product_images for update
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test'))
  with check (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test'));

create policy "Admins can delete product images"
  on product_images for delete
  using (auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test'));

-- The actual file bucket. Public read (storefront needs these visible to
-- signed-out visitors too); write restricted to admins, same allowlist as
-- above — this is Storage's own RLS layer (storage.objects), separate from
-- but mirroring the product_images table policies.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Product image files are publicly readable"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "Admins can upload product image files"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test')
  );

create policy "Admins can update product image files"
  on storage.objects for update
  using (
    bucket_id = 'product-images'
    and auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test')
  );

create policy "Admins can delete product image files"
  on storage.objects for delete
  using (
    bucket_id = 'product-images'
    and auth.jwt() ->> 'email' in ('riseshbhutani@gmail.com', 'bharathandu142@gmail.com', 'test-admin@poshan.test')
  );
