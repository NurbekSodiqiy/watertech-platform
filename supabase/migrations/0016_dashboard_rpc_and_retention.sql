-- Audit-2 / S09 — dashboard aggregates move into Postgres, and every log table
-- gets a retention policy.
--
-- The two findings this file closes:
--
--   1. lib/dashboard/telemetry-window.ts pulled raw telemetry_events rows for
--      the previous + current range (up to ~186 days) with no order, limit or
--      pagination. PostgREST caps a response at max-rows (1000 by default), so
--      as soon as a window held more than 1000 events every KPI, the
--      per-operator cards, the hourly table, zero-result searches and web
--      vitals were computed on an arbitrary subset — silently. The functions
--      below return aggregates only (at most one row per operator, 24 hourly
--      rows, capped ranked lists), and no raw telemetry row leaves the
--      database for dashboard rendering any more.
--   2. Nothing was ever deleted: telemetry_events, copilot_logs (question text
--      and email — personal data), content_gate_reports, read
--      admin_notifications and content_versions grew forever.
--      public.run_retention() is the one place the retention policy lives.
--
-- SEMANTICS — what the SQL reproduces. The TS aggregators stay in the repo as
-- the reference (lib/telemetry/aggregate.ts, lib/dashboard/kpi.ts,
-- lib/dashboard/quality.ts); supabase/tests/dashboard-parity.sql and
-- tests/unit/dashboard/parity.test.ts pin both sides to one expected table.
--
--   Windows      The caller passes UTC instants. lib/dashboard/range.ts turns a
--                Tashkent calendar date D into [D 00:00 +05, D+1 00:00 +05);
--                the current range is [p_from, p_to), the previous
--                equal-length range [p_prev_from, p_from). Boundaries are
--                compared as timestamptz, so an event at exactly p_from is
--                "current" (the old TS split compared ISO strings in two
--                different formats and could misfile that one instant).
--   Operator     p_operator null or '' = every operator; otherwise exact
--                equality on user_email (filterRows).
--   First seen   Every JS Map in the aggregators keeps first-insertion order and
--                every sort is stable, so ties fall back to the order rows were
--                read in. Here that order is fixed as (ts, id): ties rank by the
--                group's earliest (ts, id).
--   Active ms    Per operator: sum(page_leave.duration_ms, null = 0) minus idle
--                time, clamped at 0 per operator (then summed for the KPI).
--                Idle time pairs idle_start/idle_end per (operator, session_id)
--                in (ts, id) order: an idle_end counts iff the idle event right
--                before it in that session is an idle_start, and adds
--                end - start. So a repeated idle_start restarts the pending
--                interval, an idle_end with nothing pending adds nothing, and a
--                trailing idle_start adds nothing. Instants are truncated to
--                whole milliseconds first, like JS Date.
--   Active ops   Distinct user_email over page_enter events.
--   Zero-result  type = 'search' with meta.resultCount the JSON number 0 (not
--                "0"), meta.query a string, and trim(query).toLowerCase()
--                non-empty. trim uses the exact ECMAScript whitespace set;
--                lowercasing uses ICU's root locale (JS toLowerCase is the
--                Unicode default mapping — "İ" and final sigma included) when
--                the und-x-icu collation exists. Grouped by that key; count,
--                last seen = max(ts).
--   Hourly       Every event in the window, bucketed by the hour of ts at time
--                zone 'Asia/Tashkent' (UTC+5, no DST since 1992 — identical to
--                the fixed offset in aggregate.ts). Always 24 rows.
--   Web vitals   type = 'web_vital', meta.name a non-empty string, meta.value a
--                JSON number. Per name over ascending values:
--                p = sorted[min(n - 1, floor(p * n))] (0-based) — NOT
--                percentile_disc, which picks index ceil(p * n) - 1. Ordered by
--                name (the fixed web-vitals set: uppercase ASCII, where "C"
--                order and localeCompare agree).
--   Top viewed   Per operator, the six *_view/script_select types, keyed by
--                (type, coalesce(entity_id, path)); top 5 by count. Label and
--                admin link are resolved in TS (they need the content bundle),
--                from the entity_id/path of the group's first-seen row.
--   Checklist    Latest checklist_toggle per non-empty entity_id, latest by
--                (ts, id); counted when JS !!meta.checked would be true
--                (true, non-empty string, non-zero number, object, array).
--   Not helpful  type = 'feedback' with meta.helpful exactly JSON false, per path.
--   Most viewed  stage_view / objection_view / faq_view, keyed like top viewed,
--                across operators.
--   Deltas       Not here: the functions return current and previous values and
--                lib/dashboard/kpi.ts's delta() keeps JS Math.round semantics.
--
-- Where the SQL is deliberately stricter than the TS: a non-string search query
-- or a non-string web-vital name made the TS throw (String#trim /
-- localeCompare on a number) and 500 the whole page; here such a row is
-- simply not counted.
--
-- Every dashboard function is SECURITY INVOKER: it runs as the calling manager,
-- so telemetry_events_manager_select_all (0014) still decides which rows it can
-- read. Each one ALSO starts with private.is_manager() and raises WT403 for
-- anyone else, so an operator gets a refusal rather than a zero-filled answer.
--
-- APPLY ORDER (see docs/MIGRATIONS.md): after 0015. Re-running it is safe.
-- Run as `postgres` in the SQL editor: run_retention() is SECURITY DEFINER and
-- must belong to the owner of the six tables it prunes.

begin;

-- =============================================================================
-- Section 0 — preflight
-- =============================================================================

do $preflight$
declare
  required constant text[] := array[
    'telemetry_events', 'copilot_logs', 'content_gate_reports',
    'admin_notifications', 'content_versions'
  ];
  t text;
  missing text[] := '{}';
begin
  if to_regprocedure('private.is_manager()') is null then
    raise exception '0016: private.is_manager() is missing — apply 0014_role_gated_rls.sql first.';
  end if;

  foreach t in array required loop
    if to_regclass('public.' || t) is null then
      missing := missing || t;
    end if;
  end loop;

  if array_length(missing, 1) is not null then
    raise exception '0016: missing table(s): %. Apply 0006, 0007 and 0013 first.', array_to_string(missing, ', ');
  end if;

  -- run_retention() keeps 'update' and 'delete' snapshots under different rules.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'content_versions' and column_name = 'op'
  ) then
    raise exception '0016: public.content_versions.op is missing — apply 0013 first.';
  end if;
end
$preflight$;

-- =============================================================================
-- Section 1 — indexes
-- =============================================================================
-- The two 0013 indexes are replaced by covering versions with the same key
-- columns, so every plan that used them can use these, and the dashboard's
-- scans become index-only (the visibility map of an append-only table stays
-- set: autovacuum runs on inserts since PG 13):
--   (ts)       + id, user_email, type — hourly buckets, operator first-seen,
--                                        copy counts, retention's range delete
--   (type, ts) + id, user_email, session_id, duration_ms — page_enter,
--                                        page_leave sums, idle pairing
-- Keeping the old ones next to them would only double the write cost of every
-- /api/events batch. Like 0013's, the builds block writes to telemetry_events
-- until the transaction commits — see docs/MIGRATIONS.md.

create index if not exists telemetry_events_ts_cover_idx
  on public.telemetry_events (ts) include (id, user_email, type);
drop index if exists public.telemetry_events_ts_idx;

create index if not exists telemetry_events_type_ts_cover_idx
  on public.telemetry_events (type, ts) include (id, user_email, session_id, duration_ms);
drop index if exists public.telemetry_events_type_ts_idx;

-- Retention range scans. content_gate_reports' only index leads with
-- (table_name, row_id); content_versions' delete snapshots are a small slice of
-- that table, so a partial index keeps the daily delete off a full scan.
create index if not exists content_gate_reports_created_idx
  on public.content_gate_reports (created_at);
create index if not exists content_versions_delete_created_idx
  on public.content_versions (created_at) where op = 'delete';

-- =============================================================================
-- Section 2 — private helpers
-- =============================================================================
-- Set-returning, so each is called once per dashboard query, not once per row:
-- a function with `set search_path` is never inlined, and a per-row call would
-- cost far more than the aggregation itself. They live in `private` (not
-- exposed by PostgREST), carry no manager check of their own — they are only
-- reachable from the public functions below, which check first — and run as
-- the caller, so RLS on telemetry_events still applies inside them.

-- Active time per operator for one window (see "Active ms" above). The one
-- definition both dashboard_kpis (twice: current and previous) and
-- dashboard_operator_activity use.
create or replace function private.dashboard_active_ms(
  p_from timestamptz,
  p_to timestamptz,
  p_operator text
)
returns table (operator_email text, active_ms bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with idle_edges as (
    select
      e.user_email,
      e.type,
      e.ts,
      lag(e.type) over pairing as prev_type,
      lag(e.ts) over pairing as prev_ts
    from public.telemetry_events e
    where e.type in ('idle_start', 'idle_end')
      and e.ts >= p_from and e.ts < p_to
      and (p_operator is null or e.user_email = p_operator)
    window pairing as (partition by e.user_email, e.session_id order by e.ts, e.id)
  ),
  idle as (
    select
      i.user_email,
      sum(floor(extract(epoch from i.ts) * 1000) - floor(extract(epoch from i.prev_ts) * 1000)) as ms
    from idle_edges i
    where i.type = 'idle_end' and i.prev_type = 'idle_start'
    group by i.user_email
  ),
  visible as (
    select e.user_email, sum(coalesce(e.duration_ms, 0)) as ms
    from public.telemetry_events e
    where e.type = 'page_leave'
      and e.ts >= p_from and e.ts < p_to
      and (p_operator is null or e.user_email = p_operator)
    group by e.user_email
  )
  select
    coalesce(v.user_email, i.user_email),
    greatest(0, coalesce(v.ms, 0) - coalesce(i.ms, 0))::bigint
  from visible v
  full join idle i on i.user_email = v.user_email
$$;

comment on function private.dashboard_active_ms(timestamptz, timestamptz, text) is
  'Per-operator active ms in [p_from, p_to): page_leave durations minus paired idle time, clamped at 0. Mirrors aggregatePerOperator in lib/telemetry/aggregate.ts.';

-- Zero-result searches in one window, one row per event, with the normalized
-- key (see "Zero-result" above). Created through EXECUTE because the collation
-- is chosen at migration time: und-x-icu reproduces JS toLowerCase exactly, and
-- a Postgres built without ICU falls back to the database default (which only
-- differs on edge cases such as "İ" and final sigma).
do $zero_result_events$
declare
  lower_collation constant text := case
    when exists (select 1 from pg_catalog.pg_collation where collname = 'und-x-icu')
      then 'pg_catalog."und-x-icu"'
    else 'pg_catalog."default"'
  end;
begin
  -- The btrim set is ECMAScript's WhiteSpace + LineTerminator: TAB, LF, VT, FF,
  -- CR, SPACE, NBSP, U+1680, U+2000-U+200A, LS, PS, U+202F, U+205F, U+3000, BOM.
  execute format($ddl$
    create or replace function private.dashboard_zero_result_events(
      p_from timestamptz,
      p_to timestamptz,
      p_operator text
    )
    returns table (event_id bigint, event_ts timestamptz, search_key text)
    language sql
    stable
    security invoker
    set search_path = ''
    as $fn$
      select z.id, z.ts, z.search_key
      from (
        select
          e.id,
          e.ts,
          lower(
            btrim(
              e.meta ->> 'query',
              E'\t\n\u000b\f\r                  　﻿'
            ) collate %s
          ) as search_key
        from public.telemetry_events e
        where e.type = 'search'
          and e.ts >= p_from and e.ts < p_to
          and (p_operator is null or e.user_email = p_operator)
          -- jsonb compares numbers numerically (0 = 0.0 = -0) and never equals
          -- the string "0" — exactly `meta.resultCount === 0`.
          and e.meta -> 'resultCount' = '0'::jsonb
          and jsonb_typeof(e.meta -> 'query') = 'string'
      ) z
      where z.search_key <> ''
    $fn$
  $ddl$, lower_collation);

  if lower_collation = 'pg_catalog."default"' then
    raise notice '0016: collation und-x-icu not found — zero-result search keys are lowercased with the database default collation.';
  end if;
end
$zero_result_events$;

comment on function private.dashboard_zero_result_events(timestamptz, timestamptz, text) is
  'Zero-result search events in [p_from, p_to) with the trimmed, lowercased query as search_key. Mirrors aggregateZeroResultSearches in lib/telemetry/aggregate.ts.';

revoke all on function
  private.dashboard_active_ms(timestamptz, timestamptz, text),
  private.dashboard_zero_result_events(timestamptz, timestamptz, text)
  from public, anon, service_role;
grant execute on function
  private.dashboard_active_ms(timestamptz, timestamptz, text),
  private.dashboard_zero_result_events(timestamptz, timestamptz, text)
  to authenticated;

-- =============================================================================
-- Section 3 — the dashboard functions (PostgREST: supabase.rpc(...))
-- =============================================================================
-- Output columns are named so they never collide with a telemetry_events
-- column: in plpgsql every RETURNS TABLE column is also a variable, and an
-- unqualified name that is both would be ambiguous. All column references in
-- the bodies are qualified regardless.
--
-- Argument errors raise WT400, a non-manager WT403 (the same codes as 0015).
-- Ranked lists take p_limit (1-1000, PostgREST's max-rows) so no response can
-- be truncated behind the caller's back.

-- --- KPI cards ---------------------------------------------------------------
create or replace function public.dashboard_kpis(
  p_from timestamptz,
  p_to timestamptz,
  p_prev_from timestamptz,
  p_operator text default null
)
returns table (
  active_operators bigint,
  active_operators_prev bigint,
  active_ms bigint,
  active_ms_prev bigint,
  zero_result_searches bigint,
  zero_result_searches_prev bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_operator constant text := nullif(p_operator, '');
begin
  if not (select private.is_manager()) then
    raise exception 'dashboard_kpis: manager role required' using errcode = 'WT403';
  end if;

  if p_from is null or p_to is null or p_prev_from is null or p_prev_from > p_from or p_from > p_to then
    raise exception 'dashboard_kpis: expected p_prev_from <= p_from <= p_to' using errcode = 'WT400';
  end if;

  return query
  select
    (select count(distinct e.user_email)
       from public.telemetry_events e
      where e.type = 'page_enter'
        and e.ts >= p_from and e.ts < p_to
        and (v_operator is null or e.user_email = v_operator)),
    (select count(distinct e.user_email)
       from public.telemetry_events e
      where e.type = 'page_enter'
        and e.ts >= p_prev_from and e.ts < p_from
        and (v_operator is null or e.user_email = v_operator)),
    (select coalesce(sum(a.active_ms), 0)::bigint
       from private.dashboard_active_ms(p_from, p_to, v_operator) a),
    (select coalesce(sum(a.active_ms), 0)::bigint
       from private.dashboard_active_ms(p_prev_from, p_from, v_operator) a),
    (select count(*)
       from private.dashboard_zero_result_events(p_from, p_to, v_operator) z),
    (select count(*)
       from private.dashboard_zero_result_events(p_prev_from, p_from, v_operator) z);
end;
$$;

comment on function public.dashboard_kpis(timestamptz, timestamptz, timestamptz, text) is
  'KPI totals for [p_from, p_to) and the previous window [p_prev_from, p_from): active operators, active ms, zero-result searches. Manager only (WT403).';

-- --- Per-operator cards --------------------------------------------------------
create or replace function public.dashboard_operator_activity(
  p_from timestamptz,
  p_to timestamptz,
  p_operator text default null
)
returns table (
  operator_email text,
  active_ms bigint,
  copy_count bigint,
  checklist_completed bigint,
  top_viewed jsonb
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_operator constant text := nullif(p_operator, '');
begin
  if not (select private.is_manager()) then
    raise exception 'dashboard_operator_activity: manager role required' using errcode = 'WT403';
  end if;

  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'dashboard_operator_activity: expected p_from <= p_to' using errcode = 'WT400';
  end if;

  return query
  with op_first as (
    -- Every operator with any event in the window gets a card, as before.
    -- This scans the whole window, so it keeps only min(ts); the id half of
    -- the (ts, id) tie-break is looked up per operator in the final ORDER BY.
    select
      e.user_email,
      min(e.ts) as first_ts,
      count(*) filter (where e.type = 'copy') as copies
    from public.telemetry_events e
    where e.ts >= p_from and e.ts < p_to
      and (v_operator is null or e.user_email = v_operator)
    group by e.user_email
  ),
  op_views as (
    select
      g.user_email,
      g.view_type,
      g.view_count,
      g.first_seen,
      row_number() over (partition by g.user_email order by g.view_count desc, g.first_seen) as view_rank
    from (
      select
        e.user_email,
        e.type as view_type,
        count(*) as view_count,
        min(array[extract(epoch from e.ts), e.id::numeric]) as first_seen
      from public.telemetry_events e
      where e.type in ('script_select', 'stage_view', 'objection_view', 'competitor_view', 'package_view', 'faq_view')
        and e.ts >= p_from and e.ts < p_to
        and (v_operator is null or e.user_email = v_operator)
      group by e.user_email, e.type, coalesce(e.entity_id, e.path)
    ) g
  ),
  op_top as (
    -- The group's first-seen row supplies entity_id/path for the label, the
    -- same row the TS Map kept. LATERAL ... LIMIT 1 keeps this one primary-key
    -- probe per listed group: as a plain join the planner may merge-join along
    -- the whole primary key, and ids ascend with time, so that walk would cover
    -- nearly the entire table.
    select
      v.user_email,
      jsonb_agg(
        jsonb_build_object(
          'view_type', v.view_type,
          'entity_id', t.entity_id,
          'path', t.path,
          'view_count', v.view_count
        )
        order by v.view_rank
      ) as items
    from op_views v
    cross join lateral (
      select x.entity_id, x.path
      from public.telemetry_events x
      where x.id = (v.first_seen[2])::bigint
      limit 1
    ) t
    where v.view_rank <= 5
    group by v.user_email
  ),
  op_checklist as (
    select l.user_email, count(*) filter (where l.is_checked) as completed
    from (
      select distinct on (e.user_email, e.entity_id)
        e.user_email,
        -- JS truthiness of meta.checked. jsonb compares numbers numerically,
        -- so 0, 0.0 and -0 are all the falsy zero.
        case jsonb_typeof(e.meta -> 'checked')
          when 'boolean' then e.meta -> 'checked' = 'true'::jsonb
          when 'string' then e.meta -> 'checked' <> '""'::jsonb
          when 'number' then e.meta -> 'checked' <> '0'::jsonb
          when 'object' then true
          when 'array' then true
          else false
        end as is_checked
      from public.telemetry_events e
      where e.type = 'checklist_toggle'
        and e.entity_id is not null and e.entity_id <> ''
        and e.ts >= p_from and e.ts < p_to
        and (v_operator is null or e.user_email = v_operator)
      order by e.user_email, e.entity_id, e.ts desc, e.id desc
    ) l
    group by l.user_email
  ),
  op_active as (
    select a.operator_email, a.active_ms
    from private.dashboard_active_ms(p_from, p_to, v_operator) a
  )
  select
    f.user_email,
    coalesce(ac.active_ms, 0),
    f.copies,
    coalesce(c.completed, 0),
    coalesce(tv.items, '[]'::jsonb)
  from op_first f
  left join op_active ac on ac.operator_email = f.user_email
  left join op_checklist c on c.user_email = f.user_email
  left join op_top tv on tv.user_email = f.user_email
  order by
    coalesce(ac.active_ms, 0) desc,
    f.first_ts,
    -- One (user_email, ts) index probe per operator, only to order two
    -- operators whose first events share an instant.
    (select min(x.id)
       from public.telemetry_events x
      where x.user_email = f.user_email and x.ts = f.first_ts);
end;
$$;

comment on function public.dashboard_operator_activity(timestamptz, timestamptz, text) is
  'One row per operator active in [p_from, p_to): active ms, copies, completed checklist items, top 5 viewed entities (jsonb). Manager only (WT403).';

-- --- Hourly plan vs fact --------------------------------------------------------
create or replace function public.dashboard_hourly(
  p_from timestamptz,
  p_to timestamptz,
  p_operator text default null
)
returns table (hour_of_day integer, event_count bigint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_operator constant text := nullif(p_operator, '');
begin
  if not (select private.is_manager()) then
    raise exception 'dashboard_hourly: manager role required' using errcode = 'WT403';
  end if;

  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'dashboard_hourly: expected p_from <= p_to' using errcode = 'WT400';
  end if;

  return query
  select h.hour_of_day, coalesce(c.event_count, 0::bigint)
  from generate_series(0, 23) as h(hour_of_day)
  left join (
    select
      extract(hour from e.ts at time zone 'Asia/Tashkent')::integer as hour_of_day,
      count(*) as event_count
    from public.telemetry_events e
    where e.ts >= p_from and e.ts < p_to
      and (v_operator is null or e.user_email = v_operator)
    group by 1
  ) c on c.hour_of_day = h.hour_of_day
  order by h.hour_of_day;
end;
$$;

comment on function public.dashboard_hourly(timestamptz, timestamptz, text) is
  'Event counts per Asia/Tashkent hour (always 24 rows) in [p_from, p_to). Manager only (WT403).';

-- --- Zero-result searches ---------------------------------------------------------
create or replace function public.dashboard_zero_result_searches(
  p_from timestamptz,
  p_to timestamptz,
  p_operator text default null,
  p_limit integer default 100
)
returns table (search_query text, search_count bigint, last_seen_at timestamptz)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_operator constant text := nullif(p_operator, '');
begin
  if not (select private.is_manager()) then
    raise exception 'dashboard_zero_result_searches: manager role required' using errcode = 'WT403';
  end if;

  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'dashboard_zero_result_searches: expected p_from <= p_to' using errcode = 'WT400';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception 'dashboard_zero_result_searches: p_limit must be 1-1000' using errcode = 'WT400';
  end if;

  return query
  select z.search_key, count(*), max(z.event_ts)
  from private.dashboard_zero_result_events(p_from, p_to, v_operator) z
  group by z.search_key
  order by count(*) desc, min(array[extract(epoch from z.event_ts), z.event_id::numeric])
  limit p_limit;
end;
$$;

comment on function public.dashboard_zero_result_searches(timestamptz, timestamptz, text, integer) is
  'Zero-result search queries in [p_from, p_to), most frequent first, with the last time each was seen. Manager only (WT403).';

-- --- Web vitals -------------------------------------------------------------------
create or replace function public.dashboard_web_vitals(
  p_from timestamptz,
  p_to timestamptz,
  p_operator text default null
)
returns table (metric_name text, p50 numeric, p75 numeric, samples bigint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_operator constant text := nullif(p_operator, '');
begin
  if not (select private.is_manager()) then
    raise exception 'dashboard_web_vitals: manager role required' using errcode = 'WT403';
  end if;

  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'dashboard_web_vitals: expected p_from <= p_to' using errcode = 'WT400';
  end if;

  return query
  with vitals as (
    select
      e.meta ->> 'name' as metric,
      -- numeric, not double precision: jsonb holds any JSON number, and a
      -- cast that can overflow would fail the whole call on one bad row.
      case when jsonb_typeof(e.meta -> 'value') = 'number' then (e.meta ->> 'value')::numeric end as metric_value
    from public.telemetry_events e
    where e.type = 'web_vital'
      and e.ts >= p_from and e.ts < p_to
      and (v_operator is null or e.user_email = v_operator)
      and jsonb_typeof(e.meta -> 'name') = 'string'
      and e.meta ->> 'name' <> ''
      and jsonb_typeof(e.meta -> 'value') = 'number'
  ),
  ranked as (
    select
      v.metric,
      v.metric_value,
      row_number() over (partition by v.metric order by v.metric_value) as rn,
      count(*) over (partition by v.metric) as n
    from vitals v
  )
  select
    r.metric,
    max(r.metric_value) filter (where r.rn = least(r.n, floor(r.n * 0.5)::bigint + 1)),
    max(r.metric_value) filter (where r.rn = least(r.n, floor(r.n * 0.75)::bigint + 1)),
    max(r.n)
  from ranked r
  group by r.metric
  order by r.metric collate "C";
end;
$$;

comment on function public.dashboard_web_vitals(timestamptz, timestamptz, text) is
  'Per-metric p50/p75 (sorted[min(n-1, floor(p*n))]) and sample count of web_vital events in [p_from, p_to). Manager only (WT403).';

-- --- "Not helpful" feedback (Sifat) ------------------------------------------------
create or replace function public.dashboard_not_helpful(
  p_from timestamptz,
  p_to timestamptz,
  p_operator text default null,
  p_limit integer default 100
)
returns table (page_path text, feedback_count bigint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_operator constant text := nullif(p_operator, '');
begin
  if not (select private.is_manager()) then
    raise exception 'dashboard_not_helpful: manager role required' using errcode = 'WT403';
  end if;

  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'dashboard_not_helpful: expected p_from <= p_to' using errcode = 'WT400';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception 'dashboard_not_helpful: p_limit must be 1-1000' using errcode = 'WT400';
  end if;

  return query
  select e.path, count(*)
  from public.telemetry_events e
  where e.type = 'feedback'
    and e.ts >= p_from and e.ts < p_to
    and (v_operator is null or e.user_email = v_operator)
    and e.meta -> 'helpful' = 'false'::jsonb
  group by e.path
  order by count(*) desc, min(array[extract(epoch from e.ts), e.id::numeric])
  limit p_limit;
end;
$$;

comment on function public.dashboard_not_helpful(timestamptz, timestamptz, text, integer) is
  'Pages marked "not helpful" in [p_from, p_to), most reported first. Manager only (WT403).';

-- --- Most viewed content (Sifat) ------------------------------------------------------
create or replace function public.dashboard_most_viewed(
  p_from timestamptz,
  p_to timestamptz,
  p_operator text default null,
  p_limit integer default 10
)
returns table (view_type text, view_entity_id text, view_path text, view_count bigint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_operator constant text := nullif(p_operator, '');
begin
  if not (select private.is_manager()) then
    raise exception 'dashboard_most_viewed: manager role required' using errcode = 'WT403';
  end if;

  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'dashboard_most_viewed: expected p_from <= p_to' using errcode = 'WT400';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception 'dashboard_most_viewed: p_limit must be 1-1000' using errcode = 'WT400';
  end if;

  return query
  select g.view_type, t.entity_id, t.path, g.view_count
  from (
    select
      e.type as view_type,
      count(*) as view_count,
      min(array[extract(epoch from e.ts), e.id::numeric]) as first_seen
    from public.telemetry_events e
    where e.type in ('stage_view', 'objection_view', 'faq_view')
      and e.ts >= p_from and e.ts < p_to
      and (v_operator is null or e.user_email = v_operator)
    group by e.type, coalesce(e.entity_id, e.path)
    order by count(*) desc, min(array[extract(epoch from e.ts), e.id::numeric])
    limit p_limit
  ) g
  -- One primary-key probe per listed group (see op_top in
  -- dashboard_operator_activity for why this is not a plain join).
  cross join lateral (
    select x.entity_id, x.path
    from public.telemetry_events x
    where x.id = (g.first_seen[2])::bigint
    limit 1
  ) t
  order by g.view_count desc, g.first_seen;
end;
$$;

comment on function public.dashboard_most_viewed(timestamptz, timestamptz, text, integer) is
  'Most viewed scripts stages, objections and FAQs in [p_from, p_to), with the first-seen row''s entity_id/path for the label. Manager only (WT403).';

-- `create function` grants EXECUTE to PUBLIC, and Supabase's default privileges
-- grant it to anon, authenticated and service_role directly — revoke all of
-- those, then grant the one role a manager's session uses. An operator is also
-- `authenticated`: the is_manager() check at the top of each body is what
-- refuses them.
revoke all on function
  public.dashboard_kpis(timestamptz, timestamptz, timestamptz, text),
  public.dashboard_operator_activity(timestamptz, timestamptz, text),
  public.dashboard_hourly(timestamptz, timestamptz, text),
  public.dashboard_zero_result_searches(timestamptz, timestamptz, text, integer),
  public.dashboard_web_vitals(timestamptz, timestamptz, text),
  public.dashboard_not_helpful(timestamptz, timestamptz, text, integer),
  public.dashboard_most_viewed(timestamptz, timestamptz, text, integer)
  from public, anon, service_role;

grant execute on function
  public.dashboard_kpis(timestamptz, timestamptz, timestamptz, text),
  public.dashboard_operator_activity(timestamptz, timestamptz, text),
  public.dashboard_hourly(timestamptz, timestamptz, text),
  public.dashboard_zero_result_searches(timestamptz, timestamptz, text, integer),
  public.dashboard_web_vitals(timestamptz, timestamptz, text),
  public.dashboard_not_helpful(timestamptz, timestamptz, text, integer),
  public.dashboard_most_viewed(timestamptz, timestamptz, text, integer)
  to authenticated;

-- =============================================================================
-- Section 4 — public.run_retention()
-- =============================================================================
-- SECURITY DEFINER: it prunes six tables across every user, including rows no
-- session role may delete (telemetry_events, copilot_logs, content_versions),
-- so it runs as their owner. EXECUTE is service_role's alone; pg_cron runs it
-- as the owner. Nothing it deletes is read by an operator.
--
-- Order inside: copilot_logs rows past the delete horizon go before the
-- redaction, so no row is rewritten only to be deleted. One transaction: a
-- failure anywhere leaves every table as it was.
--
-- p_skip_if_scheduled: the app's daily cron (/api/cron/content-scan) passes
-- true, and the call returns skipped = true without deleting anything when the
-- pg_cron job of Section 5 exists and is active — so the policy runs once a
-- day whichever scheduler this project has, never twice.

create or replace function public.run_retention(p_skip_if_scheduled boolean default false)
returns table (
  skipped boolean,
  telemetry_events_deleted bigint,
  copilot_logs_redacted bigint,
  copilot_logs_deleted bigint,
  content_gate_reports_deleted bigint,
  admin_notifications_deleted bigint,
  content_versions_updates_deleted bigint,
  content_versions_deletes_deleted bigint
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  -- The retention policy. These constants are the only copy of the numbers;
  -- docs/MIGRATIONS.md describes them, nothing else computes with them.
  telemetry_days constant integer := 180;
  copilot_redact_question_days constant integer := 30;
  copilot_delete_days constant integer := 90;
  gate_report_days constant integer := 180;
  read_notification_days constant integer := 90;
  version_updates_kept_per_row constant integer := 50;
  version_delete_snapshot_days constant integer := 180;
  -- Must match the job name scheduled in Section 5.
  cron_job_name constant text := 'watertech-run-retention';

  started_at constant timestamptz := now();
  scheduled boolean := false;
begin
  if p_skip_if_scheduled and to_regclass('cron.job') is not null then
    -- Dynamic: cron.job exists only where pg_cron is enabled, and a static
    -- reference would fail to plan everywhere else.
    execute 'select exists (select 1 from cron.job where jobname = $1 and active)'
      into scheduled
      using cron_job_name;
  end if;

  telemetry_events_deleted := 0;
  copilot_logs_redacted := 0;
  copilot_logs_deleted := 0;
  content_gate_reports_deleted := 0;
  admin_notifications_deleted := 0;
  content_versions_updates_deleted := 0;
  content_versions_deletes_deleted := 0;

  if scheduled then
    skipped := true;
    return next;
    return;
  end if;
  skipped := false;

  delete from public.telemetry_events e
  where e.ts < started_at - make_interval(days => telemetry_days);
  get diagnostics telemetry_events_deleted = row_count;

  delete from public.copilot_logs l
  where l.ts < started_at - make_interval(days => copilot_delete_days);
  get diagnostics copilot_logs_deleted = row_count;

  -- The question is the personal part of the log; the counts, latency and
  -- status stay useful for the full 90 days without it.
  update public.copilot_logs l
  set question = null
  where l.question is not null
    and l.ts < started_at - make_interval(days => copilot_redact_question_days);
  get diagnostics copilot_logs_redacted = row_count;

  delete from public.content_gate_reports r
  where r.created_at < started_at - make_interval(days => gate_report_days);
  get diagnostics content_gate_reports_deleted = row_count;

  -- Unread notifications are kept however old they are: nobody has acted on
  -- them yet.
  delete from public.admin_notifications n
  where n.read_at is not null
    and n.created_at < started_at - make_interval(days => read_notification_days);
  get diagnostics admin_notifications_deleted = row_count;

  -- History a manager restores from (/admin/versions): the newest 50 edits of
  -- each row, newest by (created_at, id).
  delete from public.content_versions cv
  using (
    select ranked.id
    from (
      select
        v.id,
        row_number() over (
          partition by v.table_name, v.row_id
          order by v.created_at desc, v.id desc
        ) as newest_first
      from public.content_versions v
      where v.op = 'update'
    ) ranked
    where ranked.newest_first > version_updates_kept_per_row
  ) old_updates
  where cv.id = old_updates.id;
  get diagnostics content_versions_updates_deleted = row_count;

  -- The trash (/admin/trash) restores deleted rows from these snapshots, so
  -- a deleted row stays recoverable for 180 days.
  delete from public.content_versions v
  where v.op = 'delete'
    and v.created_at < started_at - make_interval(days => version_delete_snapshot_days);
  get diagnostics content_versions_deletes_deleted = row_count;

  return next;
end;
$$;

comment on function public.run_retention(boolean) is
  'Daily retention: telemetry 180 d; copilot_logs question nulled after 30 d, row deleted after 90 d; content_gate_reports 180 d; read admin_notifications 90 d; content_versions newest 50 update snapshots per row and delete snapshots for 180 d. service_role / pg_cron only.';

revoke all on function public.run_retention(boolean) from public, anon, authenticated;
grant execute on function public.run_retention(boolean) to service_role;

-- =============================================================================
-- Section 5 — schedule (pg_cron, when it is enabled)
-- =============================================================================
-- Enabling an extension is a project decision (Dashboard → Database →
-- Extensions), so this only schedules when pg_cron is already on. Without it,
-- /api/cron/content-scan runs run_retention() after its daily scan. Re-running
-- this file re-schedules the same named job (cron.schedule upserts by name).
-- 21:30 UTC = 02:30 in Tashkent, outside working hours.

do $schedule$
begin
  if exists (select 1 from pg_catalog.pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'watertech-run-retention',
      '30 21 * * *',
      'select * from public.run_retention()'
    );
    raise notice '0016: pg_cron job watertech-run-retention scheduled daily at 21:30 UTC.';
  else
    raise notice '0016: pg_cron is not enabled — /api/cron/content-scan runs public.run_retention() after its daily scan.';
  end if;
end
$schedule$;

-- PostgREST picks up new functions from its schema cache; Supabase reloads it
-- on DDL, and this makes sure of it.
notify pgrst, 'reload schema';

commit;
