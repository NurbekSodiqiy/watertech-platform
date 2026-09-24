-- R3 / S01 — role model v2: admin (the owner) · manager (sales manager) · operator.
--
-- Until now there were two roles, and `manager` meant the one person who runs
-- the CMS: /admin, /dashboard, every draft, the allow-list. The company now has
-- sales managers who work in the operator app exactly like operators, and the
-- word belongs to them. This file moves the owner to a new role and gives
-- `manager` an operator's access:
--
--   admin     the owner — everything the old `manager` could do.
--   manager   a sales manager — what an operator can do: published content and
--             their own user_state. No drafts, no dashboard tables, no
--             allow-list, no dashboard_* / copilot_* / admin_* function.
--   operator  unchanged.
--
-- How, without rewriting the ~60 policies and function bodies of 0014–0019:
-- they all ask private.is_manager() BY NAME, so that function now answers
-- `private.is_admin()`. Every "manager" in their names, comments and error
-- messages therefore means "admin" from here on, and a sales manager's JWT
-- fails every one of them. private.is_member() gains the third role. The
-- access-token hook (0014 §5) stamps allowed_users.role verbatim and needs no
-- change: an 'admin' row gets an 'admin' claim.
--
-- Admin rows are SQL-editor-only. The guard trigger refuses (WT462) any write
-- that carries a JWT — /admin/users, a direct PostgREST call, the service-role
-- key — and creates an admin row, promotes a row to admin, or changes the
-- role, active flag or email of (or deletes) an admin row. /admin/users
-- assigns operator and manager only.
--
-- Data: every 'manager' row — today that is only the owner — becomes 'admin',
-- once. A re-run must never promote the sales managers added after it, so the
-- conversion runs only on this file's first application (Section 6).
--
-- A person's new role reaches them at their next token refresh (≤ 1 h). Until
-- then the owner's token still says 'manager', which after this file opens the
-- operator app and nothing else: sign out and back in (docs/MIGRATIONS.md).
--
-- The same reasoning makes any policy that compares the role claim to the
-- literal 'manager' a hole from here on, so the preflight refuses to run while
-- one exists (a hand-made policy on the pre-migration live tables would be one)
-- and names the `drop policy` statements. For the same reason, never re-run
-- 0013 on its own after this file: it re-creates the allowed_users and
-- telemetry_events read policies with that literal. Re-run 0014 straight
-- after it if you do.
--
-- APPLY ORDER (see docs/MIGRATIONS.md): after 0019. Re-running it is safe.
-- Run as `postgres` in the SQL editor with no role impersonation: the guard
-- (SECURITY DEFINER) must belong to the owner of allowed_users, and the
-- conversion is an admin-row write, which only a JWT-less session may make.

begin;

-- =============================================================================
-- Section 0 — preflight
-- =============================================================================

do $preflight$
declare
  missing text[] := '{}';
  unknown_roles text;
  literal_reapply text;
  literal_drops text;
begin
  if to_regclass('public.allowed_users') is null then
    raise exception '0020: public.allowed_users is missing — apply 0013 first (docs/MIGRATIONS.md), then re-run this file.';
  end if;

  if to_regprocedure('private.app_role()') is null then
    missing := missing || 'private.app_role() (0014)'::text;
  end if;
  if to_regprocedure('private.is_member()') is null then
    missing := missing || 'private.is_member() (0014)'::text;
  end if;
  if to_regprocedure('private.is_manager()') is null then
    missing := missing || 'private.is_manager() (0014)'::text;
  end if;
  if to_regprocedure('private.allowed_users_guard()') is null then
    missing := missing || 'private.allowed_users_guard() (0017)'::text;
  end if;
  if not exists (
    select 1 from pg_catalog.pg_trigger t
    where t.tgrelid = 'public.allowed_users'::regclass
      and t.tgname = 'trg_allowed_users_guard'
      and not t.tgisinternal
  ) then
    missing := missing || 'trigger trg_allowed_users_guard on public.allowed_users (0017)'::text;
  end if;
  if to_regclass('public.access_audit') is null then
    missing := missing || 'public.access_audit (0017)'::text;
  end if;

  if array_length(missing, 1) is not null then
    raise exception '0020: missing %. Apply 0014_role_gated_rls.sql and 0017_user_admin_and_access_audit.sql first (docs/MIGRATIONS.md), then re-run this file.',
      array_to_string(missing, ', ');
  end if;

  -- 0013 added allowed_users_role_chk NOT VALID, so a legacy row may hold a
  -- role outside the new CHECK, which Section 4 validates.
  select string_agg(format('%s (role %L)', a.email, a.role), ', ' order by a.email)
    into unknown_roles
  from public.allowed_users a
  where a.role not in ('operator', 'manager', 'admin');
  if unknown_roles is not null then
    raise exception '0020: allowed_users row(s) with a role other than operator/manager/admin: %. Correct or delete them, then re-run this file.',
      unknown_roles;
  end if;

  -- A policy that compares the role claim to the literal 'manager', instead of
  -- calling private.is_manager(), would hand every sales manager the owner's
  -- rows the moment this file runs. 0014 replaced every such policy 0001–0013
  -- created; a policy made by hand on the live tables was not, and a re-run of
  -- 0013 puts two of them back under 0014's own names — those need 0014
  -- re-run (dropping them would leave the owner without the read), any other
  -- one can simply go.
  with literal as (
    select p.schemaname, p.tablename, p.policyname,
           (p.schemaname, p.tablename, p.policyname) in (
             ('public', 'allowed_users', 'allowed_users_manager_select_all'),
             ('public', 'telemetry_events', 'telemetry_events_manager_select_all')
           ) as from_0013
    from pg_catalog.pg_policies p
    where p.schemaname in ('public', 'storage')
      and coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '') like '%''manager''%'
  )
  select
    string_agg(format('%I.%I %I', l.schemaname, l.tablename, l.policyname), ', '
               order by l.tablename) filter (where l.from_0013),
    string_agg(format('drop policy %I on %I.%I;', l.policyname, l.schemaname, l.tablename), ' '
               order by l.schemaname, l.tablename, l.policyname) filter (where not l.from_0013)
    into literal_reapply, literal_drops
  from literal l;

  if literal_reapply is not null then
    raise exception '0020: % compare the role claim to the literal ''manager'' — a re-run of 0013 put back their pre-0014 version, which after 0020 would let every sales manager read them. Re-run 0014_role_gated_rls.sql, then this file.',
      literal_reapply;
  end if;
  if literal_drops is not null then
    raise exception '0020: these policies compare the role claim to the literal ''manager'', which after 0020 means a sales manager, not the owner. Drop them (0014''s private.is_manager() policies already cover the owner) or rewrite their check to (select private.is_admin()), then re-run this file: %',
      literal_drops;
  end if;

  -- With a JWT on the session (the SQL editor's role impersonation) the new
  -- guard would treat the conversion in Section 6 as an API write (WT462).
  if nullif(current_setting('request.jwt.claims', true), '') is not null then
    raise exception '0020: request.jwt.claims is set on this session — run this file as postgres with role impersonation off.';
  end if;

  -- Recorded before Section 1 creates private.is_admin(): its absence is what
  -- marks this as the file's first application (read back in Section 6).
  -- Transaction-local, like everything else here.
  perform pg_catalog.set_config(
    'watertech.migration_0020_first_run',
    (to_regprocedure('private.is_admin()') is null)::text,
    true
  );
end
$preflight$;

-- =============================================================================
-- Section 1 — private.is_admin()
-- =============================================================================
-- Same shape and privileges as 0014's helpers: security invoker (it reads the
-- caller's own JWT and carries no privilege of its own), `set search_path = ''`,
-- stable so `(select private.is_admin())` in a policy is one InitPlan per query.

create or replace function private.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.app_role() = 'admin';
$$;

comment on function private.is_admin() is
  'True only for the admin role (the owner): drafts, content writes, the allow-list, the dashboard tables and functions. The helper every new policy and function uses (CLAUDE.md §7).';

-- `create function` grants EXECUTE to PUBLIC — revoke it, then grant the one
-- role that evaluates policies.
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

-- =============================================================================
-- Section 2 — private.is_manager(): a deprecated alias of is_admin()
-- =============================================================================
-- Every 0014–0019 policy (content writes and drafts, user_state "select all",
-- copilot_logs, admin_notifications, content_gate_reports, content_versions,
-- allowed_users, telemetry_events, access_audit, storage product-images) and
-- the bodies of reorder_content_rows (0015), the dashboard_* functions (0016),
-- admin_user_last_activity (0017) and copilot_stats / copilot_unanswered (0019)
-- call it by name. Changing the body moves all of them to "admin" at once.

create or replace function private.is_manager()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_admin();
$$;

comment on function private.is_manager() is
  'DEPRECATED alias of private.is_admin() since 0020, kept because the 0014–0019 policies and function bodies call it by name. It means "CMS admin", never the sales-manager role. New SQL calls private.is_admin(); a check that must mean "sales manager" compares private.app_role() = ''manager'' explicitly. Never repurpose this function.';

-- =============================================================================
-- Section 3 — private.is_member(): the three allow-listed roles
-- =============================================================================

create or replace function private.is_member()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.app_role() in ('operator', 'manager', 'admin');
$$;

comment on function private.is_member() is
  'True for an allow-listed operator, manager (sales manager) or admin. False for ''none'' and for a token with no app_metadata.role.';

-- `create or replace` keeps a function's privileges; re-stated anyway so a
-- database whose grants were edited by hand converges on 0014's.
revoke all on function private.is_member(), private.is_manager() from public, anon;
grant execute on function private.is_member(), private.is_manager() to authenticated;

-- =============================================================================
-- Section 4 — allowed_users_role_chk accepts 'admin'
-- =============================================================================
-- Added VALID this time: Section 0 has already refused a table holding any
-- other role, so the validating scan cannot fail.

alter table public.allowed_users drop constraint if exists allowed_users_role_chk;
alter table public.allowed_users
  add constraint allowed_users_role_chk check (role in ('operator', 'manager', 'admin'));

-- =============================================================================
-- Section 5 — private.allowed_users_guard(): admin semantics
-- =============================================================================
-- Replaces the 0017 body; the trigger binding (trg_allowed_users_guard, BEFORE
-- INSERT OR UPDATE OR DELETE, for each row) is 0017's and stays. In order:
--
--   WT403  a caller whose JWT has an email but whose allow-list row is not an
--          active admin — only an active admin may write through the API, and
--          a demoted or deactivated admin's token must not let them back in;
--   WT462  an insert that carries a JWT and creates an admin row;
--   WT460  any change that would leave no active admin — every caller, the SQL
--          editor included, so the owner cannot lock themselves out by typo;
--   WT461  an admin demoting, deactivating or deleting their own row;
--   WT462  an update or delete that carries a JWT and promotes a row to admin,
--          or changes the role, is_active or email of — or deletes — a row
--          that is an admin. The email counts because moving an admin row to
--          another address hands admin to another identity, which is the same
--          as creating one. full_name stays editable.
--
-- WT460 and WT461 come before WT462 so a sole admin demoting themselves hears
-- "last admin", which is true in the SQL editor as well, rather than "use the
-- SQL editor", which would then refuse them too. lib/admin/users.ts
-- (accessViolation) checks the same three in the same order.
--
-- "Carries a JWT" is request.jwt.claims being set: PostgREST sets it for a
-- session and for the service-role key alike, the SQL editor does not. So the
-- service-role key cannot write admin rows either. The actor and self checks
-- still need an email claim, as in 0017.
--
-- Unchanged from 0017: SECURITY DEFINER so the admin count is never narrowed
-- by the caller's RLS; VOLATILE so each count takes a fresh snapshot once the
-- advisory lock is held; messages name no email (they reach the server log).

create or replace function private.allowed_users_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  claims constant jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  via_api constant boolean := claims is not null;
  actor constant text := lower(trim(coalesce(claims ->> 'email', '')));
  was_active_admin boolean;
  stays_active_admin boolean;
  other_admins bigint;
begin
  -- One writer at a time for the whole allow-list, keyed on the table's OID;
  -- released at commit or rollback.
  perform pg_catalog.pg_advisory_xact_lock('public.allowed_users'::regclass::oid::bigint);

  if actor <> '' and not exists (
    select 1 from public.allowed_users a
    where lower(a.email) = actor and a.role = 'admin' and a.is_active
  ) then
    raise exception 'allowed_users: the caller is not an active admin'
      using errcode = 'WT403';
  end if;

  if tg_op = 'INSERT' then
    if via_api and new.role = 'admin' then
      raise exception 'allowed_users: admin rows are created in the SQL editor only'
        using errcode = 'WT462';
    end if;
    return new;
  end if;

  was_active_admin := old.role = 'admin' and old.is_active;
  stays_active_admin := tg_op = 'UPDATE' and new.role = 'admin' and new.is_active;

  if was_active_admin and not stays_active_admin then
    select count(*) into other_admins
    from public.allowed_users a
    where a.role = 'admin' and a.is_active and a.email <> old.email;

    if other_admins = 0 then
      raise exception 'allowed_users: this change would leave no active admin'
        using errcode = 'WT460';
    end if;
  end if;

  if actor <> '' and lower(old.email) = actor and not stays_active_admin then
    raise exception 'allowed_users: an admin cannot demote, deactivate or delete their own row'
      using errcode = 'WT461';
  end if;

  if via_api and (
    (tg_op = 'DELETE' and old.role = 'admin')
    or (
      tg_op = 'UPDATE'
      and (old.role = 'admin' or new.role = 'admin')
      and (
        new.role is distinct from old.role
        or new.is_active is distinct from old.is_active
        or new.email is distinct from old.email
      )
    )
  ) then
    raise exception 'allowed_users: admin rows are changed in the SQL editor only'
      using errcode = 'WT462';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

comment on function private.allowed_users_guard() is
  'BEFORE INSERT/UPDATE/DELETE on public.allowed_users (0017 binding, 0020 body). WT403: JWT caller is not an active admin row. WT460: would leave no active admin (every caller, SQL editor included). WT461: an admin demoting/deactivating/deleting their own row. WT462: a write carrying a JWT (session or service role) that creates or promotes an admin row, or changes the role/is_active/email of or deletes an admin row — admin rows are SQL-editor-only. Serialised by an advisory lock on the table OID.';

-- Trigger functions are never called by name: no role needs EXECUTE (0017).
revoke all on function private.allowed_users_guard() from public, anon, authenticated, service_role;

-- SECURITY DEFINER only bypasses RLS for the count if the function belongs to
-- the table's owner — the same notice 0017 gives.
do $owner$
declare
  fn_owner text;
  tbl_owner text;
begin
  select pg_catalog.pg_get_userbyid(c.relowner) into tbl_owner
  from pg_catalog.pg_class c
  where c.oid = 'public.allowed_users'::regclass;

  select pg_catalog.pg_get_userbyid(p.proowner) into fn_owner
  from pg_catalog.pg_proc p
  where p.oid = 'private.allowed_users_guard()'::regprocedure;

  if fn_owner is distinct from tbl_owner then
    raise notice '0020: private.allowed_users_guard() is owned by % but public.allowed_users by % — allow-list writes will fail until you run: alter function private.allowed_users_guard() owner to %;',
      fn_owner, tbl_owner, tbl_owner;
  end if;
end
$owner$;

-- =============================================================================
-- Section 6 — every 'manager' row becomes 'admin', on the first run only
-- =============================================================================
-- After Section 5, so the new guard is the one that sees these updates: no JWT
-- (Section 0 made sure), so no WT462, and no row is left without an admin.
-- The 0017 audit trigger records each one with actor = the database login.
--
-- On a re-run private.is_admin() already existed when Section 0 ran: 0020 has
-- been applied, every 'manager' row since then is a sales manager, and none of
-- them may be touched.

do $convert$
declare
  first_run constant boolean :=
    coalesce(current_setting('watertech.migration_0020_first_run', true), '') = 'true';
  emails text;
  converted bigint;
begin
  if not first_run then
    raise notice '0020: re-run — no row converted. private.is_admin() already existed, so every ''manager'' row is a sales manager now.';
  else
    select string_agg(a.email || case when a.is_active then '' else ' (inactive)' end, ', ' order by a.email)
      into emails
    from public.allowed_users a
    where a.role = 'manager';

    if emails is null then
      raise notice '0020: no ''manager'' row to convert.';
    else
      raise notice '0020: converting manager -> admin: %', emails;
      update public.allowed_users set role = 'admin' where role = 'manager';
      get diagnostics converted = row_count;
      raise notice '0020: % row(s) are admin now. Each of them signs out and back in to receive the admin claim.', converted;
    end if;
  end if;

  if not exists (select 1 from public.allowed_users a where a.role = 'admin' and a.is_active) then
    raise notice '0020: there is no active admin — nobody can open /admin or /dashboard. Add one in the SQL editor: insert into public.allowed_users (email, role) values (''owner@gmail.com'', ''admin'');';
  end if;
end
$convert$;

commit;
