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
-- 0007 (admin_notifications, content_gate_reports). telemetry_events has no
-- migration in this repo (it predates supabase/migrations), so its checks test
-- whatever policy the project actually has.

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

  for c in
    select * from (values
      ('draft content_scripts row',        'public.content_scripts',        $f$id = 'rls-test-draft'$f$),
      ('draft content_objections row',     'public.content_objections',     $f$id = 'rls-test-draft'$f$),
      ('draft content_faqs row',           'public.content_faqs',           $f$id = 'rls-test-draft'$f$),
      ('draft content_competitors row',    'public.content_competitors',    $f$id = 'rls-test-draft'$f$),
      ('draft content_package_groups row', 'public.content_package_groups', $f$id = 'rls-test-draft'$f$),
      ('draft content_packages row',       'public.content_packages',       $f$id = 'rls-test-draft'$f$),
      ('draft content_products row',       'public.content_products',       $f$id = 'rls-test-draft'$f$),
      ('content_versions snapshot',        'public.content_versions',       $f$row_id = 'rls-test-draft'$f$),
      ('copilot_logs',                     'public.copilot_logs',           $f$true$f$),
      ('admin_notifications',              'public.admin_notifications',    $f$true$f$),
      ('content_gate_reports',             'public.content_gate_reports',   $f$true$f$),
      ('another operator''s telemetry_events', 'public.telemetry_events',   $f$user_email = 'rls-other-op@test'$f$)
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
      ('content_versions snapshot',        'public.content_versions',       $f$row_id = 'rls-test-draft'$f$),
      ('copilot_logs',                     'public.copilot_logs',           $f$email = 'rls-other-op@test'$f$),
      ('admin_notifications',              'public.admin_notifications',    $f$row_id = 'rls-test-draft'$f$),
      ('content_gate_reports',             'public.content_gate_reports',   $f$row_id = 'rls-test-draft'$f$),
      ('another operator''s telemetry_events', 'public.telemetry_events',   $f$user_email = 'rls-other-op@test'$f$)
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

rollback;

select 'RLS checks passed' as result;
