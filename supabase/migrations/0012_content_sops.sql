-- amoCRM SOPs ("Qisqa standart tartib-qoida"): one short standard procedure per
-- page under /tools/amocrm/<id>. Replaces the hardcoded lib/mock-data/amocrm.ts.
-- Same shape as every other content_* table (0002): domain columns, then the
-- shared bookkeeping block; Russian twins as nullable *_ru columns (0004) that
-- the read path falls back from; RLS as in 0002; explicit GRANTs as in 0003.
--
-- `id` is the URL slug (/tools/amocrm/lead-creation). `steps` is an ordered
-- JSONB array of { "title": text, "body": text }; the read path validates the
-- shape (stepsSchema in lib/content/schemas.ts), the CHECKs below only make
-- sure the column is an array at all.

create table public.content_sops (
  id text primary key,
  title text not null,
  summary text not null default '',
  steps jsonb not null default '[]'::jsonb check (jsonb_typeof(steps) = 'array'),
  title_ru text,
  summary_ru text,
  steps_ru jsonb check (steps_ru is null or jsonb_typeof(steps_ru) = 'array'),
  status text not null default 'published' check (status in ('draft','published')),
  sort_order int not null default 0,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by text,
  created_at timestamptz not null default now()
);

-- === Triggers ==================================================================
-- set_updated_at() and snapshot_content_version() come from 0002.

do $$
declare
  t text;
begin
  foreach t in array array['content_sops']
  loop
    execute format('create trigger trg_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
    execute format('create trigger trg_snapshot_version before update on public.%I for each row execute function public.snapshot_content_version()', t);
  end loop;
end $$;

-- === Row Level Security ========================================================
-- No policy targets `anon`. Every authenticated user may read published rows;
-- only the `manager` role may see drafts or write (see 0002).

alter table public.content_sops enable row level security;

create policy "content_sops_authenticated_select_published" on public.content_sops for select to authenticated using (status = 'published');
create policy "content_sops_manager_select_all" on public.content_sops for select to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_sops_manager_insert" on public.content_sops for insert to authenticated with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_sops_manager_update" on public.content_sops for update to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager') with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_sops_manager_delete" on public.content_sops for delete to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');

-- === Grants ====================================================================
-- RLS alone is not enough in this project: tables created by hand-run SQL don't
-- pick up Supabase's default privileges, service_role included (see 0003).

grant select, insert, update, delete on table public.content_sops to authenticated;
grant all on table public.content_sops to service_role;
