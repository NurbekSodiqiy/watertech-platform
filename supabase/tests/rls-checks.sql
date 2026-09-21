-- RLS verification — run against the STAGING project only (see docs/TESTING.md).
--
-- Paste the whole file into the Supabase SQL editor and run it once. It inserts
-- its own fixture rows (ids/emails prefixed `rls-test` / `@test`), switches to
-- the `authenticated` role with an operator's and then a manager's JWT claims,
-- and asserts what each can SELECT. Everything runs in one transaction that
-- ends in ROLLBACK, and a failed assertion aborts that transaction — either
-- way no fixture row is ever committed.
--
--   Passed: the last result is a single row "RLS checks passed".
--   Failed: an error whose message starts with "RLS FAIL:".
--
-- Policies under test: 0002 (content_* + content_versions), 0006 (copilot_logs),
-- 0007 (admin_notifications, content_gate_reports), 0008 (rate_limits),
-- 0009 (user_state), 0010 (content_changelog), 0011 (content_contacts),
-- 0012 (content_sops).
-- telemetry_events has no migration in this repo (it predates
-- supabase/migrations), so its checks test whatever policy the project
-- actually has.

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
      ('another operator''s user_state',    'public.user_state',             $f$user_email = 'rls-other-op@test'$f$)
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
      ('another operator''s user_state',    'public.user_state',             $f$user_email = 'rls-other-op@test'$f$)
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
