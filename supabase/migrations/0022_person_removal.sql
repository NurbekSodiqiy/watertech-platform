-- R3 / person removal — an operator or a sales manager can be removed from the
-- allow-list at /admin/users, optionally together with their activity history.
--
-- Until now a person added on "Xodimlar" could only be deactivated: 0017 gave
-- `authenticated` INSERT and UPDATE on public.allowed_users but no DELETE, so a
-- person who left the company stayed on the list for good. This file adds the
-- two database halves of "remove" (the Supabase Auth account is deleted by the
-- app, lib/admin/actions/user-access.ts):
--
--   1. DELETE on public.allowed_users for an admin session — a grant and one
--      policy, nothing else. Every rule a delete must obey is already in
--      private.allowed_users_guard (0017 binding: BEFORE INSERT OR UPDATE OR
--      DELETE, for each row; 0020 body), which a DELETE meets in this order:
--        WT403  the caller's JWT email is not an active admin row (a stale
--               admin token);
--        WT460  the row is the last active admin — for every caller;
--        WT461  the row is the caller's own;
--        WT462  the row is an admin's, and the delete carries a JWT (a session
--               or the service-role key): admin rows stay SQL-editor-only.
--      private.audit_allowed_users (AFTER, 0017) appends every delete to
--      public.access_audit (action 'delete', the whole row as `before`), which
--      is the record that the person was removed and by whom. Nothing here
--      repeats those checks.
--
--   2. public.admin_purge_person_history(p_email) — deletes one person's rows
--      from the three tables keyed by their email with no foreign key:
--      telemetry_events.user_email, user_state.user_email and copilot_logs.email.
--      Returns {"telemetry": n, "user_state": n, "copilot": n}. It refuses, in
--      this order: WT403 a caller who is not an admin (the claim — its first
--      statement — and then, like the guard, their current allow-list row);
--      WT400 an empty email; WT461 the caller's own email; WT462 an email whose
--      allow-list row is an admin's. The email is normalised with lower(btrim()).
--
--      It does NOT require the allow-list row to be gone. The removal purges
--      first and deletes the row last, so that a retry after a failure at any
--      step repeats every step: the row is what the retry finds the person by.
--      It also works for an email that is no longer on the list at all.
--
--      Rows match on the email exactly, after normalising the argument. Every
--      writer stores the email of the caller's own JWT (/api/events and
--      /api/copilot from the verified session, user_state from its column
--      default), which GoTrue keeps lowercase, and every read of these tables
--      (0016, 0017, 0021) matches the same way — so the purge deletes exactly
--      what the person page shows, through each table's email index.
--
--      public.access_audit is never touched: it is the record of the removal.
--
-- SECURITY DEFINER, not INVOKER. The 0016 / 0021 functions are INVOKER because
-- they only read, and an admin's own read policies already cover those rows.
-- A delete has no such policy, and INVOKER would need new privileges: DELETE on
-- telemetry_events for `authenticated` (0013 revoked it on purpose) and on
-- copilot_logs (0006 granted only SELECT), plus an admin-wide DELETE policy on
-- all three tables. Those would let any admin session delete anybody's history
-- straight over PostgREST — their own and an admin's included — around every
-- check this function makes. As DEFINER the function is the only way in, and
-- the only new privilege is EXECUTE for `authenticated`. Same reasoning as
-- 0016's run_retention (rows no session role may delete) and 0017's guard and
-- audit triggers. `set search_path = ''`, every name qualified. Section 3 makes
-- sure the function's owner really skips RLS on the tables it reads and
-- deletes from: a purge that silently deleted nothing would be worse than this
-- file failing.
--
-- Re-running 0017 after this file revokes the DELETE grant again (its
-- `revoke all … from authenticated`); re-run this file after it.
--
-- APPLY ORDER (see docs/MIGRATIONS.md): after 0021. Re-running it is safe.
-- Run as `postgres` in the SQL editor with role impersonation off: the purge
-- function must belong to the owner of the tables it deletes from.

begin;

-- =============================================================================
-- Section 0 — preflight
-- =============================================================================

do $preflight$
declare
  missing text[] := '{}';
  guard_src text;
begin
  if to_regprocedure('private.is_admin()') is null then
    raise exception '0022: private.is_admin() is missing — apply 0020_roles_admin_manager.sql first (docs/MIGRATIONS.md), then re-run this file.';
  end if;

  if to_regclass('public.allowed_users') is null or to_regclass('public.access_audit') is null then
    raise exception '0022: public.allowed_users / public.access_audit missing — apply 0013 and 0017 first (docs/MIGRATIONS.md).';
  end if;

  -- The guard must be 0020's body: 0017's knows no admin rows, so under it an
  -- admin session could delete another admin (WT462 is 0020's).
  select p.prosrc into guard_src
  from pg_catalog.pg_proc p
  where p.oid = to_regprocedure('private.allowed_users_guard()');
  if guard_src is null or position('WT462' in guard_src) = 0 then
    raise exception '0022: private.allowed_users_guard() is missing or predates 0020 (no WT462) — apply 0020_roles_admin_manager.sql first, then re-run this file.';
  end if;

  -- Both triggers must fire on DELETE (tgtype bit 3, TRIGGER_TYPE_DELETE).
  if not exists (
    select 1 from pg_catalog.pg_trigger t
    where t.tgrelid = 'public.allowed_users'::regclass
      and t.tgname = 'trg_allowed_users_guard'
      and not t.tgisinternal
      and (t.tgtype::integer & 8) <> 0
  ) then
    missing := missing || 'trigger trg_allowed_users_guard (BEFORE … DELETE) on public.allowed_users (0017)'::text;
  end if;
  if not exists (
    select 1 from pg_catalog.pg_trigger t
    where t.tgrelid = 'public.allowed_users'::regclass
      and t.tgname = 'trg_allowed_users_audit'
      and not t.tgisinternal
      and (t.tgtype::integer & 8) <> 0
  ) then
    missing := missing || 'trigger trg_allowed_users_audit (AFTER … DELETE) on public.allowed_users (0017)'::text;
  end if;

  -- The three tables the purge deletes from, and their email columns.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'telemetry_events' and column_name = 'user_email'
  ) then
    missing := missing || 'public.telemetry_events.user_email (0013)'::text;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'user_state' and column_name = 'user_email'
  ) then
    missing := missing || 'public.user_state.user_email (0009)'::text;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'copilot_logs' and column_name = 'email'
  ) then
    missing := missing || 'public.copilot_logs.email (0006)'::text;
  end if;

  if array_length(missing, 1) is not null then
    raise exception '0022: missing %. Apply the files named (docs/MIGRATIONS.md), then re-run this file.',
      array_to_string(missing, ', ');
  end if;

  -- With a JWT on the session (the SQL editor's role impersonation) the
  -- function below would be created by — and owned by — the impersonated role.
  if nullif(current_setting('request.jwt.claims', true), '') is not null then
    raise exception '0022: request.jwt.claims is set on this session — run this file as postgres with role impersonation off.';
  end if;
end
$preflight$;

-- =============================================================================
-- Section 1 — allowed_users: an admin session may delete a row
-- =============================================================================
-- Table-level DELETE (a delete has no columns to limit). The policy asks only
-- "is this an admin session"; the guard trigger decides everything else, per
-- row and under its advisory lock. A sales manager's or an operator's DELETE
-- sees no row through this policy, so it deletes nothing and never reaches the
-- guard.

grant delete on table public.allowed_users to authenticated;

drop policy if exists "allowed_users_admin_delete" on public.allowed_users;
create policy "allowed_users_admin_delete" on public.allowed_users
  for delete to authenticated
  using ((select private.is_admin()));

-- =============================================================================
-- Section 2 — public.admin_purge_person_history(p_email)
-- =============================================================================

create or replace function public.admin_purge_person_history(p_email text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  claims constant jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  actor constant text := lower(btrim(coalesce(claims ->> 'email', '')));
  v_email constant text := lower(btrim(coalesce(p_email, '')));
  telemetry_deleted bigint;
  user_state_deleted bigint;
  copilot_deleted bigint;
begin
  -- The claim first, before any lock: an operator's or a sales manager's call
  -- ends here and never waits on, or holds up, an allow-list write.
  if not (select private.is_admin()) then
    raise exception 'admin_purge_person_history: admin role required' using errcode = 'WT403';
  end if;

  -- The allow-list guard's lock (0017), so the checks below cannot interleave
  -- with an allow-list write — a promotion in the SQL editor, a demotion of the
  -- caller. Released at commit or rollback.
  perform pg_catalog.pg_advisory_xact_lock('public.allowed_users'::regclass::oid::bigint);

  -- Like the guard: the caller's row must still be an active admin. A demoted
  -- or deactivated admin keeps an admin token for up to an hour.
  if actor = '' or not exists (
    select 1 from public.allowed_users a
    where lower(a.email) = actor and a.role = 'admin' and a.is_active
  ) then
    raise exception 'admin_purge_person_history: the caller is not an active admin' using errcode = 'WT403';
  end if;

  if v_email = '' then
    raise exception 'admin_purge_person_history: p_email must be a non-empty email' using errcode = 'WT400';
  end if;

  -- Same order as the guard: self (WT461) before admin rows (WT462). Messages
  -- name no email — they reach the server log.
  if v_email = actor then
    raise exception 'admin_purge_person_history: an admin cannot purge their own history' using errcode = 'WT461';
  end if;

  if exists (
    select 1 from public.allowed_users a
    where lower(a.email) = v_email and a.role = 'admin'
  ) then
    raise exception 'admin_purge_person_history: an admin row is managed in the SQL editor only' using errcode = 'WT462';
  end if;

  delete from public.telemetry_events e where e.user_email = v_email;
  get diagnostics telemetry_deleted = row_count;

  delete from public.user_state s where s.user_email = v_email;
  get diagnostics user_state_deleted = row_count;

  delete from public.copilot_logs l where l.email = v_email;
  get diagnostics copilot_deleted = row_count;

  return jsonb_build_object(
    'telemetry', telemetry_deleted,
    'user_state', user_state_deleted,
    'copilot', copilot_deleted
  );
end;
$$;

comment on function public.admin_purge_person_history(text) is
  'Deletes one person''s telemetry_events, user_state and copilot_logs rows (email lower(btrim())-normalised, exact match) and returns {"telemetry", "user_state", "copilot"} counts. Admin only: WT403 for a non-admin claim or a caller whose row is not an active admin; WT400 empty email; WT461 own email; WT462 an admin row''s email. Does not require the allow-list row to be gone; never touches access_audit. SECURITY DEFINER (0022 header).';

-- `create function` grants EXECUTE to PUBLIC, and Supabase's default privileges
-- grant it to anon, authenticated and service_role directly — revoke those,
-- then grant the one role an admin's session uses. An operator or a sales
-- manager is also `authenticated`: the first statement refuses them (WT403).
revoke all on function public.admin_purge_person_history(text) from public, anon, service_role;
grant execute on function public.admin_purge_person_history(text) to authenticated;

-- =============================================================================
-- Section 3 — the purge runs as someone RLS does not narrow
-- =============================================================================
-- A SECURITY DEFINER function skips RLS only if its owner is a superuser, has
-- BYPASSRLS, or owns the table (and the table does not FORCE row level
-- security). Otherwise RLS applies to it with no policy to pass: it cannot see
-- the caller's allow-list row (every call WT403), or — were allowed_users
-- readable — its deletes match nothing and it reports zeros while the history
-- stays. That is checked here, once, rather than discovered by the owner later:
-- the owner must skip RLS on all four tables, read allowed_users and delete
-- from the other three.

do $owner$
declare
  fn_owner oid;
  fn_owner_name text;
  bypasses boolean;
  t record;
  problems text[] := '{}';
begin
  select p.proowner into fn_owner
  from pg_catalog.pg_proc p
  where p.oid = 'public.admin_purge_person_history(text)'::regprocedure;

  select r.rolname, (r.rolsuper or r.rolbypassrls) into fn_owner_name, bypasses
  from pg_catalog.pg_roles r
  where r.oid = fn_owner;

  for t in
    select
      c.oid,
      c.relowner,
      c.relforcerowsecurity,
      format('%I.%I', n.nspname, c.relname) as name,
      case when c.relname = 'allowed_users' then 'SELECT' else 'DELETE' end as needed
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname in ('allowed_users', 'telemetry_events', 'user_state', 'copilot_logs')
  loop
    if not (bypasses or (t.relowner = fn_owner and not t.relforcerowsecurity)) then
      problems := problems || format('%s (owned by %s)', t.name, pg_catalog.pg_get_userbyid(t.relowner));
    elsif not pg_catalog.has_table_privilege(fn_owner, t.oid, t.needed) then
      problems := problems || format('%s (no %s for %s)', t.name, t.needed, fn_owner_name);
    end if;
  end loop;

  if array_length(problems, 1) is not null then
    raise exception '0022: public.admin_purge_person_history() runs as %, which RLS would narrow on: % — the purge would refuse every caller or silently remove nothing. Run this file as the owner of those tables (postgres), or give them to it (alter table … owner to %), then re-run it.',
      fn_owner_name, array_to_string(problems, ', '), fn_owner_name;
  end if;
end
$owner$;

-- PostgREST picks up new functions from its schema cache; Supabase reloads it
-- on DDL, and this makes sure of it.
notify pgrst, 'reload schema';

commit;
