-- Audit-2 / S10 — the allow-list gets an admin UI, database-side guards and an
-- audit trail.
--
-- Until now public.allowed_users could only be edited in the Supabase SQL
-- editor: no UI, no record of who changed what, and nothing stopping a typo
-- from demoting the last manager (after which nobody could reach /admin at
-- all). This file makes the table writable by managers through
-- /admin/users, and puts every rule that page relies on into the database,
-- where a direct PostgREST call with a manager's JWT meets it too:
--
--   1. Managers may INSERT rows and UPDATE role / is_active / full_name —
--      nothing else. Column-level grants, not the UI, decide which columns;
--      email, created_at, updated_at and updated_by are not writable by any
--      session role. There is still no DELETE: deactivating keeps the row and
--      its history (telemetry and copilot logs reference the email).
--   2. private.allowed_users_guard (BEFORE INSERT/UPDATE/DELETE) refuses
--        WT403  a caller whose JWT says manager but whose allow-list row no
--               longer does — a demoted or deactivated manager keeps a
--               manager token until it expires (docs/SECURITY.md §4), and
--               without this check could use it to re-promote themselves;
--        WT460  any change that would leave no active manager;
--        WT461  a manager demoting, deactivating or deleting their own row.
--      The last two are what lib/admin/errors.ts calls `last_manager` and
--      `self_change`. WT460 is checked first, so a sole manager demoting
--      themselves hears "last manager", which says what to do next.
--   3. public.access_audit (append-only) gets one row per effective change,
--      written by private.audit_allowed_users (AFTER, SECURITY DEFINER), so
--      the SQL editor and service_role are audited exactly like the UI.
--   4. public.admin_user_last_activity() — max(telemetry ts) per allow-listed
--      email, for the "last activity" column. Manager only (WT403).
--
-- Session revocation on deactivate (the Supabase Auth ban) is not SQL — it is
-- lib/admin/actions/user-access.ts, after this file's UPDATE succeeds.
--
-- Concurrency: every guarded write takes one transaction-scoped advisory lock
-- first, so two managers deactivating each other at the same moment are
-- serialised — the second one re-counts after the first commits (READ
-- COMMITTED, PostgREST's and the SQL editor's default) and is refused.
--
-- APPLY ORDER (see docs/MIGRATIONS.md): after 0016. Re-running it is safe.
-- Run as `postgres` in the SQL editor: the guard and audit functions are
-- SECURITY DEFINER and must belong to the owner of allowed_users/access_audit.

begin;

-- =============================================================================
-- Section 0 — preflight
-- =============================================================================

do $preflight$
declare
  missing_columns text[];
  active_managers bigint;
  mixed_case bigint;
begin
  if to_regprocedure('private.is_manager()') is null then
    raise exception '0017: private.is_manager() is missing — apply 0014_role_gated_rls.sql first.';
  end if;

  if to_regclass('public.allowed_users') is null or to_regclass('public.telemetry_events') is null then
    raise exception '0017: public.allowed_users / public.telemetry_events missing — apply 0013 first.';
  end if;

  -- Reused unchanged from 0002 / 0013 rather than copied.
  if to_regprocedure('public.set_updated_at()') is null or to_regprocedure('public.stamp_content_actor()') is null then
    raise exception '0017: public.set_updated_at() / public.stamp_content_actor() missing — apply 0002 and 0013 first.';
  end if;

  select array_agg(c) into missing_columns
  from unnest(array['full_name', 'is_active', 'created_at', 'updated_at', 'updated_by']) as c
  where not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'allowed_users' and column_name = c
  );
  if missing_columns is not null then
    raise exception '0017: allowed_users is missing column(s) % — apply 0013 first.', array_to_string(missing_columns, ', ');
  end if;

  -- Nothing here can create a manager, and the guard only ever refuses to
  -- remove one — so a project with none has to add the first by hand.
  select count(*) into active_managers
  from public.allowed_users a
  where a.role = 'manager' and a.is_active;
  if active_managers = 0 then
    raise notice '0017: there is no active manager — nobody can open /admin/users. Add one in the SQL editor: insert into public.allowed_users (email, role) values (''you@company.uz'', ''manager'');';
  end if;

  -- 0013 added the lowercase CHECK as NOT VALID. The admin actions address a
  -- row by its lowercased email, so a legacy mixed-case row is listed on
  -- /admin/users but cannot be changed there until it is normalised.
  select count(*) into mixed_case
  from public.allowed_users a
  where a.email <> lower(a.email);
  if mixed_case > 0 then
    raise notice '0017: % allowed_users row(s) are not lowercase and cannot be edited from /admin/users. Fix with: update public.allowed_users set email = lower(email) where email <> lower(email);', mixed_case;
  end if;
end
$preflight$;

-- =============================================================================
-- Section 1 — public.access_audit
-- =============================================================================
-- Append-only, like content_gate_reports and copilot_logs: a row is never
-- updated, so it carries created_at and actor instead of updated_at /
-- updated_by. `before` is null for an insert, `after` null for a delete; both
-- are the whole allowed_users row as jsonb.
--
-- actor: the caller's JWT email; else the JWT role (service_role through the
-- API); else the database login (postgres in the SQL editor).

create table if not exists public.access_audit (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor text not null,
  target_email text not null,
  action text not null
    constraint access_audit_action_chk check (action in ('insert', 'update', 'delete')),
  before jsonb,
  after jsonb
);

comment on table public.access_audit is
  'Append-only history of public.allowed_users: one row per effective insert/update/delete, written by private.audit_allowed_users(). Managers read it; nobody writes it directly.';

-- "What happened to this person", newest first — and the retention-free
-- full scan stays cheap at this table's size (a few rows per user per year).
create index if not exists access_audit_target_created_idx
  on public.access_audit (target_email, created_at desc);

alter table public.access_audit enable row level security;

drop policy if exists "access_audit_manager_select" on public.access_audit;
create policy "access_audit_manager_select" on public.access_audit
  for select to authenticated
  using ((select private.is_manager()));

-- Read-only for every API role, service_role included: the only writer is the
-- SECURITY DEFINER trigger below, which runs as the table owner. Supabase's
-- default privileges grant ALL to anon/authenticated/service_role on a new
-- public table, so revoke everything first.
revoke all on table public.access_audit from public, anon, authenticated, service_role;
grant select on table public.access_audit to authenticated, service_role;

-- The grants above already stop every API role. This also stops the owner
-- (postgres in the SQL editor) from rewriting history by accident; dropping
-- the trigger first is the deliberate, visible way to do that.
create or replace function private.access_audit_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'access_audit is append-only (% refused)', lower(tg_op)
    using errcode = 'insufficient_privilege';
end;
$$;

comment on function private.access_audit_append_only() is
  'BEFORE UPDATE/DELETE/TRUNCATE on public.access_audit: always raises. The audit trail is append-only.';

drop trigger if exists trg_access_audit_append_only on public.access_audit;
create trigger trg_access_audit_append_only
  before update or delete on public.access_audit
  for each row execute function private.access_audit_append_only();

drop trigger if exists trg_access_audit_no_truncate on public.access_audit;
create trigger trg_access_audit_no_truncate
  before truncate on public.access_audit
  for each statement execute function private.access_audit_append_only();

-- =============================================================================
-- Section 2 — allowed_users: who may write which columns
-- =============================================================================
-- A table-level REVOKE also clears every column-level grant on the table, so
-- this converges a database whose grants were edited by hand before the two
-- column lists are granted. anon never needed anything here; Supabase's
-- default privileges gave it ALL, which only RLS was holding back.

revoke all on table public.allowed_users from anon, authenticated;
grant select on table public.allowed_users to authenticated;
grant insert (email, role, full_name, is_active) on table public.allowed_users to authenticated;
grant update (role, is_active, full_name) on table public.allowed_users to authenticated;

-- The read policy ("allowed_users_manager_select_all", 0014) is unchanged.
-- Writes are manager-only; the guard trigger (Section 3) adds what a policy
-- cannot express: the caller's *current* row, the last manager, and self.
drop policy if exists "allowed_users_manager_insert" on public.allowed_users;
create policy "allowed_users_manager_insert" on public.allowed_users
  for insert to authenticated
  with check ((select private.is_manager()));

drop policy if exists "allowed_users_manager_update" on public.allowed_users;
create policy "allowed_users_manager_update" on public.allowed_users
  for update to authenticated
  using ((select private.is_manager()))
  with check ((select private.is_manager()));

-- =============================================================================
-- Section 3 — private.allowed_users_guard()
-- =============================================================================
-- SECURITY DEFINER so the active-manager count is never narrowed by the
-- caller's RLS; `set search_path = ''`, every name qualified. VOLATILE (the
-- default) on purpose: each query inside takes a fresh snapshot, which is
-- what lets the count see a concurrent transaction's committed change once
-- the advisory lock is ours, and what lets a multi-row UPDATE see the rows it
-- has already changed.
--
-- A caller with no email claim — service_role over the API, or the SQL
-- editor — skips the actor and self checks (there is no "self"), but never
-- the last-manager check.
--
-- The messages name no email: they reach the server log (logDbError), and
-- the client only ever sees the SQLSTATE turned into a code.

create or replace function private.allowed_users_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor text := lower(trim(coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email', ''
  )));
  was_active_manager boolean;
  stays_active_manager boolean;
  other_managers bigint;
begin
  -- One writer at a time for the whole allow-list. Released at commit or
  -- rollback. Keyed on the table's own OID, so it cannot collide with an
  -- advisory lock taken for anything else.
  perform pg_catalog.pg_advisory_xact_lock('public.allowed_users'::regclass::oid::bigint);

  if actor <> '' and not exists (
    select 1 from public.allowed_users a
    where lower(a.email) = actor and a.role = 'manager' and a.is_active
  ) then
    raise exception 'allowed_users: the caller is not an active manager'
      using errcode = 'WT403';
  end if;

  if tg_op = 'INSERT' then
    return new;
  end if;

  was_active_manager := old.role = 'manager' and old.is_active;
  stays_active_manager := tg_op = 'UPDATE' and new.role = 'manager' and new.is_active;

  if was_active_manager and not stays_active_manager then
    select count(*) into other_managers
    from public.allowed_users a
    where a.role = 'manager' and a.is_active and a.email <> old.email;

    if other_managers = 0 then
      raise exception 'allowed_users: this change would leave no active manager'
        using errcode = 'WT460';
    end if;
  end if;

  if actor <> '' and lower(old.email) = actor and not stays_active_manager then
    raise exception 'allowed_users: a manager cannot demote, deactivate or delete their own row'
      using errcode = 'WT461';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

comment on function private.allowed_users_guard() is
  'BEFORE INSERT/UPDATE/DELETE on public.allowed_users. WT403: JWT caller is not an active manager row. WT460: would leave no active manager. WT461: a manager demoting/deactivating/deleting their own row. Serialised by an advisory lock on the table OID.';

-- =============================================================================
-- Section 4 — private.audit_allowed_users()
-- =============================================================================
-- AFTER, so only a change that actually happened is recorded (a guard refusal
-- or a failed constraint writes nothing). An UPDATE that leaves email, role,
-- is_active and full_name as they were — a retried deactivation, say — is
-- not an event and writes no row.

create or replace function private.audit_allowed_users()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  actor text := coalesce(nullif(claims ->> 'email', ''), nullif(claims ->> 'role', ''), session_user::text);
begin
  if tg_op = 'UPDATE'
     and (old.email, old.role, old.is_active, old.full_name)
         is not distinct from (new.email, new.role, new.is_active, new.full_name) then
    return null;
  end if;

  insert into public.access_audit (actor, target_email, action, before, after)
  values (
    actor,
    case when tg_op = 'INSERT' then new.email else old.email end,
    lower(tg_op),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return null;
end;
$$;

comment on function private.audit_allowed_users() is
  'AFTER INSERT/UPDATE/DELETE on public.allowed_users: appends the change to public.access_audit (no row for an update that changes none of email/role/is_active/full_name). SECURITY DEFINER: no API role may insert into access_audit.';

-- Trigger functions are never called by name, so no role needs EXECUTE (it is
-- checked when a trigger is created, not when it fires).
revoke all on function
  private.access_audit_append_only(),
  private.allowed_users_guard(),
  private.audit_allowed_users()
  from public, anon, authenticated, service_role;

-- SECURITY DEFINER only bypasses the grants revoked above if the functions
-- belong to the tables' owner — same check as 0013 makes for
-- snapshot_content_version().
do $owners$
declare
  f text;
  fn_owner text;
  tbl_owner text;
begin
  select pg_catalog.pg_get_userbyid(c.relowner) into tbl_owner
  from pg_catalog.pg_class c
  where c.oid = 'public.access_audit'::regclass;

  foreach f in array array['private.allowed_users_guard()', 'private.audit_allowed_users()'] loop
    select pg_catalog.pg_get_userbyid(p.proowner) into fn_owner
    from pg_catalog.pg_proc p
    where p.oid = to_regprocedure(f);

    if fn_owner is distinct from tbl_owner then
      raise notice '0017: % is owned by % but public.access_audit by % — allow-list writes will fail until you run: alter function % owner to %;',
        f, fn_owner, tbl_owner, f, tbl_owner;
    end if;
  end loop;
end
$owners$;

-- =============================================================================
-- Section 5 — triggers on allowed_users
-- =============================================================================
-- BEFORE triggers fire in name order: the guard first, then the two stamps
-- (0002's set_updated_at, 0013's stamp_content_actor — generic despite its
-- name: it sets updated_by from the JWT email and keeps a service-role
-- caller's own value). None of them writes a column another one reads.

drop trigger if exists trg_allowed_users_guard on public.allowed_users;
create trigger trg_allowed_users_guard
  before insert or update or delete on public.allowed_users
  for each row execute function private.allowed_users_guard();

drop trigger if exists trg_set_updated_at on public.allowed_users;
create trigger trg_set_updated_at
  before update on public.allowed_users
  for each row execute function public.set_updated_at();

drop trigger if exists trg_stamp_actor on public.allowed_users;
create trigger trg_stamp_actor
  before insert or update on public.allowed_users
  for each row execute function public.stamp_content_actor();

drop trigger if exists trg_allowed_users_audit on public.allowed_users;
create trigger trg_allowed_users_audit
  after insert or update or delete on public.allowed_users
  for each row execute function private.audit_allowed_users();

-- =============================================================================
-- Section 6 — public.admin_user_last_activity()
-- =============================================================================
-- One row per allow-listed email, with the newest telemetry event's ts (null
-- when there is none — never signed in, or older than the 180-day retention).
-- A correlated max per member rather than a GROUP BY over the whole table:
-- each is one backward probe of telemetry_events_user_email_ts_idx (0013), so
-- the cost follows the size of the allow-list, not of the telemetry.
--
-- SECURITY INVOKER: the manager's own read policies on both tables apply.
-- Output columns are named so they never collide with a table column (the
-- same rule as 0016's dashboard functions).

create or replace function public.admin_user_last_activity()
returns table (member_email text, last_seen_at timestamptz)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_manager()) then
    raise exception 'admin_user_last_activity: manager role required' using errcode = 'WT403';
  end if;

  return query
  select
    a.email,
    (select max(e.ts) from public.telemetry_events e where e.user_email = a.email)
  from public.allowed_users a
  order by a.email;
end;
$$;

comment on function public.admin_user_last_activity() is
  'Newest telemetry_events.ts per allowed_users email (null when none). Manager only (WT403). Feeds the "last activity" column on /admin/users.';

revoke all on function public.admin_user_last_activity() from public, anon, service_role;
grant execute on function public.admin_user_last_activity() to authenticated;

notify pgrst, 'reload schema';

commit;
