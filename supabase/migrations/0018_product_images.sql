-- Audit-2 / S11 — catalog photos uploaded from /admin/products instead of
-- committed to public/products and shipped with a deploy.
--
-- Until now content_products.filename had to name a file in public/products,
-- so adding a product with a photo needed a developer. This file:
--
--   1. creates the Storage bucket `product-images`: public read (catalog photos
--      are marketing material, served to anyone who has the URL — the decision
--      is recorded in docs/SECURITY.md), 2 MB per object, JPEG/PNG/WebP/AVIF
--      only. The same limits are enforced before the upload by
--      lib/admin/product-image.ts (tests/unit/admin/product-image.test.ts
--      checks the two agree);
--   2. lets a manager — and only a manager — write objects into that bucket,
--      and only under `products/`. There is deliberately no anon or operator
--      policy: public objects are served by the public URL endpoint, which does
--      not consult RLS, so reading the photo needs no policy at all;
--   3. adds content_products.image_path — the object key inside the bucket,
--      `products/<product id>/<sha256-8>.<ext>`, written only by the upload
--      action (lib/admin/actions/product-image.ts). A row with an image_path
--      renders that object; a row without one falls back to the legacy
--      /products/<filename> (lib/content/products.ts, productImageSrc);
--   4. makes content_products.filename nullable: a product created in the
--      admin has no file in public/products, and the 28 legacy rows keep
--      theirs. `unique` stays, and Postgres treats nulls as distinct.
--
-- The SELECT policy in section 2 is for managers only and is not a read path
-- for the catalog: the Storage API's remove() is a DELETE … RETURNING and its
-- upsert an INSERT … ON CONFLICT DO UPDATE, and Postgres applies SELECT
-- policies to both. Without it a manager's remove() deletes nothing and
-- reports success.
--
-- APPLY ORDER (see docs/MIGRATIONS.md): after 0014 (private.is_manager()).
-- Re-running it is safe. Run as `postgres` in the SQL editor.

begin;

-- =============================================================================
-- Section 0 — preflight
-- =============================================================================

do $preflight$
begin
  if to_regprocedure('private.is_manager()') is null then
    raise exception '0018: private.is_manager() is missing — apply 0014_role_gated_rls.sql first.';
  end if;
  if to_regclass('public.content_products') is null then
    raise exception '0018: public.content_products is missing — apply 0002_content_tables.sql first.';
  end if;
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise exception '0018: storage.buckets / storage.objects are missing — is Storage enabled for this project?';
  end if;
  if to_regprocedure('storage.foldername(text)') is null then
    raise exception '0018: storage.foldername(text) is missing — this Storage schema is older than the policies below expect.';
  end if;
end
$preflight$;

-- =============================================================================
-- Section 1 — the bucket
-- =============================================================================
-- Upsert, not insert: a bucket created by hand in the dashboard before this
-- file ran is converged onto the settings the app validates against, instead
-- of the file failing on a duplicate id.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- =============================================================================
-- Section 2 — storage.objects policies
-- =============================================================================
-- Every policy is scoped to this bucket, so it grants nothing anywhere else in
-- storage.objects, and `(select private.is_manager())` is the InitPlan-wrapped
-- form every 0014 policy uses. Writes are additionally held to the `products/`
-- prefix the upload action writes under.

drop policy if exists "product_images_manager_select" on storage.objects;
create policy "product_images_manager_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and (select private.is_manager()));

drop policy if exists "product_images_manager_insert" on storage.objects;
create policy "product_images_manager_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (select private.is_manager())
    and (storage.foldername(name))[1] = 'products'
  );

drop policy if exists "product_images_manager_update" on storage.objects;
create policy "product_images_manager_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (select private.is_manager()))
  with check (
    bucket_id = 'product-images'
    and (select private.is_manager())
    and (storage.foldername(name))[1] = 'products'
  );

drop policy if exists "product_images_manager_delete" on storage.objects;
create policy "product_images_manager_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (select private.is_manager()));

-- =============================================================================
-- Section 3 — content_products
-- =============================================================================
-- image_path is covered by 0003's table-level grants; no new GRANT is needed.
-- The shape check mirrors lib/admin/product-image.ts (productImagePath): the
-- second segment must be the row's own id, so a row can never be pointed at
-- another product's photo, and the key can never climb out of `products/`.

alter table public.content_products add column if not exists image_path text;

alter table public.content_products drop constraint if exists content_products_image_path_shape;
alter table public.content_products add constraint content_products_image_path_shape check (
  image_path is null
  or (
    image_path ~ '^products/[a-z0-9-]+/[0-9a-f]{8}\.(jpg|png|webp|avif)$'
    and split_part(image_path, '/', 2) = id
  )
);

comment on column public.content_products.image_path is
  'Object key in the product-images bucket (products/<id>/<sha256-8>.<ext>). Written only by the admin upload action; null means the legacy public/products/<filename>.';

alter table public.content_products alter column filename drop not null;

comment on column public.content_products.filename is
  'Legacy: a file in public/products. Null for products whose photo lives in the product-images bucket (image_path).';

commit;
