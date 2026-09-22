-- Audit-2 / S03 — role-gated RLS + an access-token hook that refuses.
--
-- The P0 this file closes:
--
--   1. public.custom_access_token_hook (0001) stamped app_metadata.role =
--      'none' for an email that is not in allowed_users, instead of refusing.
--      app/auth/callback/route.ts then called signOut(), but the JWT had
--      already been issued — and NEXT_PUBLIC_SUPABASE_ANON_KEY ships in the
--      browser bundle, so anyone could run the Google OAuth/PKCE flow against
--      the Auth API directly and keep an `authenticated` token.
--   2. Every "*_authenticated_select_published" policy (0002, 0010, 0011,
--      0012) checked `status = 'published'` and nothing else. With the token
--      from (1), any Google account could read every script, battle-card,
--      package discount term and contact phone number over PostgREST.
--   3. user_state_own_* (0009) checked only the email claim, so such a token
--      could also write rows.
--
-- And the two Supabase advisor warnings on the same policies:
--
--   4. auth.jwt() was called per row instead of once per query. Every policy
--      here wraps its predicate in `(select …)` so the planner evaluates it as
--      an InitPlan.
--   5. Each content table had two permissive SELECT policies. They are merged
--      into one per table below.
--
-- The role claim is now issued only to an active allow-list member, so a
-- single `private.is_member()` in the read policies is what separates "an
-- operator or manager of this company" from "anyone with a Google account".
--
-- Behaviour for a real operator or manager is unchanged: an operator still
-- reads published content and only their own user_state; a manager still reads
-- drafts, writes content and reads the dashboard tables. See docs/SECURITY.md
-- for the whole model and the dashboard steps this migration depends on.
--
-- APPLY ORDER (see docs/MIGRATIONS.md): after 0013. It touches policies that
-- 0002, 0005, 0006, 0007, 0009, 0010, 0011, 0012 and 0013 create, so it aborts
-- with a list of what is missing rather than half-securing the database.
-- Re-running it is safe: every statement is idempotent.

begin;

-- =============================================================================
-- Section 0 — preflight
-- =============================================================================
-- One transaction, so an abort here leaves nothing applied. user_state (0009)
-- is the single optional dependency: the app degrades to local-only state
-- without it, so a missing table is a notice, not an error.

do $preflight$
declare
  required constant text[] := array[
    'content_scripts', 'content_objections', 'content_faqs', 'content_competitors',
    'content_package_groups', 'content_packages', 'content_products',
    'content_changelog', 'content_contacts', 'content_sops',
    'content_versions', 'copilot_logs', 'admin_notifications', 'content_gate_reports',
    'allowed_users', 'telemetry_events'
  ];
  t text;
  missing text[] := '{}';
begin
  foreach t in array required loop
    if to_regclass('public.' || quote_ident(t)) is null then
      missing := missing || t;
    end if;
  end loop;

  if array_length(missing, 1) > 0 then
    raise exception '0014: missing table(s): %. Apply migrations 0001-0013 first (docs/MIGRATIONS.md), then re-run this file.',
      array_to_string(missing, ', ');
  end if;

  -- The hook in section 5 reads allowed_users.is_active, added by 0013.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'allowed_users' and column_name = 'is_active'
  ) then
    raise exception '0014: public.allowed_users.is_active is missing — apply 0013 first, then re-run this file.';
  end if;
end
$preflight$;

-- =============================================================================
-- Section 1 — private.app_role() / is_member() / is_manager()
-- =============================================================================
-- Why a schema of their own: anything in `public` is exposed by PostgREST, and
-- these are policy internals, not an API. `private` is not in PostgREST's
-- exposed schema list, and USAGE is granted to `authenticated` only.
--
-- `security invoker` (not definer) is deliberate — they read the caller's own
-- JWT and must carry no privilege of their own. `set search_path = ''` means
-- every reference below is schema-qualified, so the resolution cannot be
-- redirected by a caller's search_path.
--
-- They are `stable`, which is what lets `(select private.is_manager())` in a
-- policy be folded into a once-per-query InitPlan instead of a per-row call.

create schema if not exists private;

comment on schema private is
  'Policy helpers only. Never added to PostgREST''s exposed schemas; USAGE granted to authenticated alone.';

-- 'none' rather than null: a null in a USING clause is already treated as
-- false, but a concrete value keeps is_member()/is_manager() strictly boolean
-- and makes the claim-less case readable in an EXPLAIN or a test.
create or replace function private.app_role()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role', 'none');
$$;

comment on function private.app_role() is
  'app_metadata.role from the caller''s JWT, or ''none'' when there is no claim. Stamped at token issuance by public.custom_access_token_hook.';

-- "Is on the allow-list at all" — the check every operator-facing read policy
-- was missing. Since 0014 the hook refuses to issue a token without a role,
-- so a JWT that reaches here with a role is by construction an allow-listed,
-- active user.
create or replace function private.is_member()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.app_role() in ('operator', 'manager');
$$;

comment on function private.is_member() is
  'True for an allow-listed operator or manager. False for ''none'' and for a token with no app_metadata.role.';

create or replace function private.is_manager()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.app_role() = 'manager';
$$;

comment on function private.is_manager() is
  'True only for the manager role (drafts, content writes, dashboard tables).';

-- `create function` grants EXECUTE to PUBLIC, and a pre-existing `private`
-- schema may carry grants of its own — revoke first, then grant the one role
-- that needs it. service_role and postgres bypass RLS, so they never evaluate
-- a policy and need nothing here; anon matches no policy on any table below.
revoke all on schema private from public, anon;
revoke all on function private.app_role(), private.is_member(), private.is_manager()
  from public, anon;

grant usage on schema private to authenticated;
grant execute on function private.app_role(), private.is_member(), private.is_manager()
  to authenticated;

-- =============================================================================
-- Section 2 — content tables: one read policy, gated on membership
-- =============================================================================
-- Replaces, per table:
--   <t>_authenticated_select_published  using (status = 'published')
--   <t>_manager_select_all              using (auth.jwt()->… = 'manager')
-- with the single policy
--   <t>_member_select
--     using ((select private.is_manager())
--            or (status = 'published' and (select private.is_member())))
-- and re-states the three write policies as
--   using/with check ((select private.is_manager())).
--
-- A loop rather than 50 hand-written statements: the 10 tables carry the same
-- policy set by design (0002, 0010-0012), and spelling it once is what keeps
-- them from drifting apart. drop-if-exists before each create makes the file
-- re-runnable and converges a database whose policies were made by hand.

do $content$
declare
  content_tables constant text[] := array[
    'content_scripts', 'content_objections', 'content_faqs', 'content_competitors',
    'content_package_groups', 'content_packages', 'content_products',
    'content_changelog', 'content_contacts', 'content_sops'
  ];
  t text;
begin
  foreach t in array content_tables loop
    -- --- read: the two 0002-style policies out, one membership-gated in -----
    execute format('drop policy if exists %I on public.%I', t || '_authenticated_select_published', t);
    execute format('drop policy if exists %I on public.%I', t || '_manager_select_all', t);
    execute format('drop policy if exists %I on public.%I', t || '_member_select', t);
    execute format($sql$
      create policy %I on public.%I
        for select to authenticated
        using (
          (select private.is_manager())
          or (status = 'published' and (select private.is_member()))
        )
    $sql$, t || '_member_select', t);

    -- --- write: manager only, same as before, now InitPlan-wrapped ----------
    execute format('drop policy if exists %I on public.%I', t || '_manager_insert', t);
    execute format($sql$
      create policy %I on public.%I
        for insert to authenticated
        with check ((select private.is_manager()))
    $sql$, t || '_manager_insert', t);

    execute format('drop policy if exists %I on public.%I', t || '_manager_update', t);
    execute format($sql$
      create policy %I on public.%I
        for update to authenticated
        using ((select private.is_manager()))
        with check ((select private.is_manager()))
    $sql$, t || '_manager_update', t);

    execute format('drop policy if exists %I on public.%I', t || '_manager_delete', t);
    execute format($sql$
      create policy %I on public.%I
        for delete to authenticated
        using ((select private.is_manager()))
    $sql$, t || '_manager_delete', t);
  end loop;
end
$content$;

-- =============================================================================
-- Section 3 — user_state: own rows, and only for a member
-- =============================================================================
-- The email claim alone let any `authenticated` token read and write a row
-- under its own email. Membership is now required as well, so a token without
-- a role claim can neither seed nor read state.
--
-- Two permissive SELECT policies stay here on purpose (unlike the content
-- tables in section 2): they answer different questions — "my own row" and
-- "every row, for the manager's onboarding table on /dashboard/quality" — and
-- merging them would put the manager branch in front of every operator read.
--
-- The user_email column default `(auth.jwt() ->> 'email')` is untouched: a
-- column default cannot contain a subquery, and it is evaluated once per
-- inserted row anyway, not per row scanned.

do $user_state$
begin
  if to_regclass('public.user_state') is null then
    raise notice '0014: public.user_state not found — 0009 is not applied, so there are no user_state policies to gate. Apply 0009, then RE-RUN THIS FILE (0009 creates the email-only policies this section replaces).';
    return;
  end if;

  drop policy if exists "user_state_own_select" on public.user_state;
  create policy "user_state_own_select" on public.user_state
    for select to authenticated
    using (user_email = (select auth.jwt() ->> 'email') and (select private.is_member()));

  drop policy if exists "user_state_own_insert" on public.user_state;
  create policy "user_state_own_insert" on public.user_state
    for insert to authenticated
    with check (user_email = (select auth.jwt() ->> 'email') and (select private.is_member()));

  drop policy if exists "user_state_own_update" on public.user_state;
  create policy "user_state_own_update" on public.user_state
    for update to authenticated
    using (user_email = (select auth.jwt() ->> 'email') and (select private.is_member()))
    with check (user_email = (select auth.jwt() ->> 'email') and (select private.is_member()));

  drop policy if exists "user_state_own_delete" on public.user_state;
  create policy "user_state_own_delete" on public.user_state
    for delete to authenticated
    using (user_email = (select auth.jwt() ->> 'email') and (select private.is_member()));

  -- Read-only, managers only — still no manager insert/update/delete policy:
  -- nobody edits another operator's state (0009).
  drop policy if exists "user_state_manager_select_all" on public.user_state;
  create policy "user_state_manager_select_all" on public.user_state
    for select to authenticated
    using ((select private.is_manager()));
end
$user_state$;

-- =============================================================================
-- Section 4 — the manager-only tables: same rule, InitPlan-wrapped
-- =============================================================================
-- Behaviour is identical for both roles — these policies already compared the
-- role claim. What changes is that the comparison moves into is_manager() and
-- is evaluated once per query instead of once per row, and that there is now
-- one spelling of "is a manager" in the whole schema.
--
-- Deliberately NOT touched: "auth admin reads allowed_users" (0001), which is
-- `to supabase_auth_admin using (true)`. That role has no USAGE on `private`
-- and must not need it — it reads the allow-list for the hook, before any
-- claim exists.

-- copilot_logs (0006)
drop policy if exists "copilot_logs_manager_select" on public.copilot_logs;
create policy "copilot_logs_manager_select" on public.copilot_logs
  for select to authenticated using ((select private.is_manager()));

-- admin_notifications (0007) — read, plus the read_at flip (column-level GRANT)
drop policy if exists "admin_notifications_manager_select" on public.admin_notifications;
create policy "admin_notifications_manager_select" on public.admin_notifications
  for select to authenticated using ((select private.is_manager()));

drop policy if exists "admin_notifications_manager_update" on public.admin_notifications;
create policy "admin_notifications_manager_update" on public.admin_notifications
  for update to authenticated
  using ((select private.is_manager()))
  with check ((select private.is_manager()));

-- content_gate_reports (0007)
drop policy if exists "content_gate_reports_manager_select" on public.content_gate_reports;
create policy "content_gate_reports_manager_select" on public.content_gate_reports
  for select to authenticated using ((select private.is_manager()));

-- content_versions (0002; its insert policy was dropped by 0013 — history is
-- written only by the SECURITY DEFINER snapshot trigger)
drop policy if exists "content_versions_manager_select" on public.content_versions;
create policy "content_versions_manager_select" on public.content_versions
  for select to authenticated using ((select private.is_manager()));

-- allowed_users (0005) — the dashboard's operator filter
drop policy if exists "allowed_users_manager_select_all" on public.allowed_users;
create policy "allowed_users_manager_select_all" on public.allowed_users
  for select to authenticated using ((select private.is_manager()));

-- telemetry_events (0013)
drop policy if exists "telemetry_events_manager_select_all" on public.telemetry_events;
create policy "telemetry_events_manager_select_all" on public.telemetry_events
  for select to authenticated using ((select private.is_manager()));

-- =============================================================================
-- Section 5 — the access-token hook refuses instead of stamping 'none'
-- =============================================================================
-- Replaces the 0001 body. Two changes:
--
--   * An email that is not in allowed_users, or whose row has
--     is_active = false, gets the Auth Hooks error response instead of
--     role = 'none'. GoTrue propagates http_code/message verbatim and issues
--     NO token at all, so there is nothing to sign out afterwards and nothing
--     to present to PostgREST. Errors from a Postgres hook are not retried.
--     Contract: { "error": { "http_code": <int>, "message": <text, required> } }
--     — https://supabase.com/docs/guides/auth/auth-hooks (Postgres hook errors)
--     and .../auth-hooks/custom-access-token-hook (the deny example).
--   * Emails are compared lowercased on both sides. 0013 added
--     allowed_users_email_lowercase_chk NOT VALID, so legacy rows may still
--     hold mixed case; lower(a.email) keeps those working. At ~30 rows the
--     lost index use costs nothing.
--
-- The message is the fixed sentinel 'not_allowed' — never the email, never
-- "which" check failed. It reaches the browser through GoTrue's HTTP response
-- and is matched (not displayed) by app/auth/callback/route.ts, which shows
-- the same /login?error=not_allowed page for every refusal.
--
-- `security invoker`, per the Supabase guidance for hooks: it runs as
-- supabase_auth_admin, whose SELECT on allowed_users and whose own RLS policy
-- are granted explicitly below. `set search_path = ''` for the same reason as
-- section 1 — every name in the body is schema-qualified.
--
-- This runs on every token issuance AND every refresh, so deactivating a user
-- in allowed_users ends their access when their current access token expires
-- (JWT expiry, default 1 hour) — see "Residual risk" in docs/SECURITY.md.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  claims jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  app_meta jsonb := coalesce(claims -> 'app_metadata', '{}'::jsonb);
  user_email text := lower(trim(coalesce(claims ->> 'email', '')));
  user_role text;
  denied constant jsonb := jsonb_build_object(
    'error', jsonb_build_object('http_code', 403, 'message', 'not_allowed')
  );
begin
  -- No email on the claims: nothing to match against the allow-list. Every
  -- sign-in path this project enables (Google OAuth) carries one, so this is
  -- the fail-closed branch for anything unexpected.
  if user_email = '' then
    return denied;
  end if;

  select a.role into user_role
  from public.allowed_users a
  where lower(a.email) = user_email
    and a.is_active
  limit 1;

  if user_role is null then
    return denied;
  end if;

  app_meta := jsonb_set(app_meta, '{role}', to_jsonb(user_role), true);
  claims := jsonb_set(claims, '{app_metadata}', app_meta, true);
  return jsonb_set(event, '{claims}', claims, true);
end;
$$;

comment on function public.custom_access_token_hook(jsonb) is
  'Custom Access Token hook: stamps app_metadata.role for an active allowed_users row, and returns the Auth Hooks 403 error response (message ''not_allowed'') for anyone else, so GoTrue issues no token. Enable it in Dashboard -> Authentication -> Hooks.';

-- Unchanged from 0001, re-stated so the grants survive a database that was
-- built by hand. Only supabase_auth_admin may call the hook; no session role
-- may, and none may write the allow-list it reads.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
grant select on table public.allowed_users to supabase_auth_admin;

drop policy if exists "auth admin reads allowed_users" on public.allowed_users;
create policy "auth admin reads allowed_users" on public.allowed_users
  for select to supabase_auth_admin using (true);

commit;
