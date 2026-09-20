-- Changelog ("O'zgarishlar tarixi"): what changed, when, who approved it, and
-- which page it is about. Replaces the hardcoded lib/mock-data/changelog.ts.
-- Same shape as every other content_* table (0002): domain columns, then the
-- shared bookkeeping block; Russian twins as nullable *_ru columns (0004) that
-- the read path falls back from; RLS as in 0002; explicit GRANTs as in 0003.
--
-- Read receipts are NOT stored here. Whether an operator has read an entry is
-- per-user state (user_state, key 'changelog.read', see 0009) — this table only
-- holds the entries themselves.

create table public.content_changelog (
  id text primary key,
  published_on date not null,
  title text not null,
  body text not null,
  title_ru text,
  body_ru text,
  -- In-app path the entry is about, e.g. '/sales-process/battle-cards'. Must be
  -- a path on this site: starts with a single '/' ('//host' would be read as a
  -- protocol-relative URL, i.e. another site).
  linked_path text check (linked_path is null or (linked_path like '/%' and linked_path not like '//%')),
  approved_by text not null,
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
  foreach t in array array['content_changelog']
  loop
    execute format('create trigger trg_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
    execute format('create trigger trg_snapshot_version before update on public.%I for each row execute function public.snapshot_content_version()', t);
  end loop;
end $$;

-- === Row Level Security ========================================================
-- No policy targets `anon`. Every authenticated user may read published rows;
-- only the `manager` role may see drafts or write (see 0002).

alter table public.content_changelog enable row level security;

create policy "content_changelog_authenticated_select_published" on public.content_changelog for select to authenticated using (status = 'published');
create policy "content_changelog_manager_select_all" on public.content_changelog for select to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_changelog_manager_insert" on public.content_changelog for insert to authenticated with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_changelog_manager_update" on public.content_changelog for update to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager') with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_changelog_manager_delete" on public.content_changelog for delete to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');

-- === Grants ====================================================================
-- RLS alone is not enough in this project: tables created by hand-run SQL don't
-- pick up Supabase's default privileges, service_role included (see 0003).

grant select, insert, update, delete on table public.content_changelog to authenticated;
grant all on table public.content_changelog to service_role;
