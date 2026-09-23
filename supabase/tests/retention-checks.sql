-- Retention verification — run against the STAGING project only (see
-- docs/TESTING.md), after 0016_dashboard_rpc_and_retention.sql.
--
-- Paste the whole file into the Supabase SQL editor and run it once. It
-- inserts, for every rule in public.run_retention(), one row just past the
-- horizon and one just inside it (markers `retention-*`), runs the function as
-- the editor's own role (pg_cron's path), and asserts which fixture rows are
-- gone. It then runs it again to prove a second run finds nothing to do, checks
-- the p_skip_if_scheduled switch the app's cron uses, and that no session role
-- may execute it.
--
-- run_retention() also prunes whatever real staging rows are past a horizon,
-- but the whole script ends in ROLLBACK (and a failed assertion aborts it), so
-- nothing is deleted for good. Like rls-checks.sql it holds row locks while it
-- runs — staging only, never production.
--
--   Passed: the last result is a single row "Retention checks passed".
--   Failed: an error whose message starts with "RETENTION FAIL:".

begin;

-- === Fixtures (as the editor's own role) =====================================
-- now() is fixed for the whole transaction, so "181 days" here and the
-- function's own now() agree to the microsecond.

insert into public.telemetry_events (user_email, session_id, ts, type, path) values
  ('retention@test', 'retention-181d', now() - interval '181 days', 'page_enter', '/'),
  ('retention@test', 'retention-179d', now() - interval '179 days', 'page_enter', '/');

-- `model` marks each row: the question itself is what gets nulled.
insert into public.copilot_logs (ts, email, question, model, status) values
  (now() - interval '91 days', 'retention@test', 'retention question', 'retention-91d', 'ok'),
  (now() - interval '31 days', 'retention@test', 'retention question', 'retention-31d', 'ok'),
  (now() - interval '29 days', 'retention@test', 'retention question', 'retention-29d', 'ok');

insert into public.content_gate_reports (created_at, table_name, row_id, passed) values
  (now() - interval '181 days', 'content_faqs', 'retention-181d', true),
  (now() - interval '179 days', 'content_faqs', 'retention-179d', true);

insert into public.admin_notifications (created_at, kind, severity, title, read_at) values
  (now() - interval '91 days', 'stale_content', 'info', 'retention-read-91d', now() - interval '1 day'),
  (now() - interval '91 days', 'stale_content', 'info', 'retention-unread-91d', null),
  (now() - interval '89 days', 'stale_content', 'info', 'retention-read-89d', now() - interval '1 day');

-- 52 edits of one row (n = 1 is the newest): the two oldest must go. A row with
-- 3 edits keeps all of them. Delete snapshots follow the 180-day rule instead,
-- however many there are.
insert into public.content_versions (table_name, row_id, snapshot, op, created_at)
select 'content_faqs', 'retention-many', jsonb_build_object('n', n), 'update', now() - make_interval(mins => n)
from generate_series(1, 52) as n;

insert into public.content_versions (table_name, row_id, snapshot, op, created_at)
select 'content_faqs', 'retention-few', jsonb_build_object('n', n), 'update', now() - make_interval(days => 400 + n)
from generate_series(1, 3) as n;

insert into public.content_versions (table_name, row_id, snapshot, op, created_at) values
  ('content_faqs', 'retention-del-181d', '{}', 'delete', now() - interval '181 days'),
  ('content_faqs', 'retention-del-179d', '{}', 'delete', now() - interval '179 days');

-- Deleted 10 days ago, restored from the trash and edited 52 times since: its
-- delete snapshot is older than every one of those edits but inside 180 days,
-- so it stays. The newest-50 rule ranks update snapshots only — a ranking over
-- every op would evict it as the row's 53rd-newest snapshot.
insert into public.content_versions (table_name, row_id, snapshot, op, created_at)
select 'content_faqs', 'retention-restored', jsonb_build_object('n', n), 'update', now() - make_interval(mins => n)
from generate_series(1, 52) as n;

insert into public.content_versions (table_name, row_id, snapshot, op, created_at) values
  ('content_faqs', 'retention-restored', '{}', 'delete', now() - interval '10 days');

-- === One run, as pg_cron would run it ==========================================

do $$
declare
  r record;
  n bigint;
begin
  select * into strict r from public.run_retention();

  if r.skipped then
    raise exception 'RETENTION FAIL: run_retention() skipped although p_skip_if_scheduled is false';
  end if;

  -- telemetry_events: 180 days
  if exists (select 1 from public.telemetry_events where session_id = 'retention-181d') then
    raise exception 'RETENTION FAIL: a 181-day-old telemetry event survived';
  end if;
  if not exists (select 1 from public.telemetry_events where session_id = 'retention-179d') then
    raise exception 'RETENTION FAIL: a 179-day-old telemetry event was deleted';
  end if;

  -- copilot_logs: question nulled after 30 days, row deleted after 90
  if exists (select 1 from public.copilot_logs where model = 'retention-91d') then
    raise exception 'RETENTION FAIL: a 91-day-old copilot_logs row survived';
  end if;
  if not exists (select 1 from public.copilot_logs where model = 'retention-31d' and question is null) then
    raise exception 'RETENTION FAIL: a 31-day-old copilot_logs row is gone or still holds its question';
  end if;
  if not exists (select 1 from public.copilot_logs where model = 'retention-29d' and question is not null) then
    raise exception 'RETENTION FAIL: a 29-day-old copilot_logs question was removed';
  end if;

  -- content_gate_reports: 180 days
  if exists (select 1 from public.content_gate_reports where row_id = 'retention-181d') then
    raise exception 'RETENTION FAIL: a 181-day-old content_gate_reports row survived';
  end if;
  if not exists (select 1 from public.content_gate_reports where row_id = 'retention-179d') then
    raise exception 'RETENTION FAIL: a 179-day-old content_gate_reports row was deleted';
  end if;

  -- admin_notifications: read ones older than 90 days; unread ones never
  if exists (select 1 from public.admin_notifications where title = 'retention-read-91d') then
    raise exception 'RETENTION FAIL: a read 91-day-old notification survived';
  end if;
  if not exists (select 1 from public.admin_notifications where title = 'retention-unread-91d') then
    raise exception 'RETENTION FAIL: an UNREAD notification was deleted';
  end if;
  if not exists (select 1 from public.admin_notifications where title = 'retention-read-89d') then
    raise exception 'RETENTION FAIL: a read 89-day-old notification was deleted';
  end if;

  -- content_versions: newest 50 update snapshots per row
  select count(*) into n from public.content_versions where row_id = 'retention-many' and op = 'update';
  if n <> 50 then
    raise exception 'RETENTION FAIL: % update snapshots kept for a row with 52 (expected 50)', n;
  end if;
  if exists (
    select 1 from public.content_versions
    where row_id = 'retention-many' and (snapshot ->> 'n')::int > 50
  ) then
    raise exception 'RETENTION FAIL: an old update snapshot was kept instead of a newer one';
  end if;
  select count(*) into n from public.content_versions where row_id = 'retention-few';
  if n <> 3 then
    raise exception 'RETENTION FAIL: % of 3 update snapshots kept for a row with only 3 (age must not matter)', n;
  end if;

  -- content_versions: delete snapshots for 180 days
  if exists (select 1 from public.content_versions where row_id = 'retention-del-181d') then
    raise exception 'RETENTION FAIL: a 181-day-old delete snapshot survived';
  end if;
  if not exists (select 1 from public.content_versions where row_id = 'retention-del-179d') then
    raise exception 'RETENTION FAIL: a 179-day-old delete snapshot was deleted';
  end if;
  if not exists (select 1 from public.content_versions where row_id = 'retention-restored' and op = 'delete') then
    raise exception 'RETENTION FAIL: a 10-day-old delete snapshot was deleted because its row has 50+ newer edits';
  end if;
  select count(*) into n from public.content_versions where row_id = 'retention-restored' and op = 'update';
  if n <> 50 then
    raise exception 'RETENTION FAIL: % update snapshots kept for a restored row with 52 (expected 50)', n;
  end if;

  -- The counts cover at least the fixture (real staging rows may add to them).
  if r.telemetry_events_deleted < 1 or r.copilot_logs_deleted < 1 or r.copilot_logs_redacted < 1
     or r.content_gate_reports_deleted < 1 or r.admin_notifications_deleted < 1
     or r.content_versions_updates_deleted < 2 or r.content_versions_deletes_deleted < 1 then
    raise exception 'RETENTION FAIL: the returned counts miss fixture rows: %', to_jsonb(r);
  end if;
end $$;

-- === A second run finds nothing, and the app's skip switch =====================

do $$
declare
  r record;
  job_active boolean := false;
begin
  select * into strict r from public.run_retention();
  if r.telemetry_events_deleted + r.copilot_logs_redacted + r.copilot_logs_deleted
     + r.content_gate_reports_deleted + r.admin_notifications_deleted
     + r.content_versions_updates_deleted + r.content_versions_deletes_deleted <> 0 then
    raise exception 'RETENTION FAIL: a second run in the same instant still changed rows: %', to_jsonb(r);
  end if;

  -- p_skip_if_scheduled (what /api/cron/content-scan passes) skips exactly when
  -- 0016's pg_cron job exists and is active.
  if to_regclass('cron.job') is not null then
    execute 'select exists (select 1 from cron.job where jobname = $1 and active)'
      into job_active using 'watertech-run-retention';
  end if;

  select * into strict r from public.run_retention(true);
  if r.skipped is distinct from job_active then
    raise exception 'RETENTION FAIL: run_retention(true) returned skipped = % while the pg_cron job active = %',
      r.skipped, job_active;
  end if;
end $$;

-- === Only service_role (and pg_cron, as the owner) may run it =====================

do $$
begin
  if not has_function_privilege('service_role', 'public.run_retention(boolean)', 'execute') then
    raise exception 'RETENTION FAIL: service_role cannot execute run_retention() — /api/cron/content-scan would fail';
  end if;
  if has_function_privilege('authenticated', 'public.run_retention(boolean)', 'execute') then
    raise exception 'RETENTION FAIL: authenticated can execute run_retention()';
  end if;
  if has_function_privilege('anon', 'public.run_retention(boolean)', 'execute') then
    raise exception 'RETENTION FAIL: anon can execute run_retention()';
  end if;
end $$;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated","email":"retention-manager@test","app_metadata":{"role":"manager"}}';

do $$
begin
  perform public.run_retention();
  raise exception 'RETENTION FAIL: a manager session can execute run_retention()';
exception when insufficient_privilege then null; -- EXECUTE revoked, as intended
end $$;

rollback;

select 'Retention checks passed' as result;
