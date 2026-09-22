-- RLS verification — run against the STAGING project only (see docs/TESTING.md).
--
-- Paste the whole file into the Supabase SQL editor and run it once. It inserts
-- its own fixture rows (ids/emails prefixed `rls-test` / `@test`), calls the
-- access-token hook directly, then switches to the `authenticated` role with an
-- operator's, three non-members' and finally a manager's JWT claims, and asserts
-- what each can SELECT. Everything runs in one transaction that ends in
-- ROLLBACK, and a failed assertion aborts that transaction — either way no
-- fixture row is ever committed.
--
--   Passed: the last result is a single row "RLS checks passed".
--   Failed: an error whose message starts with "RLS FAIL:".
--
-- Policies under test: 0002 (content_* + content_versions), 0006 (copilot_logs),
-- 0007 (admin_notifications, content_gate_reports), 0008 (rate_limits),
-- 0009 (user_state), 0010 (content_changelog), 0011 (content_contacts),
-- 0012 (content_sops), 0013 (allowed_users, telemetry_events, and the write-side
-- integrity block at the end: append-only history, draft default, updated_by),
-- 0014 (the role gate on every policy above, and the access-token hook itself).
--
-- 0013 is the baseline for allowed_users and telemetry_events, which predate
-- supabase/migrations. On a project where 0013 has not been applied yet, the
-- telemetry_events checks test whatever policy that project actually has, and
-- the write-side block fails — that failure means "apply 0013", not "the
-- policies are wrong". The same applies to 0014: the hook block at the top
-- fails with "is 0014 applied?" and the non-member block reports rows that a
-- pre-0014 policy really does expose.

begin;

-- === Fixtures (inserted as the editor's own role, before any role switch) =====

insert into public.content_scripts (id, name, cheat_sheet, stages, status) values
  ('rls-test-draft', 'RLS test draft', '', '[]', 'draft'),
  ('rls-test-published', 'RLS test published', '', '[]', 'published');
insert into public.content_objections (id, label, client_says, real_meaning, response, status) values
  ('rls-test-draft', 'RLS test', '-', '-', '-', 'draft');
insert into public.content_faqs (id, category, question, answer, status) values
  ('rls-test-draft', 'RLS', 'RLS test?', '-', 'draft');
insert into public.content_competitors (id, name, threat_level, status) values
  ('rls-test-draft', 'RLS test', 'O''rta', 'draft');
insert into public.content_package_groups (id, title, subtitle, status) values
  ('rls-test-draft', 'RLS test', '-', 'draft');
insert into public.content_packages (id, group_id, name, order_volume, payment_terms, estimated_discount, logistics, delivery_time, status) values
  ('rls-test-draft', 'rls-test-draft', 'RLS test', '-', '-', '-', '-', '-', 'draft');
insert into public.content_products (id, filename, name_ru, line, category, status) values
  ('rls-test-draft', 'rls-test-draft.jpg', 'RLS test', 'ppr', 'truba', 'draft');
-- 0010 / 0011 / 0012 carry the same published-only read policy as the 0002
-- tables, so each gets a draft row (must stay invisible to an operator) and a
-- published one (the positive control that proves GRANT and policy both work).
insert into public.content_changelog (id, published_on, title, body, approved_by, status) values
  ('rls-test-draft', current_date, 'RLS test', '-', 'rls-manager@test', 'draft'),
  ('rls-test-published', current_date, 'RLS test', '-', 'rls-manager@test', 'published');
insert into public.content_contacts (id, name, role, topic, phone, messenger, status) values
  ('rls-test-draft', 'RLS test', '-', '-', '+998 90 123 45 67', '@rlstestuser', 'draft'),
  ('rls-test-published', 'RLS test', '-', '-', '+998 90 123 45 67', '@rlstestuser', 'published');
insert into public.content_sops (id, title, summary, steps, status) values
  ('rls-test-draft', 'RLS test', '-', '[]', 'draft'),
  ('rls-test-published', 'RLS test', '-', '[]', 'published');

-- rate_limits (0008) has RLS on, no policies at all and no table grants: only
-- service_role reaches it, and only through rate_limit_hit(). A row is seeded
-- so the zeroes asserted below are "hidden", not "table happens to be empty".
insert into public.rate_limits (key, window_start, hits, expires_at) values
  ('rls-test:copilot:1m', now(), 1, now() + interval '1 minute');
-- Version snapshots can hold draft content too.
insert into public.content_versions (table_name, row_id, snapshot, actor) values
  ('content_faqs', 'rls-test-draft', '{"status":"draft"}', 'rls-manager@test');

insert into public.copilot_logs (email, question, status) values
  ('rls-other-op@test', 'RLS test question', 'ok');
insert into public.admin_notifications (kind, severity, title, table_name, row_id) values
  ('gate_blocked', 'error', 'RLS test', 'content_faqs', 'rls-test-draft');
insert into public.content_gate_reports (table_name, row_id, passed, actor) values
  ('content_faqs', 'rls-test-draft', false, 'rls-manager@test');
insert into public.telemetry_events (user_email, session_id, ts, type, path) values
  ('op@test', 'rls-test', now(), 'page_enter', '/'),
  ('rls-other-op@test', 'rls-test', now(), 'page_enter', '/');

-- user_state (0009). user_email is spelled out here because its default reads
-- auth.jwt(), which is empty for the editor's own role.
insert into public.user_state (user_email, key, value) values
  ('op@test', 'onboarding.v2', '{"summary-d1":true}'),
  ('rls-other-op@test', 'onboarding.v2', '{"summary-d1":true}');

-- allowed_users: the allow-list the access-token hook reads (0001/0014) and the
-- dashboard's operator filter lists (0005). The two emails match the operator
-- and manager identities used below; `rls-deactivated@test` is the is_active =
-- false case, and `rls-unknown@test` is deliberately NOT inserted.
insert into public.allowed_users (email, role, is_active) values
  ('op@test', 'operator', true),
  ('rls-manager@test', 'manager', true),
  ('rls-deactivated@test', 'operator', false);

-- === The access-token hook (0014) ==============================================
-- Runs as the editor's own role, before any role switch: EXECUTE on the hook is
-- granted to supabase_auth_admin alone, and the SQL editor's `postgres` role
-- reaches it as the function's owner.
--
-- This is the half of 0014 that RLS cannot cover. An unknown or deactivated
-- account is refused a *token*, so there is no JWT for the policy checks to
-- simulate — what the policies do see in that case is the claim-less identity
-- asserted in the non-member section further down.

do $$
declare
  c record;
  result jsonb;
begin
  if to_regprocedure('public.custom_access_token_hook(jsonb)') is null then
    raise exception 'RLS FAIL: public.custom_access_token_hook(jsonb) does not exist — apply 0001 and 0014';
  end if;
  if to_regprocedure('private.is_member()') is null then
    raise exception 'RLS FAIL: private.is_member() does not exist — apply 0014_role_gated_rls.sql, then re-run this file';
  end if;

  -- On the allow-list and active: the role is stamped onto app_metadata, and
  -- the email matches case-insensitively (0014 lowercases both sides).
  for c in
    select * from (values
      ('an active operator',             'op@test',          'operator'),
      ('an active manager',              'rls-manager@test', 'manager'),
      ('an active operator, MIXED case', 'Op@TEST',          'operator')
    ) as t(label, email, expected)
  loop
    result := public.custom_access_token_hook(jsonb_build_object(
      'user_id', '00000000-0000-4000-8000-000000000009',
      'authentication_method', 'oauth',
      'claims', jsonb_build_object(
        'sub', '00000000-0000-4000-8000-000000000009',
        'role', 'authenticated',
        'email', c.email,
        'app_metadata', '{}'::jsonb
      )
    ));

    if result -> 'error' is not null then
      raise exception 'RLS FAIL: the access-token hook REFUSED % (%)',
        c.label, coalesce(result -> 'error' ->> 'message', '<no message>');
    end if;
    if result -> 'claims' -> 'app_metadata' ->> 'role' is distinct from c.expected then
      raise exception 'RLS FAIL: the access-token hook stamped role % for % (expected %)',
        coalesce(result -> 'claims' -> 'app_metadata' ->> 'role', '<null>'), c.label, c.expected;
    end if;
  end loop;

  -- Absent from the allow-list, deactivated, or carrying no email at all: the
  -- hook must return the Supabase Auth Hooks error response, so GoTrue issues
  -- NO token. Contract: {"error":{"http_code":403,"message":"not_allowed"}}.
  -- Before 0014 each of these got a real `authenticated` JWT stamped
  -- role = 'none' instead, which is the P0 this file now guards.
  for c in
    select * from (values
      ('an email that is not in allowed_users',
        jsonb_build_object('sub', 'x', 'role', 'authenticated', 'email', 'rls-unknown@test', 'app_metadata', '{}'::jsonb)),
      ('an allowed_users row with is_active = false',
        jsonb_build_object('sub', 'x', 'role', 'authenticated', 'email', 'rls-deactivated@test', 'app_metadata', '{}'::jsonb)),
      ('claims with no email at all',
        jsonb_build_object('sub', 'x', 'role', 'authenticated', 'app_metadata', '{}'::jsonb))
    ) as t(label, claims)
  loop
    result := public.custom_access_token_hook(
      jsonb_build_object('authentication_method', 'oauth', 'claims', c.claims)
    );

    if result -> 'error' is null then
      raise exception 'RLS FAIL: the access-token hook ISSUED a token for % (role %) — is 0014 applied?',
        c.label, coalesce(result -> 'claims' -> 'app_metadata' ->> 'role', '<null>');
    end if;
    if coalesce((result -> 'error' ->> 'http_code')::int, 0) <> 403 then
      raise exception 'RLS FAIL: the hook refused % with http_code % (expected 403)',
        c.label, coalesce(result -> 'error' ->> 'http_code', '<null>');
    end if;
    if result -> 'error' ->> 'message' is distinct from 'not_allowed' then
      raise exception 'RLS FAIL: the hook refused % with message % (expected not_allowed)',
        c.label, coalesce(result -> 'error' ->> 'message', '<null>');
    end if;
    -- No claims may come back alongside the error: GoTrue reads the error
    -- branch first, but a response carrying both would mean the function fell
    -- through to the stamping path for someone it had already refused.
    if result -> 'claims' is not null then
      raise exception 'RLS FAIL: the hook returned claims alongside the error for %', c.label;
    end if;
  end loop;
end $$;

-- === As an operator ============================================================

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated","email":"op@test","app_metadata":{"role":"operator"}}';

do $$
declare
  c record;
  n bigint;
begin
  if current_user <> 'authenticated' or coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'operator' then
    raise exception 'RLS FAIL: setup — expected authenticated/operator, got %/%',
      current_user, auth.jwt()->'app_metadata'->>'role';
  end if;

  -- Positive control: proves the GRANT and claims work, so every 0 below is RLS
  -- hiding the row rather than a broken setup.
  select count(*) into n from public.content_scripts where id = 'rls-test-published';
  if n <> 1 then
    raise exception 'RLS FAIL: operator cannot read a PUBLISHED script (setup or published-read policy broken)';
  end if;

  -- Same positive control for the three tables added after 0002.
  for c in
    select * from (values
      ('content_changelog', 'public.content_changelog'),
      ('content_contacts',  'public.content_contacts'),
      ('content_sops',      'public.content_sops')
    ) as t(label, relation)
  loop
    begin
      execute format('select count(*) from %s where id = ''rls-test-published''', c.relation) into n;
    exception when insufficient_privilege then
      raise exception 'RLS FAIL: operator gets "permission denied" on % — missing GRANT to authenticated?', c.relation;
    end;
    if n <> 1 then
      raise exception 'RLS FAIL: operator cannot read a PUBLISHED % row (% visible)', c.label, n;
    end if;
  end loop;

  for c in
    select * from (values
      ('draft content_scripts row',        'public.content_scripts',        $f$id = 'rls-test-draft'$f$),
      ('draft content_objections row',     'public.content_objections',     $f$id = 'rls-test-draft'$f$),
      ('draft content_faqs row',           'public.content_faqs',           $f$id = 'rls-test-draft'$f$),
      ('draft content_competitors row',    'public.content_competitors',    $f$id = 'rls-test-draft'$f$),
      ('draft content_package_groups row', 'public.content_package_groups', $f$id = 'rls-test-draft'$f$),
      ('draft content_packages row',       'public.content_packages',       $f$id = 'rls-test-draft'$f$),
      ('draft content_products row',       'public.content_products',       $f$id = 'rls-test-draft'$f$),
      ('draft content_changelog row',      'public.content_changelog',      $f$id = 'rls-test-draft'$f$),
      ('draft content_contacts row',       'public.content_contacts',       $f$id = 'rls-test-draft'$f$),
      ('draft content_sops row',           'public.content_sops',           $f$id = 'rls-test-draft'$f$),
      ('content_versions snapshot',        'public.content_versions',       $f$row_id = 'rls-test-draft'$f$),
      ('copilot_logs',                     'public.copilot_logs',           $f$true$f$),
      ('admin_notifications',              'public.admin_notifications',    $f$true$f$),
      ('content_gate_reports',             'public.content_gate_reports',   $f$true$f$),
      ('another operator''s telemetry_events', 'public.telemetry_events',   $f$user_email = 'rls-other-op@test'$f$),
      ('another operator''s user_state',    'public.user_state',             $f$user_email = 'rls-other-op@test'$f$),
      -- The allow-list is manager-only (0005/0014) — not even an operator's own
      -- row is readable, so the filter is deliberately unrestricted.
      ('allowed_users',                     'public.allowed_users',          $f$true$f$)
    ) as t(label, relation, filter)
  loop
    begin
      execute format('select count(*) from %s where %s', c.relation, c.filter) into n;
    exception when insufficient_privilege then
      n := 0; -- "permission denied" hides the rows just as well
    end;
    if n <> 0 then
      raise exception 'RLS FAIL: operator can select % (% rows visible)', c.label, n;
    end if;
  end loop;
end $$;

-- user_state (0009) is the only table an operator may write, so its policies
-- need more than the select sweep above: own row readable and writable, every
-- other operator's row invisible and untouchable.
do $$
declare
  n bigint;
begin
  select count(*) into n from public.user_state where user_email = 'op@test';
  if n <> 1 then
    raise exception 'RLS FAIL: operator cannot select their OWN user_state row (% visible)', n;
  end if;

  -- The insert policy takes the email from the JWT via the column default, so
  -- no email is spelled out here — exactly what hooks/useUserState.ts sends.
  insert into public.user_state (key, value) values ('scripts.position', '{"scriptId":"x","stageId":null}');
  select count(*) into n from public.user_state where user_email = 'op@test' and key = 'scripts.position';
  if n <> 1 then
    raise exception 'RLS FAIL: operator cannot insert their own user_state row';
  end if;

  update public.user_state set value = '{"summary-d2":true}' where key = 'onboarding.v2';
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'RLS FAIL: operator cannot update their own user_state row (% rows)', n;
  end if;

  delete from public.user_state where key = 'scripts.position';
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'RLS FAIL: operator cannot delete their own user_state row (% rows)', n;
  end if;

  -- Another operator's row: invisible to update/delete (0 rows, no error), and
  -- an insert claiming their email must be rejected by the WITH CHECK.
  update public.user_state set value = '{"hacked":true}' where user_email = 'rls-other-op@test';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'RLS FAIL: operator can update ANOTHER operator''s user_state row (% rows)', n;
  end if;

  delete from public.user_state where user_email = 'rls-other-op@test';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'RLS FAIL: operator can delete ANOTHER operator''s user_state row (% rows)', n;
  end if;

  begin
    insert into public.user_state (user_email, key, value) values ('rls-other-op@test', 'pins', '[]');
    raise exception 'RLS FAIL: operator can insert a user_state row for ANOTHER operator';
  exception
    when insufficient_privilege then null; -- the WITH CHECK rejected it, as it should
  end;
end $$;

-- rate_limits (0008): not readable, not writable, and rate_limit_hit() not
-- callable by operator — the counter behind /api/copilot's paid calls must be
-- reachable only by the server's service-role client.
do $$
declare
  n bigint;
begin
  begin
    select count(*) into n from public.rate_limits;
    raise exception 'RLS FAIL: operator can select rate_limits (% rows visible)', n;
  exception when insufficient_privilege then null; -- no grant, as intended
  end;

  begin
    perform public.rate_limit_hit('rls-test:operator', 1, 60);
    raise exception 'RLS FAIL: operator can execute rate_limit_hit()';
  exception when insufficient_privilege then null; -- execute revoked, as intended
  end;
end $$;

-- === As a non-member (0014) ====================================================
-- Three JWTs the access-token hook would never issue any more, but that the
-- database has to refuse on its own:
--
--   * role 'none'          — exactly what 0001's hook stamped for an unknown
--                            email, and what a token minted before 0014 still
--                            carries until it expires;
--   * no app_metadata      — a token issued while the hook was disabled in the
--                            dashboard, or through an Auth API call that never
--                            reached it;
--   * a deactivated user   — allowed_users.is_active = false. The hook refuses
--                            them a new token (asserted at the top of this
--                            file); RLS cannot see is_active, so what it has to
--                            refuse is the claim-less token they are left with.
--
-- Each must see NOTHING — PUBLISHED CONTENT INCLUDED. That is the difference
-- 0014 makes: before it, `status = 'published'` was the only condition on every
-- operator read policy, so any Google account that completed the OAuth flow
-- with the public anon key could read the whole knowledge base over PostgREST.
-- The counts below are therefore unfiltered, not id lookups, and every table
-- listed holds at least one fixture row — so each 0 means "hidden", not
-- "empty".

do $$
declare
  ident record;
  c record;
  n bigint;
begin
  for ident in
    select * from (values
      ('role "none"',
        '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated","email":"rls-none@test","app_metadata":{"role":"none"}}'),
      ('a token with no app_metadata',
        '{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated","email":"rls-noclaim@test"}'),
      ('a deactivated allowed_users row',
        '{"sub":"00000000-0000-4000-8000-000000000005","role":"authenticated","email":"rls-deactivated@test"}')
    ) as t(label, claims)
  loop
    perform set_config('request.jwt.claims', ident.claims, true);

    -- Setup control: the 0014 helpers must be callable by `authenticated`
    -- (USAGE on private + EXECUTE) and must classify this identity as an
    -- outsider. Without it, every 0 below could just be a broken fixture.
    if private.app_role() <> 'none' then
      raise exception 'RLS FAIL: setup — private.app_role() is "%" for % (expected none)',
        private.app_role(), ident.label;
    end if;
    if private.is_member() or private.is_manager() then
      raise exception 'RLS FAIL: setup — % is classified as a member', ident.label;
    end if;

    for c in
      select * from (values
        ('content_scripts'),        -- also holds a PUBLISHED fixture row
        ('content_objections'),
        ('content_faqs'),
        ('content_competitors'),
        ('content_package_groups'),
        ('content_packages'),
        ('content_products'),
        ('content_changelog'),      -- published fixture row
        ('content_contacts'),       -- published fixture row
        ('content_sops'),           -- published fixture row
        ('content_versions'),
        ('copilot_logs'),
        ('admin_notifications'),
        ('content_gate_reports'),
        ('telemetry_events'),
        ('allowed_users'),
        ('user_state'),
        ('rate_limits')
      ) as t(relation)
    loop
      begin
        execute format('select count(*) from public.%I', c.relation) into n;
      exception when insufficient_privilege then
        n := 0; -- "permission denied" hides the rows just as well
      end;
      if n <> 0 then
        raise exception 'RLS FAIL: % can select public.% (% rows visible, published rows included)',
          ident.label, c.relation, n;
      end if;
    end loop;

    -- ...and cannot write per-user state either. user_email defaults to this
    -- identity's own email claim, so before 0014 — when user_state_own_insert
    -- checked only that claim — this row WOULD have been written.
    begin
      insert into public.user_state (key, value) values ('pins', '[]');
      raise exception 'RLS FAIL: % can INSERT a user_state row', ident.label;
    exception
      when insufficient_privilege then null; -- the WITH CHECK rejected it
    end;
  end loop;
end $$;

-- === As a manager ==============================================================

set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","email":"rls-manager@test","app_metadata":{"role":"manager"}}';

do $$
declare
  c record;
  n bigint;
begin
  if current_user <> 'authenticated' or coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'manager' then
    raise exception 'RLS FAIL: setup — expected authenticated/manager, got %/%',
      current_user, auth.jwt()->'app_metadata'->>'role';
  end if;

  for c in
    select * from (values
      ('draft content_scripts row',        'public.content_scripts',        $f$id = 'rls-test-draft'$f$),
      ('draft content_objections row',     'public.content_objections',     $f$id = 'rls-test-draft'$f$),
      ('draft content_faqs row',           'public.content_faqs',           $f$id = 'rls-test-draft'$f$),
      ('draft content_competitors row',    'public.content_competitors',    $f$id = 'rls-test-draft'$f$),
      ('draft content_package_groups row', 'public.content_package_groups', $f$id = 'rls-test-draft'$f$),
      ('draft content_packages row',       'public.content_packages',       $f$id = 'rls-test-draft'$f$),
      ('draft content_products row',       'public.content_products',       $f$id = 'rls-test-draft'$f$),
      ('draft content_changelog row',      'public.content_changelog',      $f$id = 'rls-test-draft'$f$),
      ('draft content_contacts row',       'public.content_contacts',       $f$id = 'rls-test-draft'$f$),
      ('draft content_sops row',           'public.content_sops',           $f$id = 'rls-test-draft'$f$),
      ('content_versions snapshot',        'public.content_versions',       $f$row_id = 'rls-test-draft'$f$),
      ('copilot_logs',                     'public.copilot_logs',           $f$email = 'rls-other-op@test'$f$),
      ('admin_notifications',              'public.admin_notifications',    $f$row_id = 'rls-test-draft'$f$),
      ('content_gate_reports',             'public.content_gate_reports',   $f$row_id = 'rls-test-draft'$f$),
      ('another operator''s telemetry_events', 'public.telemetry_events',   $f$user_email = 'rls-other-op@test'$f$),
      ('another operator''s user_state',    'public.user_state',             $f$user_email = 'rls-other-op@test'$f$),
      ('allowed_users',                     'public.allowed_users',          $f$email = 'op@test'$f$)
    ) as t(label, relation, filter)
  loop
    begin
      execute format('select count(*) from %s where %s', c.relation, c.filter) into n;
    exception when insufficient_privilege then
      raise exception 'RLS FAIL: manager gets "permission denied" on % — missing GRANT to authenticated?', c.relation;
    end;
    if n < 1 then
      raise exception 'RLS FAIL: manager cannot select % (0 rows visible)', c.label;
    end if;
  end loop;
end $$;

-- === As a manager: write-side integrity (0013) =================================
-- The publish gate, the updated_by stamp and the append-only version history are
-- enforced by the database now, so they are asserted the same way the read side
-- is: through a real manager session, not the editor's own role. Note this block
-- deletes the content_package_groups fixture, so it must stay after the manager
-- read loop above.

do $$
declare
  n bigint;
  s text;
  ub text;
  snap jsonb;
begin
  -- content_versions is append-only and written only by the snapshot trigger
  -- (SECURITY DEFINER): 0013 drops content_versions_manager_insert and revokes
  -- the INSERT grant, so a hand-written history row must be rejected.
  begin
    insert into public.content_versions (table_name, row_id, snapshot, actor)
    values ('content_faqs', 'rls-test-draft', '{"forged":true}', 'rls-manager@test');
    raise exception 'RLS FAIL: manager can insert a fabricated content_versions row';
  exception
    when insufficient_privilege then null; -- policy dropped + grant revoked, as intended
  end;

  -- A new row defaults to draft: status is deliberately not named here, exactly
  -- like a direct insert from a seed script or psql would leave it.
  insert into public.content_faqs (id, category, question, answer)
  values ('rls-test-default', 'RLS', 'Default status?', '-');
  select status, updated_by into s, ub from public.content_faqs where id = 'rls-test-default';
  if s <> 'draft' then
    raise exception 'RLS FAIL: a new content_faqs row defaulted to % instead of draft', s;
  end if;
  if ub is distinct from 'rls-manager@test' then
    raise exception 'RLS FAIL: updated_by not stamped from the JWT on insert (got %)', coalesce(ub, '<null>');
  end if;

  -- updated_by comes from the JWT, never from the payload — on insert...
  insert into public.content_faqs (id, category, question, answer, status, updated_by)
  values ('rls-test-spoof', 'RLS', 'Whose email?', '-', 'draft', 'attacker@test');
  select updated_by into ub from public.content_faqs where id = 'rls-test-spoof';
  if ub is distinct from 'rls-manager@test' then
    raise exception 'RLS FAIL: insert payload set updated_by to % instead of the JWT email', coalesce(ub, '<null>');
  end if;

  -- ...and on update.
  update public.content_faqs set answer = 'edited', updated_by = 'attacker@test'
  where id = 'rls-test-spoof';
  select updated_by into ub from public.content_faqs where id = 'rls-test-spoof';
  if ub is distinct from 'rls-manager@test' then
    raise exception 'RLS FAIL: update payload set updated_by to % instead of the JWT email', coalesce(ub, '<null>');
  end if;

  -- A delete leaves history behind, and so does the cascade it triggers:
  -- content_packages.group_id references content_package_groups on delete
  -- cascade, so deleting the group must snapshot the package too.
  delete from public.content_package_groups where id = 'rls-test-draft';

  select count(*) into n from public.content_versions
  where table_name = 'content_package_groups' and row_id = 'rls-test-draft' and op = 'delete';
  if n <> 1 then
    raise exception 'RLS FAIL: deleting a content_package_groups row left % delete snapshots (expected 1)', n;
  end if;

  select snapshot, actor into snap, ub from public.content_versions
  where table_name = 'content_packages' and row_id = 'rls-test-draft' and op = 'delete';
  if snap is null then
    raise exception 'RLS FAIL: the CASCADED content_packages delete left no snapshot';
  end if;
  if snap->>'id' <> 'rls-test-draft' or snap->>'group_id' <> 'rls-test-draft' then
    raise exception 'RLS FAIL: the cascaded content_packages snapshot holds the wrong row (%)', snap;
  end if;
  if ub is distinct from 'rls-manager@test' then
    raise exception 'RLS FAIL: delete snapshot actor is % instead of the JWT email', coalesce(ub, '<null>');
  end if;

  -- The rows themselves are gone; only their history remains.
  select count(*) into n from public.content_packages where id = 'rls-test-draft';
  if n <> 0 then
    raise exception 'RLS FAIL: the cascaded content_packages row survived the delete';
  end if;
end $$;

-- A manager may READ every user_state row (the onboarding progress table on
-- /dashboard/quality) and nothing more — there is deliberately no manager
-- insert/update/delete policy in 0009.
do $$
declare
  n bigint;
begin
  update public.user_state set value = '{"hacked":true}' where user_email = 'op@test';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'RLS FAIL: manager can update an operator''s user_state row (% rows)', n;
  end if;

  delete from public.user_state where user_email = 'op@test';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'RLS FAIL: manager can delete an operator''s user_state row (% rows)', n;
  end if;

  begin
    insert into public.user_state (user_email, key, value) values ('op@test', 'pins', '[]');
    raise exception 'RLS FAIL: manager can insert a user_state row for an operator';
  exception
    when insufficient_privilege then null; -- no manager insert policy, as intended
  end;
end $$;

-- rate_limits (0008): not readable, not writable, and rate_limit_hit() not
-- callable by manager — the counter behind /api/copilot's paid calls must be
-- reachable only by the server's service-role client.
do $$
declare
  n bigint;
begin
  begin
    select count(*) into n from public.rate_limits;
    raise exception 'RLS FAIL: manager can select rate_limits (% rows visible)', n;
  exception when insufficient_privilege then null; -- no grant, as intended
  end;

  begin
    perform public.rate_limit_hit('rls-test:manager', 1, 60);
    raise exception 'RLS FAIL: manager can execute rate_limit_hit()';
  exception when insufficient_privilege then null; -- execute revoked, as intended
  end;
end $$;

rollback;

select 'RLS checks passed' as result;
