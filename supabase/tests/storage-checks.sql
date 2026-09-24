-- Storage + product photo checks for 0018_product_images.sql — run against the
-- STAGING project only (see docs/TESTING.md), after 0018.
--
-- Paste the whole file into the Supabase SQL editor and run it once. Like
-- rls-checks.sql it inserts its own fixtures (ids prefixed `rls-test`), switches
-- to the `authenticated` role with an operator's, a sales manager's (0020) and
-- then an admin's JWT claims, and asserts what each may do to storage.objects.
-- The policies still call private.is_manager() by its 0014 name; since 0020 it
-- answers is_admin(), so a sales manager is refused like an operator. Everything runs in
-- one transaction that ends in ROLLBACK, and a failed assertion aborts it —
-- no fixture row or object row is ever committed, and no file is written: the
-- rows here are catalog entries only, Storage's file backend is never called.
--
--   Passed: the last result is a single row "storage checks passed".
--   Failed: an error whose message starts with "STORAGE FAIL:".
--
-- Newer Storage versions refuse a plain SQL DELETE on storage.objects unless
-- `storage.allow_delete_query` is set (the API's own deletes set it); the
-- delete checks below set it for this transaction only.

begin;

-- === Preflight and bucket settings ============================================

do $$
declare
  bucket record;
begin
  if to_regclass('storage.objects') is null then
    raise exception 'STORAGE FAIL: storage.objects is missing — is Storage enabled on this project?';
  end if;

  select public, file_size_limit, allowed_mime_types into bucket
    from storage.buckets where id = 'product-images';
  if not found then
    raise exception 'STORAGE FAIL: bucket product-images is missing — apply 0018_product_images.sql, then re-run this file';
  end if;
  if bucket.public is distinct from true then
    raise exception 'STORAGE FAIL: product-images must be public (catalog photos are served by public URL)';
  end if;
  if bucket.file_size_limit is distinct from 2097152 then
    raise exception 'STORAGE FAIL: product-images file_size_limit is %, expected 2097152 (lib/admin/product-image.ts)', bucket.file_size_limit;
  end if;
  if (select array_agg(t order by t) from unnest(bucket.allowed_mime_types) t)
     is distinct from array['image/avif', 'image/jpeg', 'image/png', 'image/webp'] then
    raise exception 'STORAGE FAIL: product-images allowed_mime_types is %, expected jpeg/png/webp/avif', bucket.allowed_mime_types;
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'product\_images\_%'
      and (roles <> '{authenticated}' or coalesce(qual, '') || coalesce(with_check, '') not like '%is_manager()%')
  ) then
    raise exception 'STORAGE FAIL: a product_images_* policy is not authenticated-only and gated on private.is_manager() (= is_admin() since 0020)';
  end if;
  if (select count(*) from pg_policies
      where schemaname = 'storage' and tablename = 'objects' and policyname like 'product\_images\_%') <> 4 then
    raise exception 'STORAGE FAIL: expected exactly the four product_images_* policies of 0018';
  end if;
  -- Every expression scoped to the bucket, and every write held to products/.
  -- Checked on the text as well as by behaviour below: Postgres applies the
  -- SELECT policy to rows an UPDATE or DELETE reads, so while it stays
  -- admin-and-bucket-only it would hide an over-wide UPDATE/DELETE policy
  -- from the behavioural checks.
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname like 'product\_images\_%'
      and (
        (qual is not null and qual not like '%bucket_id = ''product-images''::text%')
        or (with_check is not null and with_check not like '%bucket_id = ''product-images''::text%')
        or (with_check is not null and with_check not like '%foldername(name)%''products''::text%')
      )
  ) then
    raise exception 'STORAGE FAIL: a product_images_* policy is not scoped to the product-images bucket and products/';
  end if;
end
$$;

-- === Fixtures (as the editor's own role) ======================================

insert into storage.buckets (id, name, public) values ('rls-test-other', 'rls-test-other', false);
insert into storage.objects (bucket_id, name) values
  ('product-images', 'products/rls-test-photo/00000000.jpg'),
  ('rls-test-other', 'products/rls-test-photo/00000000.jpg');

-- === content_products (0018 section 3) ========================================

-- A product created in the admin has no legacy file.
insert into public.content_products (id, filename, name_ru, line, category, status) values
  ('rls-test-photo', null, 'RLS test', 'ppr', 'truba', 'draft'),
  ('rls-test-photo-2', null, 'RLS test 2', 'ppr', 'truba', 'draft');

update public.content_products
  set image_path = 'products/rls-test-photo/0a1b2c3d.webp'
  where id = 'rls-test-photo';

do $$
declare
  bad text;
begin
  foreach bad in array array[
    'products/rls-test-photo-2/0a1b2c3d.webp',   -- another product's folder
    'products/rls-test-photo/0a1b2c3d.svg',      -- not an allowed extension
    'products/rls-test-photo/../x/0a1b2c3d.jpg', -- climbs out
    'other/rls-test-photo/0a1b2c3d.jpg',         -- outside products/
    'products/rls-test-photo/0A1B2C3D.jpg'       -- not the lower-case hash
  ] loop
    begin
      update public.content_products set image_path = bad where id = 'rls-test-photo';
      raise exception 'STORAGE FAIL: content_products accepted image_path %', bad;
    exception when check_violation then
      null;
    end;
  end loop;
end
$$;

-- === As an operator, and as a sales manager (0020) ===========================

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000aaaa","email":"rls-op@test","role":"authenticated","app_metadata":{"role":"operator"}}';
set local storage.allow_delete_query = 'true';

do $$
declare
  ident record;
  n bigint;
begin
  for ident in
    select * from (values
      ('an operator',
        '{"sub":"00000000-0000-0000-0000-00000000aaaa","email":"rls-op@test","role":"authenticated","app_metadata":{"role":"operator"}}'),
      ('a sales manager',
        '{"sub":"00000000-0000-0000-0000-00000000cccc","email":"rls-sales@test","role":"authenticated","app_metadata":{"role":"manager"}}')
    ) as t(label, claims)
  loop
    perform set_config('request.jwt.claims', ident.claims, true);

    -- No listing: the catalog reads photos by public URL, which needs no policy.
    select count(*) into n from storage.objects where bucket_id in ('product-images', 'rls-test-other');
    if n <> 0 then
      raise exception 'STORAGE FAIL: % can list % storage object(s)', ident.label, n;
    end if;

    begin
      insert into storage.objects (bucket_id, name) values ('product-images', 'products/rls-test-photo/11111111.jpg');
      raise exception 'STORAGE FAIL: % uploaded into product-images', ident.label;
    exception when insufficient_privilege then
      null;
    end;

    update storage.objects set name = 'products/rls-test-photo/22222222.jpg'
      where bucket_id = 'product-images' and name = 'products/rls-test-photo/00000000.jpg';
    get diagnostics n = row_count;
    if n <> 0 then
      raise exception 'STORAGE FAIL: % renamed a product photo', ident.label;
    end if;

    delete from storage.objects where bucket_id = 'product-images' and name = 'products/rls-test-photo/00000000.jpg';
    get diagnostics n = row_count;
    if n <> 0 then
      raise exception 'STORAGE FAIL: % deleted a product photo', ident.label;
    end if;
  end loop;
end
$$;

-- === As an admin ==============================================================

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000bbbb","email":"rls-admin@test","role":"authenticated","app_metadata":{"role":"admin"}}';

do $$
declare
  n bigint;
begin
  -- Visible in this bucket (remove() and upsert need it), nowhere else.
  select count(*) into n from storage.objects where bucket_id = 'product-images' and name like 'products/rls-test-photo/%';
  if n <> 1 then
    raise exception 'STORAGE FAIL: an admin sees % product-images object(s), expected 1', n;
  end if;
  select count(*) into n from storage.objects where bucket_id = 'rls-test-other';
  if n <> 0 then
    raise exception 'STORAGE FAIL: the product_images policies let an admin see another bucket';
  end if;

  insert into storage.objects (bucket_id, name) values ('product-images', 'products/rls-test-photo/33333333.jpg');

  begin
    insert into storage.objects (bucket_id, name) values ('product-images', 'elsewhere/rls-test-photo/44444444.jpg');
    raise exception 'STORAGE FAIL: an admin wrote outside products/';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into storage.objects (bucket_id, name) values ('rls-test-other', 'products/rls-test-photo/55555555.jpg');
    raise exception 'STORAGE FAIL: the product_images policies let an admin write another bucket';
  exception when insufficient_privilege then
    null;
  end;

  update storage.objects set name = 'products/rls-test-photo/66666666.jpg'
    where bucket_id = 'product-images' and name = 'products/rls-test-photo/33333333.jpg';
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'STORAGE FAIL: an admin could not update a product photo (upsert needs it)';
  end if;

  begin
    update storage.objects set bucket_id = 'rls-test-other'
      where bucket_id = 'product-images' and name = 'products/rls-test-photo/66666666.jpg';
    raise exception 'STORAGE FAIL: an admin moved a product photo into another bucket';
  exception when insufficient_privilege then
    null;
  end;

  update storage.objects set name = 'rls-test-other/77777777.jpg'
    where bucket_id = 'rls-test-other';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'STORAGE FAIL: the product_images policies let an admin update another bucket';
  end if;

  delete from storage.objects where bucket_id = 'rls-test-other';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'STORAGE FAIL: the product_images policies let an admin delete from another bucket';
  end if;

  delete from storage.objects where bucket_id = 'product-images' and name = 'products/rls-test-photo/66666666.jpg';
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'STORAGE FAIL: an admin could not remove a product photo';
  end if;
end
$$;

reset role;

select 'storage checks passed' as result;

rollback;
