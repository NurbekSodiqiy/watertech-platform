-- Contacts ("Kontaktlar"): who an operator calls or writes to for escalations,
-- logistics, finance, ... Replaces the hardcoded lib/mock-data/contacts.ts.
-- Same shape as every other content_* table (0002): domain columns, then the
-- shared bookkeeping block; Russian twins as nullable *_ru columns (0004) that
-- the read path falls back from; RLS as in 0002; explicit GRANTs as in 0003.
--
-- `name` has no Russian twin: it is a person's name, not translatable copy.

create table public.content_contacts (
  id text primary key,
  name text not null,
  role text not null,
  topic text not null,
  role_ru text,
  topic_ru text,
  -- Either a full Uzbek number, "+998 90 123 45 67" (spaces or dashes between
  -- the groups are optional), or an internal extension of 2-5 digits. Kept in
  -- step with contactPhoneSchema in lib/content/schemas.ts.
  phone text not null check (phone ~ '^(\+998[ -]?[0-9]{2}[ -]?[0-9]{3}[ -]?[0-9]{2}[ -]?[0-9]{2}|[0-9]{2,5})$'),
  -- Telegram handle. It becomes a t.me link, so the shape is strict (same as
  -- contactMessengerSchema and the handle pattern in DatabaseTemplate).
  messenger text not null check (messenger ~ '^@[A-Za-z][A-Za-z0-9_]{4,31}$'),
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
  foreach t in array array['content_contacts']
  loop
    execute format('create trigger trg_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
    execute format('create trigger trg_snapshot_version before update on public.%I for each row execute function public.snapshot_content_version()', t);
  end loop;
end $$;

-- === Row Level Security ========================================================
-- No policy targets `anon`. Every authenticated user may read published rows;
-- only the `manager` role may see drafts or write (see 0002).

alter table public.content_contacts enable row level security;

create policy "content_contacts_authenticated_select_published" on public.content_contacts for select to authenticated using (status = 'published');
create policy "content_contacts_manager_select_all" on public.content_contacts for select to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_contacts_manager_insert" on public.content_contacts for insert to authenticated with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_contacts_manager_update" on public.content_contacts for update to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager') with check ((auth.jwt()->'app_metadata'->>'role') = 'manager');
create policy "content_contacts_manager_delete" on public.content_contacts for delete to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');

-- === Grants ====================================================================
-- RLS alone is not enough in this project: tables created by hand-run SQL don't
-- pick up Supabase's default privileges, service_role included (see 0003).

grant select, insert, update, delete on table public.content_contacts to authenticated;
grant all on table public.content_contacts to service_role;
