-- Audit-2 / S02 — migration baseline for the two hand-made tables, plus the
-- integrity fixes the audit found in the content layer.
--
-- Why this file exists:
--   1. public.allowed_users (read by custom_access_token_hook, 0001) and
--      public.telemetry_events (written by app/api/events/route.ts) were created
--      by hand before supabase/migrations/ existed, so a fresh project could not
--      be built from the migrations alone. They are declared here.
--   2. Every content_* table defaulted status to 'published', so any direct
--      insert (seed, psql, a future importer) shipped content past the publish
--      gate (lib/agents/publish-gate).
--   3. updated_by was written by application code only; the database is now
--      authoritative (same pattern as stamp_admin_notification_update, 0007).
--   4. snapshot_content_version() was BEFORE UPDATE only and SECURITY INVOKER:
--      a DELETE left no history at all, and cascaded package deletes vanished
--      silently.
--   5. content_versions_manager_insert let any manager fabricate history rows.
--
-- Everything here is idempotent and non-destructive: no table is dropped, no
-- column type is narrowed, and CHECK constraints added to already-populated
-- tables are added NOT VALID so legacy rows cannot abort the migration.
--
-- APPLY ORDER (see docs/MIGRATIONS.md):
--   * Existing project: run this file once, after 0012.
--   * Fresh project:    run this file FIRST (it creates the two hand-made
--     tables and reports "baseline sections applied only"), then 0001-0012,
--     then run this file again for the content sections. Re-running is safe.
--
-- Run as the role that owns the public tables (`postgres` in the Supabase SQL
-- editor): snapshot_content_version() becomes SECURITY DEFINER and must run as
-- the owner of public.content_versions.

begin;

-- =============================================================================
-- Section 1 — baseline: public.allowed_users
-- =============================================================================
-- Shape matches the live table (email, role); everything after it is added with
-- `add column if not exists` so the live rows are untouched. This table is the
-- source of every role claim (0001), so `authenticated` gets SELECT and nothing
-- else — the allow-list is edited in the Supabase dashboard or by service_role.

do $allowed_users$
declare
  -- Captured before the create: on a fresh database 0001 and 0005 still have to
  -- create their own policies (both use a bare `create policy`, which would fail
  -- if this file had already created them), so this file only (re)creates them
  -- on a database where the table was already there.
  existed boolean := to_regclass('public.allowed_users') is not null;
begin
  create table if not exists public.allowed_users (
    email text primary key
      constraint allowed_users_email_lowercase_chk check (email = lower(email)),
    role text not null
      constraint allowed_users_role_chk check (role in ('operator', 'manager'))
  );

  -- The live table predates both CHECKs. NOT VALID applies them to every future
  -- insert/update without re-reading (and possibly rejecting) legacy rows;
  -- `alter table public.allowed_users validate constraint <name>;` can be run
  -- later, once the existing rows are known to be clean.
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.allowed_users'::regclass
      and conname = 'allowed_users_email_lowercase_chk'
  ) then
    alter table public.allowed_users
      add constraint allowed_users_email_lowercase_chk check (email = lower(email)) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.allowed_users'::regclass
      and conname = 'allowed_users_role_chk'
  ) then
    alter table public.allowed_users
      add constraint allowed_users_role_chk check (role in ('operator', 'manager')) not valid;
  end if;

  -- Bookkeeping columns (CLAUDE.md section 7). is_active is recorded but NOT yet
  -- read by the access-token hook — changing that hook is S03, so deactivating a
  -- user here does not revoke their role claim today.
  alter table public.allowed_users add column if not exists full_name text;
  alter table public.allowed_users add column if not exists is_active boolean not null default true;
  alter table public.allowed_users add column if not exists created_at timestamptz not null default now();
  alter table public.allowed_users add column if not exists updated_at timestamptz not null default now();
  alter table public.allowed_users add column if not exists updated_by text;

  alter table public.allowed_users enable row level security;

  -- RLS alone grants nothing in this project (see 0003).
  grant select on table public.allowed_users to authenticated;
  grant select on table public.allowed_users to supabase_auth_admin;
  grant all on table public.allowed_users to service_role;
  -- Defence in depth: the allow-list decides who is a manager, so no session
  -- role may write it even if RLS were ever switched off on this table.
  revoke insert, update, delete on table public.allowed_users from authenticated;

  if existed then
    -- Same definitions as 0001 and 0005, re-stated so a hand-made database
    -- converges on them; drop-if-exists keeps each pair idempotent.
    drop policy if exists "auth admin reads allowed_users" on public.allowed_users;
    create policy "auth admin reads allowed_users" on public.allowed_users
      for select to supabase_auth_admin using (true);

    drop policy if exists "allowed_users_manager_select_all" on public.allowed_users;
    create policy "allowed_users_manager_select_all" on public.allowed_users
      for select to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');
  else
    raise notice '0013: created public.allowed_users — its policies are created by 0001 and 0005.';
  end if;
end
$allowed_users$;

-- =============================================================================
-- Section 2 — baseline: public.telemetry_events
-- =============================================================================
-- Shape matches the live table: app/api/events/route.ts inserts the 10 columns
-- below (with a server-set user_email), lib/dashboard/telemetry-window.ts reads
-- them back. Writes go through the service-role client because operators must
-- never insert rows for an arbitrary email — hence no insert policy for
-- `authenticated`, only the manager dashboard's read.

do $telemetry_events$
declare
  existed boolean := to_regclass('public.telemetry_events') is not null;
  seq text;
begin
  create table if not exists public.telemetry_events (
    id bigserial primary key,
    user_email text not null,
    session_id text not null,
    ts timestamptz not null,
    type text not null,
    path text not null,
    entity_type text,
    entity_id text,
    duration_ms integer,
    meta jsonb,
    created_at timestamptz not null default now()
  );

  -- Every dashboard query is a time window (ts), optionally narrowed by the
  -- operator filter (user_email) or by event type.
  create index if not exists telemetry_events_ts_idx on public.telemetry_events (ts);
  create index if not exists telemetry_events_user_email_ts_idx on public.telemetry_events (user_email, ts);
  create index if not exists telemetry_events_type_ts_idx on public.telemetry_events (type, ts);

  alter table public.telemetry_events enable row level security;

  -- Only the manager dashboard reads this table with a user session. Any other
  -- legacy policy on the live table (for example an operator "own rows" read) is
  -- deliberately left alone — reviewing those is S03.
  drop policy if exists "telemetry_events_manager_select_all" on public.telemetry_events;
  drop policy if exists "telemetry_events_manager_select" on public.telemetry_events;
  create policy "telemetry_events_manager_select_all" on public.telemetry_events
    for select to authenticated using ((auth.jwt()->'app_metadata'->>'role') = 'manager');

  grant select on table public.telemetry_events to authenticated;
  grant all on table public.telemetry_events to service_role;
  -- No insert policy exists for `authenticated`, so these privileges could never
  -- be used; revoking them keeps the table safe if RLS is ever toggled off.
  revoke insert, update, delete on table public.telemetry_events from authenticated;

  seq := pg_get_serial_sequence('public.telemetry_events', 'id');
  if seq is not null then
    execute format('grant usage, select on sequence %s to service_role', seq);
  end if;

  if not existed then
    raise notice '0013: created public.telemetry_events.';
  end if;
end
$telemetry_events$;

-- =============================================================================
-- Section 3 — trigger functions
-- =============================================================================
-- Defined unconditionally: a plpgsql body is resolved when it runs, not when it
-- is created, so these are valid even on a fresh database whose content_* tables
-- do not exist yet (section 4 attaches them once they do).

-- updated_by is now the database's answer, not the caller's. The admin actions
-- still send it (lib/admin/actions/*.ts) and send the same value; a payload that
-- claims someone else's email is overwritten. Service-role callers (the seed
-- script, the cron content scan) have no request.jwt.claims, so their
-- NEW.updated_by is kept as sent — that is the only way those paths can record
-- an actor at all.
create or replace function public.stamp_content_actor()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  jwt_email text := nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'email';
begin
  if jwt_email is not null and jwt_email <> '' then
    new.updated_by := jwt_email;
  end if;
  return new;
end;
$$;

comment on function public.stamp_content_actor() is
  'BEFORE INSERT OR UPDATE on every content_* table: forces updated_by to the caller''s JWT email when there is one, otherwise keeps the value the caller sent (service-role seed/cron).';

-- Replaces the 0002 version. Three changes:
--   * SECURITY DEFINER + `set search_path = ''`: history is written by the
--     database itself, so `authenticated` no longer needs (and no longer has,
--     see section 4) INSERT on content_versions.
--   * DELETE is snapshotted too, and returns OLD so the delete proceeds. A
--     cascaded delete of content_packages (group_id ... on delete cascade) is a
--     real row delete on that table, so this row-level trigger fires for it too
--     and a package's history survives its group.
--   * op records which of the two produced the snapshot.
create or replace function public.snapshot_content_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_email text := nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'email';
begin
  if tg_op = 'DELETE' then
    insert into public.content_versions (table_name, row_id, snapshot, actor, op)
    values (tg_table_name, old.id, to_jsonb(old), actor_email, 'delete');
    return old;
  end if;

  insert into public.content_versions (table_name, row_id, snapshot, actor, op)
  values (tg_table_name, old.id, to_jsonb(old), actor_email, 'update');
  new.version := old.version + 1;
  return new;
end;
$$;

comment on function public.snapshot_content_version() is
  'BEFORE UPDATE / BEFORE DELETE on every content_* table: appends the pre-change row to content_versions (op = update|delete) and bumps version on update. SECURITY DEFINER so the append needs no INSERT grant on content_versions.';

-- =============================================================================
-- Section 4 — content integrity (needs 0002 and 0010-0012)
-- =============================================================================

do $content$
declare
  content_tables constant text[] := array[
    'content_scripts', 'content_objections', 'content_faqs', 'content_competitors',
    'content_package_groups', 'content_packages', 'content_products',
    'content_changelog', 'content_contacts', 'content_sops'
  ];
  t text;
  missing text[] := '{}';
  seq text;
  fn_owner text;
  tbl_owner text;
begin
  foreach t in array content_tables loop
    if to_regclass('public.' || quote_ident(t)) is null then
      missing := missing || t;
    end if;
  end loop;

  -- Nothing from 0002 onwards is applied yet: this run is the fresh-database
  -- bootstrap described at the top of the file.
  if array_length(missing, 1) = array_length(content_tables, 1) then
    raise notice '0013: no content_* table found — baseline sections applied only. Run 0001-0012, then re-run this file.';
    return;
  end if;

  if array_length(missing, 1) > 0 then
    raise exception '0013: content tables missing (%). Apply migrations 0010-0012 first, then re-run this file.',
      array_to_string(missing, ', ');
  end if;

  if to_regclass('public.content_versions') is null then
    raise exception '0013: public.content_versions is missing — apply 0002 first.';
  end if;

  -- --- content_versions.op --------------------------------------------------
  -- Every row that exists today came from the BEFORE UPDATE trigger, so the
  -- 'update' default backfills them correctly and the CHECK can be validated.
  alter table public.content_versions add column if not exists op text not null default 'update';

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.content_versions'::regclass
      and conname = 'content_versions_op_chk'
  ) then
    alter table public.content_versions
      add constraint content_versions_op_chk check (op in ('update', 'delete'));
  end if;

  -- --- publish gate + triggers ----------------------------------------------
  -- status: a row now has to be published deliberately. Any insert that does not
  -- name a status — psql, a future importer, a forgotten column in an admin
  -- form — lands as a draft instead of going straight to the operators.
  --
  -- The triggers are dropped and recreated so a database whose triggers were
  -- made by hand ends up with exactly this set. Firing order for BEFORE UPDATE
  -- is alphabetical: trg_set_updated_at, trg_snapshot_version,
  -- trg_stamp_content_actor — each writes a different field, and the snapshot
  -- only reads OLD.
  foreach t in array content_tables loop
    execute format('alter table public.%I alter column status set default ''draft''', t);

    execute format('drop trigger if exists trg_set_updated_at on public.%I', t);
    execute format(
      'create trigger trg_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);

    execute format('drop trigger if exists trg_stamp_content_actor on public.%I', t);
    execute format(
      'create trigger trg_stamp_content_actor before insert or update on public.%I for each row execute function public.stamp_content_actor()', t);

    execute format('drop trigger if exists trg_snapshot_version on public.%I', t);
    execute format(
      'create trigger trg_snapshot_version before update on public.%I for each row execute function public.snapshot_content_version()', t);

    execute format('drop trigger if exists trg_snapshot_version_delete on public.%I', t);
    execute format(
      'create trigger trg_snapshot_version_delete before delete on public.%I for each row execute function public.snapshot_content_version()', t);
  end loop;

  -- --- content_versions is append-only, and only the database appends --------
  -- 0002 let any manager insert whatever history they liked. The snapshot
  -- trigger is SECURITY DEFINER now, so nothing in the app needs these
  -- privileges: managers read history (content_versions_manager_select) and
  -- restore it through an UPDATE on the content table (restoreVersion).
  drop policy if exists "content_versions_manager_insert" on public.content_versions;
  revoke insert, update, delete on table public.content_versions from authenticated;

  seq := pg_get_serial_sequence('public.content_versions', 'id');
  if seq is not null then
    execute format('revoke usage, select on sequence %s from authenticated', seq);
  end if;

  -- SECURITY DEFINER only bypasses the grants revoked above if the function
  -- belongs to the table's owner. `create or replace function` keeps the
  -- original owner, so warn instead of failing when the two have drifted apart.
  select pg_get_userbyid(p.proowner) into fn_owner
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'snapshot_content_version';

  select pg_get_userbyid(c.relowner) into tbl_owner
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'content_versions';

  if fn_owner is distinct from tbl_owner then
    raise notice '0013: snapshot_content_version() is owned by % but public.content_versions by % — content writes will fail until you run: alter function public.snapshot_content_version() owner to %;',
      fn_owner, tbl_owner, tbl_owner;
  end if;
end
$content$;

commit;
