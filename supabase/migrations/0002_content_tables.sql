-- Content storage for the sales knowledge base: every lib/content/*.ts array
-- gets a matching table here, seeded from that TS source (supabase/seed/seed-content.ts)
-- and read back through cached loaders (lib/content/loader.ts).

-- === Tables ===================================================================

create table public.content_scripts (
  id text primary key,
  name text not null,
  cheat_sheet text not null,
  stages jsonb not null default '[]',
  status text not null default 'published' check (status in ('draft','published')),
  sort_order int not null default 0,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by text,
  created_at timestamptz not null default now()
);

create table public.content_objections (
  id text primary key,
  label text not null,
  keywords text[] not null default '{}',
  client_says text not null,
  real_meaning text not null,
  response text not null,
  follow_up text,
  script_ids text[] not null default '{}',
  status text not null default 'published' check (status in ('draft','published')),
  sort_order int not null default 0,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by text,
  created_at timestamptz not null default now()
);

create table public.content_faqs (
  id text primary key,
  category text not null,
  question text not null,
  answer text not null,
  status text not null default 'published' check (status in ('draft','published')),
  sort_order int not null default 0,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by text,
  created_at timestamptz not null default now()
);

create table public.content_competitors (
  id text primary key,
  name text not null,
  assortment text,
  base_discount text,
  volume_discount text,
  retro_bonus text,
  max_discount text,
  payment_terms text,
  payment_method text,
  delivery_time text,
  logistics text,
  dealer_coverage text,
  certificates text,
  marketing_offers text,
  threat_level text not null check (threat_level in ('Yuqori','O''rta','Ma''lumot yo''q')),
  status text not null default 'published' check (status in ('draft','published')),
  sort_order int not null default 0,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by text,
  created_at timestamptz not null default now()
);

create table public.content_package_groups (
  id text primary key,
  title text not null,
  subtitle text not null,
  status text not null default 'published' check (status in ('draft','published')),
  sort_order int not null default 0,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by text,
  created_at timestamptz not null default now()
);

create table public.content_packages (
  id text primary key,
  group_id text not null references public.content_package_groups(id) on delete cascade,
  name text not null,
  is_featured boolean not null default false,
  order_volume text not null,
  payment_terms text not null,
  estimated_discount text not null,
  logistics text not null,
  delivery_time text not null,
  discount_pct numeric(5,2) not null default 0,
  advance_pct numeric(5,2),
  status text not null default 'published' check (status in ('draft','published')),
  sort_order int not null default 0,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by text,
  created_at timestamptz not null default now()
);

create table public.content_products (
  id text primary key,
  filename text not null unique,
  name_ru text not null,
  sizes text[] not null default '{}',
  line text not null check (line in ('ppr','kanalizatsiya')),
  category text not null check (category in ('truba','fiting','kran','aksessuar')),
  material text check (material in ('latun')),
  status text not null default 'published' check (status in ('draft','published')),
  sort_order int not null default 0,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by text,
  created_at timestamptz not null default now()
);

create table public.content_versions (
  id bigserial primary key,
  table_name text not null,
  row_id text not null,
  snapshot jsonb not null,
  actor text,
  created_at timestamptz not null default now()
);

create index content_versions_table_row_created_idx
  on public.content_versions (table_name, row_id, created_at desc);

-- === Triggers ==================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Snapshots the pre-update row into content_versions and bumps the version
-- counter. tg_table_name lets one function serve every content table instead
-- of duplicating this per table. actor comes from the caller's JWT (null for
-- the service-role seed script, which has no request.jwt.claims set).
create or replace function public.snapshot_content_version()
returns trigger
language plpgsql
as $$
begin
  insert into public.content_versions (table_name, row_id, snapshot, actor)
  values (tg_table_name, old.id, to_jsonb(old), current_setting('request.jwt.claims', true)::jsonb->>'email');
  new.version = old.version + 1;
  return new;
end;
$$;

-- One BEFORE UPDATE pair per content table (not content_versions itself,
-- which is append-only and never updated).
do $$
declare
  t text;
begin
  foreach t in array array[
    'content_scripts', 'content_objections', 'content_faqs', 'content_competitors',
    'content_package_groups', 'content_packages', 'content_products'
  ]
  loop
    execute format('create trigger trg_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
    execute format('create trigger trg_snapshot_version before update on public.%I for each row execute function public.snapshot_content_version()', t);
  end loop;
end $$;

-- === Row Level Security ========================================================
-- No policy targets `anon`, so anonymous requests are denied outright by RLS.
-- Every authenticated user (any role) may read published rows; only the
-- `manager` role (from app_metadata.role in the JWT, set by the custom access
-- token hook in 0001_custom_access_token_hook.sql) may see drafts or write.

alter table public.content_scripts enable row level security;
alter table public.content_objections enable row level security;
alter table public.content_faqs enable row level security;
alter table public.content_competitors enable row level security;
alter table public.content_package_groups enable row level security;
alter table public.content_packages enable row level security;
alter table public.content_products enable row level security;
alter table public.content_versions enable row level security;

create policy "content_scripts_authenticated_select_published" on public.content_scripts for select to authenticated using (status = 'published');
create policy "content_scripts_manager_select_all" on public.content_scripts for select to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_scripts_manager_insert" on public.content_scripts for insert to authenticated with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_scripts_manager_update" on public.content_scripts for update to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager') with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_scripts_manager_delete" on public.content_scripts for delete to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');

create policy "content_objections_authenticated_select_published" on public.content_objections for select to authenticated using (status = 'published');
create policy "content_objections_manager_select_all" on public.content_objections for select to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_objections_manager_insert" on public.content_objections for insert to authenticated with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_objections_manager_update" on public.content_objections for update to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager') with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_objections_manager_delete" on public.content_objections for delete to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');

create policy "content_faqs_authenticated_select_published" on public.content_faqs for select to authenticated using (status = 'published');
create policy "content_faqs_manager_select_all" on public.content_faqs for select to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_faqs_manager_insert" on public.content_faqs for insert to authenticated with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_faqs_manager_update" on public.content_faqs for update to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager') with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_faqs_manager_delete" on public.content_faqs for delete to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');

create policy "content_competitors_authenticated_select_published" on public.content_competitors for select to authenticated using (status = 'published');
create policy "content_competitors_manager_select_all" on public.content_competitors for select to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_competitors_manager_insert" on public.content_competitors for insert to authenticated with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_competitors_manager_update" on public.content_competitors for update to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager') with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_competitors_manager_delete" on public.content_competitors for delete to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');

create policy "content_package_groups_authenticated_select_published" on public.content_package_groups for select to authenticated using (status = 'published');
create policy "content_package_groups_manager_select_all" on public.content_package_groups for select to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_package_groups_manager_insert" on public.content_package_groups for insert to authenticated with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_package_groups_manager_update" on public.content_package_groups for update to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager') with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_package_groups_manager_delete" on public.content_package_groups for delete to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');

create policy "content_packages_authenticated_select_published" on public.content_packages for select to authenticated using (status = 'published');
create policy "content_packages_manager_select_all" on public.content_packages for select to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_packages_manager_insert" on public.content_packages for insert to authenticated with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_packages_manager_update" on public.content_packages for update to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager') with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_packages_manager_delete" on public.content_packages for delete to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');

create policy "content_products_authenticated_select_published" on public.content_products for select to authenticated using (status = 'published');
create policy "content_products_manager_select_all" on public.content_products for select to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_products_manager_insert" on public.content_products for insert to authenticated with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_products_manager_update" on public.content_products for update to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager') with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_products_manager_delete" on public.content_products for delete to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');

create policy "content_versions_manager_select" on public.content_versions for select to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_versions_manager_insert" on public.content_versions for insert to authenticated with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');
