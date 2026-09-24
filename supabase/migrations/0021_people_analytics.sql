-- R3 / S02 — people analytics: per-person aggregates for the admin panel's
-- people directory (/admin/users, S03) and person page (/admin/users/[email],
-- S04).
--
-- 0016's dashboard_operator_activity answers "who was active in this window":
-- one row per person with an event in it, plus their top-5 views. A people
-- directory starts from the other end — every allow-listed person, the ones
-- with no activity included — and a person page needs per-day series,
-- first/last seen, time per section and a recent-event timeline. The six
-- functions below are those reads:
--
--   public.admin_people_overview(p_from, p_to)
--       one row per allowed_users row (all of them, inactive and admin rows
--       too), zero-filled: the window's totals, first/last seen over all
--       retained telemetry, and a zero-filled per-day series (jsonb).
--   public.admin_person_summary(p_email, p_from, p_to, p_prev_from)
--       one row: the same totals for [p_from, p_to) and, as *_prev, for
--       [p_prev_from, p_from); first/last seen. An unknown email is a zero row.
--   public.admin_person_daily(p_email, p_from, p_to)
--       one row per Tashkent day of the window, zero-filled.
--   public.admin_person_sections(p_email, p_from, p_to)
--       page time and visits per app section.
--   public.admin_person_recent_events(p_email, p_limit)
--       the person's newest events, without the noise types.
--   public.admin_top_content(p_from, p_to, p_limit)
--       the most used content items: views, attributed copies, people.
--
-- Hourly activity and top-viewed per person are not new: S04 calls 0016's
-- dashboard_hourly and dashboard_most_viewed with p_operator.
--
-- SEMANTICS
--
--   Windows      [p_from, p_to), timestamptz, as in 0016. p_from < p_to and the
--                span is at most 93 days: lib/dashboard/range.ts lets a
--                manager pick at most MAX_RANGE_SPAN_DAYS + 1 = 93 calendar
--                days. private.people_check_window raises WT400 otherwise.
--   Days         Asia/Tashkent calendar days (UTC+5, no DST — the zone of
--                0016's hourly buckets). A window's days are every day it
--                touches: from p_from's date to the date of the last instant
--                before p_to.
--   Tracked      Telemetry records operators and sales managers only
--                (CLAUDE.md §9, R3/S01). The telemetry of an email whose
--                allow-list row is 'admin' is never counted here: that row of
--                the overview reads zero (the UI shows "no telemetry" by role,
--                never zeros presented as idleness), the person functions
--                answer zeros or nothing for it, and admin_top_content leaves
--                its events out. What such an email recorded before 0020 — the
--                owner was 'manager' then, and tracked — is the owner using
--                the CMS, not sales work. An email that is not on the
--                allow-list (removed since) is not an admin: its events still
--                count in admin_top_content, and a person function asked about
--                it reads them. private.people_tracked_emails is that rule.
--   Active ms    Totals: private.dashboard_active_ms (0016) itself, so a
--                person's number is their dashboard_operator_activity card for
--                the same window. Per day: the same idle pairing over the whole
--                window; page_leave time and paired idle time (on the day of
--                its idle_end) are summed per day and clamped at 0 per day —
--                the days add up to the total unless some day's idle exceeds
--                its page time.
--   Active days  Distinct Tashkent days with any event.
--   Sessions     Distinct session_id over every event of the window.
--   Content views  script_select, stage_view, objection_view, faq_view,
--                competitor_view, package_view — 0016's six view events.
--   Copies, searches, copilot asks  Events of type copy, search, copilot_ask.
--   Zero-result  private.dashboard_zero_result_events (0016): the count
--                dashboard_kpis reports for that person.
--   Checklist    private.dashboard_checklist_completed — the op_checklist CTE
--                of 0016's dashboard_operator_activity, moved into a helper
--                that dashboard_operator_activity now calls too (Section 2), so
--                there is one definition.
--   Calls logged components/DailyTimeline.tsx sends call_count_log on every
--                change of a daily task's calls field, with meta.count the
--                field's whole current value — a string: "2", then "25" while
--                typing 25, "" once cleared. They are running values, not
--                increments, so a plain sum would count 27 for 25 calls. Per
--                (person, Tashkent day, entity_id) the latest event by (ts, id)
--                holds that task's value for the day, and those values are
--                summed. A value counts if it is a whole number 0-999999 (a
--                JSON number, or a string of 1-6 digits — the field holds 6
--                characters, lib/user-state/keys.ts); anything else, "" too,
--                counts 0. An event without entity_id is ignored.
--   Sections     page_leave events grouped by the first path segment, after
--                stripping a leading locale segment (/uz, /ru — the locales of
--                i18n/routing.ts). The clients strip /ru themselves
--                (lib/i18n/strip-locale.ts) and uz has no prefix, so this only
--                matters for older or raw paths. '/' and a bare locale are
--                'home'. The time is page time: idle is not subtracted per
--                section (idle events carry whatever raw path was open), so
--                the sections can add up to more than the person's active_ms.
--   Top content  The six view events keyed like 0016 (type, coalesce(entity_id,
--                path)), plus copy events whose entity_type is the matching
--                content type and whose entity_id is non-empty (CopyButton
--                sends them since R3/S02; older copies carry none and are not
--                attributed). Ranked by views + copies, then views, then first
--                seen (ts, id); entity_id/path come from the group's first-seen
--                row, as in dashboard_most_viewed.
--
-- Every public function is SECURITY INVOKER — the admin's own read policies on
-- telemetry_events and allowed_users still apply — and its first statement
-- refuses a non-admin with WT403 through private.is_admin(); bad arguments
-- raise WT400. Output columns are named so they never collide with a column of
-- the tables read (0016's rule: in plpgsql every RETURNS TABLE column is also a
-- variable), and every column reference in the bodies is qualified regardless.
--
-- INDEXES: none new. A person's reads of every event type are range scans of
-- telemetry_events_user_email_ts_idx (0013) — written so the index is chosen
-- even in a generic plan; reads of one or two event types (page time, idle
-- pairs, searches, checklist, calls) and the window-wide reads use 0016's
-- covering (type, ts) and (ts) indexes. See docs/PERF.md "People analytics
-- queries".
--
-- APPLY ORDER (see docs/MIGRATIONS.md): after 0020. Re-running it is safe.
-- Re-running 0016 after it is safe too: that restores 0016's inline copy of the
-- checklist logic in dashboard_operator_activity, which computes the same thing.

begin;

-- =============================================================================
-- Section 0 — preflight
-- =============================================================================

do $preflight$
declare
  missing text[] := '{}';
begin
  if to_regprocedure('private.is_admin()') is null then
    raise exception '0021: private.is_admin() is missing — apply 0020_roles_admin_manager.sql first (docs/MIGRATIONS.md).';
  end if;

  if to_regprocedure('private.dashboard_active_ms(timestamptz, timestamptz, text)') is null then
    missing := missing || 'private.dashboard_active_ms'::text;
  end if;
  if to_regprocedure('private.dashboard_zero_result_events(timestamptz, timestamptz, text)') is null then
    missing := missing || 'private.dashboard_zero_result_events'::text;
  end if;
  if to_regprocedure('public.dashboard_operator_activity(timestamptz, timestamptz, text)') is null then
    missing := missing || 'public.dashboard_operator_activity'::text;
  end if;
  if array_length(missing, 1) is not null then
    raise exception '0021: missing % — apply 0016_dashboard_rpc_and_retention.sql first (docs/MIGRATIONS.md).',
      array_to_string(missing, ', ');
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'allowed_users' and column_name = 'created_at'
  ) then
    raise exception '0021: public.allowed_users.created_at is missing — apply 0013 first.';
  end if;
end
$preflight$;

-- =============================================================================
-- Section 1 — argument checks and the tracked-email rule
-- =============================================================================
-- Private, called only by the public functions below (after their admin
-- check), so each limit is written once. They raise WT400 naming the calling
-- function; a message never contains an argument's value.

create or replace function private.people_check_window(
  p_fn text,
  p_from timestamptz,
  p_to timestamptz
)
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  -- MAX_RANGE_SPAN_DAYS + 1 in lib/dashboard/range.ts;
  -- tests/unit/admin/people.test.ts reads this line.
  max_span constant interval := interval '93 days';
begin
  if p_from is null or p_to is null or p_from >= p_to then
    raise exception '%: expected a window whose start is before its end', p_fn using errcode = 'WT400';
  end if;

  if p_to - p_from > max_span then
    raise exception '%: a window may span at most %', p_fn, max_span using errcode = 'WT400';
  end if;
end;
$$;

comment on function private.people_check_window(text, timestamptz, timestamptz) is
  'WT400 unless p_from < p_to and the window spans at most 93 days. Used by the 0021 people functions.';

create or replace function private.people_check_email(p_fn text, p_email text)
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  -- allowed_users stores lowercase only and the app parses with
  -- userEmailSchema (trim + lowercase), so anything else is a caller bug.
  if p_email is null or p_email = '' or p_email <> lower(p_email) or p_email <> btrim(p_email) then
    raise exception '%: p_email must be a non-empty, trimmed, lowercase email', p_fn using errcode = 'WT400';
  end if;
end;
$$;

comment on function private.people_check_email(text, text) is
  'WT400 unless p_email is non-empty, trimmed and lowercase. Used by the 0021 people functions.';

create or replace function private.people_check_limit(p_fn text, p_limit integer)
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  max_limit constant integer := 100;
begin
  if p_limit is null or p_limit < 1 or p_limit > max_limit then
    raise exception '%: p_limit must be 1-%', p_fn, max_limit using errcode = 'WT400';
  end if;
end;
$$;

comment on function private.people_check_limit(text, integer) is
  'WT400 unless 1 <= p_limit <= 100. Used by the 0021 people functions.';

-- The emails whose telemetry the people functions count (see "Tracked" above).
-- For an email: that email, unless its allow-list row is an admin's (then
-- none). For null: every allow-listed email that is not an admin's — the
-- overview's rows. Computed once per call into an array, never per row.
create or replace function private.people_tracked_emails(p_email text)
returns text[]
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when p_email is null then
      coalesce(
        (select array_agg(a.email order by a.email) from public.allowed_users a where a.role <> 'admin'),
        '{}'::text[]
      )
    when exists (select 1 from public.allowed_users a where a.email = p_email and a.role = 'admin') then
      '{}'::text[]
    else
      array[p_email]
  end
$$;

comment on function private.people_tracked_emails(text) is
  'Emails whose telemetry the 0021 people functions count: p_email unless it is an admin row (then none); for null, every non-admin allow-list email.';

-- =============================================================================
-- Section 2 — the checklist logic, one definition
-- =============================================================================
-- 0016's dashboard_operator_activity computed "completed checklist items"
-- inline (its op_checklist CTE). The people functions must report the same
-- number, so the logic moves, unchanged, into this helper and
-- dashboard_operator_activity is re-created below to call it. Only the scan
-- changed: the same rows, read so that a one-operator call uses the
-- (user_email, ts) index. dashboard_operator_activity's body is otherwise
-- 0016's, except that it asks private.is_admin() by that name
-- (private.is_manager() is its deprecated alias since 0020 — CLAUDE.md §7).

create or replace function private.dashboard_checklist_completed(
  p_from timestamptz,
  p_to timestamptz,
  p_operator text
)
returns table (operator_email text, completed bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select l.user_email, count(*) filter (where l.is_checked)
  from (
    -- Latest checklist_toggle per non-empty entity_id, latest by (ts, id).
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
    from (
      -- 0016 filtered with `(p_operator is null or user_email = p_operator)`,
      -- which the generic plan a SQL function body gets (Postgres ≤ 17) can
      -- only serve by walking the whole window. Two branches behind one-time
      -- filters instead — the same rows: every operator by (type, ts), or one
      -- operator's range of telemetry_events_user_email_ts_idx (the row
      -- comparison is explained in private.people_activity).
      select x.user_email, x.entity_id, x.meta, x.ts, x.id
      from public.telemetry_events x
      where p_operator is null
        and x.type = 'checklist_toggle'
        and x.ts >= p_from and x.ts < p_to
      union all
      select x.user_email, x.entity_id, x.meta, x.ts, x.id
      from public.telemetry_events x
      where p_operator is not null
        and x.user_email = p_operator
        and (x.user_email, x.ts) >= (p_operator, p_from)
        and (x.user_email, x.ts) < (p_operator, p_to)
        and x.type = 'checklist_toggle'
    ) e
    where e.entity_id is not null and e.entity_id <> ''
    order by e.user_email, e.entity_id, e.ts desc, e.id desc
  ) l
  group by l.user_email
$$;

comment on function private.dashboard_checklist_completed(timestamptz, timestamptz, text) is
  'Per-operator completed checklist items in [p_from, p_to): the latest checklist_toggle per entity_id, counted when JS !!meta.checked would be true. The one definition dashboard_operator_activity and the 0021 people functions use.';

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
  if not (select private.is_admin()) then
    raise exception 'dashboard_operator_activity: admin role required' using errcode = 'WT403';
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
    select c.operator_email, c.completed
    from private.dashboard_checklist_completed(p_from, p_to, v_operator) c
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
  left join op_checklist c on c.operator_email = f.user_email
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
  'One row per operator active in [p_from, p_to): active ms, copies, completed checklist items (private.dashboard_checklist_completed), top 5 viewed entities (jsonb). Admin only (WT403).';

-- =============================================================================
-- Section 3 — private helpers for the people functions
-- =============================================================================
-- Set-returning and called once per query, like 0016's helpers (a function
-- with `set search_path` is never inlined). No admin check of their own: only
-- the public functions below reach them, after theirs. They run as the caller,
-- so RLS on telemetry_events still applies inside them.
--
-- p_emails, not a nullable p_operator: 0016's `(p_operator is null or
-- user_email = p_operator)` can never be an index condition in the generic
-- plan a SQL function body gets. people_activity, which reads every event
-- type, splits one person from several (see there); the other scans read one
-- or two event types through 0016's covering (type, ts) index, which carries
-- user_email, so they are index-only either way.

-- The Tashkent days a window touches (see "Days" above).
create or replace function private.people_window_days(p_from timestamptz, p_to timestamptz)
returns table (activity_day date)
language sql
stable
security invoker
set search_path = ''
as $$
  select b.first_day + g.n
  from (
    select
      (p_from at time zone 'Asia/Tashkent')::date as first_day,
      -- The last instant inside [p_from, p_to): timestamptz resolution is 1 µs.
      ((p_to - interval '1 microsecond') at time zone 'Asia/Tashkent')::date as last_day
  ) b
  cross join lateral generate_series(0, b.last_day - b.first_day) as g(n)
$$;

comment on function private.people_window_days(timestamptz, timestamptz) is
  'Every Asia/Tashkent calendar day [p_from, p_to) touches.';

-- One scan of the window's events for the given emails, collapsed to (email,
-- day, session) and then grouped twice in one pass (GROUPING SETS): one row per
-- (email, Tashkent day with an event), and one total row per email with
-- activity_day NULL — the only rows where it is null, since ts is NOT NULL.
-- `sessions` and `active_days` are distinct counts, meaningful on the total row
-- (a day row has active_days 1 and that day's sessions). calls_logged comes
-- from a second, small scan of call_count_log events (see "Calls logged"
-- above). p_emails may hold one email (a person function) or many (the
-- overview); an admin's is never in it (private.people_tracked_emails).
create or replace function private.people_activity(
  p_from timestamptz,
  p_to timestamptz,
  p_emails text[]
)
returns table (
  member_email text,
  activity_day date,
  events bigint,
  active_days bigint,
  sessions bigint,
  content_views bigint,
  copies bigint,
  searches bigint,
  copilot_asks bigint,
  calls_logged bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with window_events as (
    -- Two branches behind one-time filters on cardinality(), so exactly one
    -- runs. Several people (the overview): the window itself. One person (the
    -- person functions): a range scan of telemetry_events_user_email_ts_idx,
    -- written so that even the generic plan a SQL function body gets (Postgres
    -- ≤ 17 plans it without parameter values) chooses it. There, a
    -- parameterized ts range is guessed at 0.5 % of the table, so the planner
    -- would walk the (ts) index across everyone's events — for 93 days that is
    -- ~10x slower, and every row a heap fetch, since session_id is in no
    -- covering index. As a row comparison on (user_email, ts) the range is
    -- something only the (user_email, ts) index can serve; with user_email
    -- fixed it means exactly p_from <= ts < p_to.
    select
      s.user_email,
      (s.ts at time zone 'Asia/Tashkent')::date as activity_day,
      s.type,
      s.session_id
    from (
      select e.user_email, e.ts, e.type, e.session_id
      from public.telemetry_events e
      where cardinality(p_emails) = 1
        and e.user_email = p_emails[1]
        and (e.user_email, e.ts) >= (p_emails[1], p_from)
        and (e.user_email, e.ts) < (p_emails[1], p_to)
      union all
      select e.user_email, e.ts, e.type, e.session_id
      from public.telemetry_events e
      where cardinality(p_emails) > 1
        and e.user_email = any (p_emails)
        and e.ts >= p_from and e.ts < p_to
    ) s
  ),
  per_session as (
    -- Collapsed to (email, day, session) first — a hash aggregate — so the
    -- two distinct counts below sort a few thousand rows, not every event of
    -- the window (a 93-day overview went from 1.2 s to 0.9 s, docs/PERF.md).
    select
      w.user_email,
      w.activity_day,
      w.session_id,
      count(*) as events,
      count(*) filter (
        where w.type in ('script_select', 'stage_view', 'objection_view', 'faq_view', 'competitor_view', 'package_view')
      ) as content_views,
      count(*) filter (where w.type = 'copy') as copies,
      count(*) filter (where w.type = 'search') as searches,
      count(*) filter (where w.type = 'copilot_ask') as copilot_asks
    from window_events w
    group by w.user_email, w.activity_day, w.session_id
  ),
  counted as (
    select
      p.user_email,
      p.activity_day,
      sum(p.events)::bigint as events,
      count(distinct p.activity_day) as active_days,
      count(distinct p.session_id) as sessions,
      sum(p.content_views)::bigint as content_views,
      sum(p.copies)::bigint as copies,
      sum(p.searches)::bigint as searches,
      sum(p.copilot_asks)::bigint as copilot_asks
    from per_session p
    group by grouping sets ((p.user_email, p.activity_day), (p.user_email))
  ),
  call_values as (
    select distinct on (c.user_email, c.activity_day, c.entity_id)
      c.user_email,
      c.activity_day,
      c.calls
    from (
      select
        e.user_email,
        (e.ts at time zone 'Asia/Tashkent')::date as activity_day,
        e.entity_id,
        e.ts,
        e.id,
        -- Nested CASEs, so a cast only ever sees a value its check accepted.
        case jsonb_typeof(e.meta -> 'count')
          when 'string' then
            case when (e.meta ->> 'count') ~ '^[0-9]{1,6}$' then (e.meta ->> 'count')::bigint else 0 end
          when 'number' then
            case
              when (e.meta ->> 'count')::numeric between 0 and 999999
                   and (e.meta ->> 'count')::numeric = trunc((e.meta ->> 'count')::numeric)
                then (e.meta ->> 'count')::numeric::bigint
              else 0
            end
          else 0
        end as calls
      from (
        -- The same two branches as window_events, for the same reason.
        select x.user_email, x.ts, x.id, x.entity_id, x.meta
        from public.telemetry_events x
        where cardinality(p_emails) = 1
          and x.user_email = p_emails[1]
          and (x.user_email, x.ts) >= (p_emails[1], p_from)
          and (x.user_email, x.ts) < (p_emails[1], p_to)
          and x.type = 'call_count_log'
        union all
        select x.user_email, x.ts, x.id, x.entity_id, x.meta
        from public.telemetry_events x
        where cardinality(p_emails) > 1
          and x.user_email = any (p_emails)
          and x.type = 'call_count_log'
          and x.ts >= p_from and x.ts < p_to
      ) e
      where e.entity_id is not null and e.entity_id <> ''
    ) c
    order by c.user_email, c.activity_day, c.entity_id, c.ts desc, c.id desc
  ),
  calls_per_day as (
    select v.user_email, v.activity_day, sum(v.calls) as calls
    from call_values v
    group by v.user_email, v.activity_day
  ),
  calls_per_member as (
    select d.user_email, sum(d.calls) as calls
    from calls_per_day d
    group by d.user_email
  )
  select
    k.user_email,
    k.activity_day,
    k.events,
    k.active_days,
    k.sessions,
    k.content_views,
    k.copies,
    k.searches,
    k.copilot_asks,
    coalesce(case when k.activity_day is null then m.calls else d.calls end, 0)::bigint
  from counted k
  -- Every call_count_log event is also one of the window's events, so each
  -- calls row finds its counted row. Two equality joins rather than one
  -- IS NOT DISTINCT FROM join, which could not be hashed.
  left join calls_per_day d
    on d.user_email = k.user_email and d.activity_day = k.activity_day
  left join calls_per_member m
    on m.user_email = k.user_email and k.activity_day is null
$$;

comment on function private.people_activity(timestamptz, timestamptz, text[]) is
  'Per (email, Tashkent day) and per email (activity_day null) in [p_from, p_to): events, active days, sessions, content views, copies, searches, copilot asks, calls logged. Only the given emails.';

-- Active ms per (email, Tashkent day): private.dashboard_active_ms's idle
-- pairing over the whole window, attributed to days (see "Active ms" above).
create or replace function private.people_daily_active_ms(
  p_from timestamptz,
  p_to timestamptz,
  p_emails text[]
)
returns table (member_email text, activity_day date, active_ms bigint)
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
      and e.user_email = any (p_emails)
      and e.ts >= p_from and e.ts < p_to
    window pairing as (partition by e.user_email, e.session_id order by e.ts, e.id)
  ),
  idle as (
    select
      i.user_email,
      (i.ts at time zone 'Asia/Tashkent')::date as activity_day,
      sum(floor(extract(epoch from i.ts) * 1000) - floor(extract(epoch from i.prev_ts) * 1000)) as ms
    from idle_edges i
    where i.type = 'idle_end' and i.prev_type = 'idle_start'
    group by i.user_email, (i.ts at time zone 'Asia/Tashkent')::date
  ),
  visible as (
    select
      e.user_email,
      (e.ts at time zone 'Asia/Tashkent')::date as activity_day,
      sum(coalesce(e.duration_ms, 0)) as ms
    from public.telemetry_events e
    where e.type = 'page_leave'
      and e.user_email = any (p_emails)
      and e.ts >= p_from and e.ts < p_to
    group by e.user_email, (e.ts at time zone 'Asia/Tashkent')::date
  )
  select
    coalesce(v.user_email, i.user_email),
    coalesce(v.activity_day, i.activity_day),
    greatest(0, coalesce(v.ms, 0) - coalesce(i.ms, 0))::bigint
  from visible v
  full join idle i on i.user_email = v.user_email and i.activity_day = v.activity_day
$$;

comment on function private.people_daily_active_ms(timestamptz, timestamptz, text[]) is
  'Active ms per (email, Asia/Tashkent day) in [p_from, p_to): page_leave time minus paired idle time (dashboard_active_ms pairing), clamped at 0 per day. Only the given emails.';

-- =============================================================================
-- Section 4 — the people functions (PostgREST: supabase.rpc(...))
-- =============================================================================

-- --- The directory: every allow-listed person ------------------------------------
create or replace function public.admin_people_overview(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  member_email text,
  member_full_name text,
  member_role text,
  member_is_active boolean,
  member_added_at timestamptz,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  active_ms bigint,
  active_days bigint,
  sessions bigint,
  content_views bigint,
  copies bigint,
  searches bigint,
  zero_result_searches bigint,
  copilot_asks bigint,
  calls_logged bigint,
  checklist_completed bigint,
  daily jsonb
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_emails text[];
begin
  if not (select private.is_admin()) then
    raise exception 'admin_people_overview: admin role required' using errcode = 'WT403';
  end if;

  perform private.people_check_window('admin_people_overview', p_from, p_to);

  v_emails := private.people_tracked_emails(null);

  return query
  with activity as (
    select
      x.member_email, x.activity_day, x.events, x.active_days, x.sessions, x.content_views,
      x.copies, x.searches, x.copilot_asks, x.calls_logged
    from private.people_activity(p_from, p_to, v_emails) x
  ),
  day_active as (
    select d.member_email, d.activity_day, d.active_ms
    from private.people_daily_active_ms(p_from, p_to, v_emails) d
  ),
  -- The three 0016 definitions are read for every email and joined to the
  -- allow-list below, where an admin row matches nothing.
  window_active as (
    select a.operator_email, a.active_ms
    from private.dashboard_active_ms(p_from, p_to, null) a
  ),
  zero_results as (
    -- The helper returns event ids, not emails: one primary-key probe per
    -- zero-result search (a small set) finds whose it was — LATERAL ... LIMIT
    -- 1, not a join along the primary key (see 0016's op_top).
    select t.user_email, count(*) as zero_count
    from private.dashboard_zero_result_events(p_from, p_to, null) z
    cross join lateral (
      select x.user_email
      from public.telemetry_events x
      where x.id = z.event_id
      limit 1
    ) t
    group by t.user_email
  ),
  checklist as (
    select c.operator_email, c.completed
    from private.dashboard_checklist_completed(p_from, p_to, null) c
  ),
  daily_series as (
    -- Allow-list x the window's days, so every row gets every day. An email
    -- missing from v_emails (an admin) finds no activity rows: zeros.
    select
      a.email,
      jsonb_agg(
        jsonb_build_object(
          'day', to_char(wd.activity_day, 'YYYY-MM-DD'),
          'active_ms', coalesce(da.active_ms, 0),
          'events', coalesce(ev.events, 0)
        )
        order by wd.activity_day
      ) as points
    from public.allowed_users a
    cross join private.people_window_days(p_from, p_to) wd
    left join activity ev on ev.member_email = a.email and ev.activity_day = wd.activity_day
    left join day_active da on da.member_email = a.email and da.activity_day = wd.activity_day
    group by a.email
  )
  select
    a.email,
    a.full_name,
    a.role,
    a.is_active,
    a.created_at,
    seen.first_ts,
    seen.last_ts,
    coalesce(wa.active_ms, 0)::bigint,
    coalesce(tot.active_days, 0)::bigint,
    coalesce(tot.sessions, 0)::bigint,
    coalesce(tot.content_views, 0)::bigint,
    coalesce(tot.copies, 0)::bigint,
    coalesce(tot.searches, 0)::bigint,
    coalesce(zr.zero_count, 0)::bigint,
    coalesce(tot.copilot_asks, 0)::bigint,
    coalesce(tot.calls_logged, 0)::bigint,
    coalesce(ck.completed, 0)::bigint,
    coalesce(ds.points, '[]'::jsonb)
  from public.allowed_users a
  left join activity tot on tot.member_email = a.email and tot.activity_day is null
  left join window_active wa on wa.operator_email = a.email and a.role <> 'admin'
  left join zero_results zr on zr.user_email = a.email and a.role <> 'admin'
  left join checklist ck on ck.operator_email = a.email and a.role <> 'admin'
  left join daily_series ds on ds.email = a.email
  -- Over all retained telemetry, not the window: one forward and one backward
  -- probe of telemetry_events_user_email_ts_idx per non-admin person (the
  -- pattern of 0017's admin_user_last_activity).
  left join lateral (
    select
      (select min(e.ts) from public.telemetry_events e where e.user_email = a.email) as first_ts,
      (select max(e.ts) from public.telemetry_events e where e.user_email = a.email) as last_ts
    where a.role <> 'admin'
  ) seen on true
  order by
    coalesce(tot.events, 0) > 0 desc,
    seen.last_ts desc nulls last,
    a.email;
end;
$$;

comment on function public.admin_people_overview(timestamptz, timestamptz) is
  'One row per allowed_users row (inactive and admin rows too), zero-filled: activity totals for [p_from, p_to), first/last seen over all retained telemetry, and a per-Tashkent-day jsonb series {day, active_ms, events}. Admin rows read zero. People active in the window first, by last seen, then email. Admin only (WT403).';

-- --- One person: totals, current vs previous window --------------------------------
create or replace function public.admin_person_summary(
  p_email text,
  p_from timestamptz,
  p_to timestamptz,
  p_prev_from timestamptz
)
returns table (
  active_ms bigint,
  active_ms_prev bigint,
  active_days bigint,
  active_days_prev bigint,
  sessions bigint,
  sessions_prev bigint,
  content_views bigint,
  content_views_prev bigint,
  copies bigint,
  copies_prev bigint,
  searches bigint,
  searches_prev bigint,
  zero_result_searches bigint,
  zero_result_searches_prev bigint,
  copilot_asks bigint,
  copilot_asks_prev bigint,
  calls_logged bigint,
  calls_logged_prev bigint,
  checklist_completed bigint,
  checklist_completed_prev bigint,
  first_seen_at timestamptz,
  last_seen_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_emails text[];
  v_tracked boolean;
begin
  if not (select private.is_admin()) then
    raise exception 'admin_person_summary: admin role required' using errcode = 'WT403';
  end if;

  perform private.people_check_email('admin_person_summary', p_email);
  perform private.people_check_window('admin_person_summary', p_from, p_to);
  -- The previous window ends where the current one starts.
  perform private.people_check_window('admin_person_summary', p_prev_from, p_from);

  v_emails := private.people_tracked_emails(p_email);
  v_tracked := cardinality(v_emails) > 0;

  -- The 0016 helpers take a single email; `where v_tracked` keeps an admin's
  -- rows out of them, as v_emails does for people_activity. A person with no
  -- events at all still gets one row: every value comes from a left join or an
  -- aggregate subquery of (select 1).
  return query
  select
    (select coalesce(sum(a.active_ms), 0)::bigint
       from private.dashboard_active_ms(p_from, p_to, p_email) a where v_tracked),
    (select coalesce(sum(a.active_ms), 0)::bigint
       from private.dashboard_active_ms(p_prev_from, p_from, p_email) a where v_tracked),
    coalesce(cur.active_days, 0)::bigint,
    coalesce(prev.active_days, 0)::bigint,
    coalesce(cur.sessions, 0)::bigint,
    coalesce(prev.sessions, 0)::bigint,
    coalesce(cur.content_views, 0)::bigint,
    coalesce(prev.content_views, 0)::bigint,
    coalesce(cur.copies, 0)::bigint,
    coalesce(prev.copies, 0)::bigint,
    coalesce(cur.searches, 0)::bigint,
    coalesce(prev.searches, 0)::bigint,
    (select count(*)
       from private.dashboard_zero_result_events(p_from, p_to, p_email) z where v_tracked),
    (select count(*)
       from private.dashboard_zero_result_events(p_prev_from, p_from, p_email) z where v_tracked),
    coalesce(cur.copilot_asks, 0)::bigint,
    coalesce(prev.copilot_asks, 0)::bigint,
    coalesce(cur.calls_logged, 0)::bigint,
    coalesce(prev.calls_logged, 0)::bigint,
    (select coalesce(sum(c.completed), 0)::bigint
       from private.dashboard_checklist_completed(p_from, p_to, p_email) c where v_tracked),
    (select coalesce(sum(c.completed), 0)::bigint
       from private.dashboard_checklist_completed(p_prev_from, p_from, p_email) c where v_tracked),
    (select min(e.ts) from public.telemetry_events e where v_tracked and e.user_email = p_email),
    (select max(e.ts) from public.telemetry_events e where v_tracked and e.user_email = p_email)
  from (select 1) as one_row
  left join private.people_activity(p_from, p_to, v_emails) cur on cur.activity_day is null
  left join private.people_activity(p_prev_from, p_from, v_emails) prev on prev.activity_day is null;
end;
$$;

comment on function public.admin_person_summary(text, timestamptz, timestamptz, timestamptz) is
  'One row for one person: the admin_people_overview totals for [p_from, p_to) and, as *_prev, for [p_prev_from, p_from); first/last seen over all retained telemetry. An unknown email, or an admin''s, is a zero row. Admin only (WT403).';

-- --- One person: per-day series ------------------------------------------------------
create or replace function public.admin_person_daily(
  p_email text,
  p_from timestamptz,
  p_to timestamptz
)
returns table (day date, active_ms bigint, events bigint, content_views bigint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_emails text[];
begin
  if not (select private.is_admin()) then
    raise exception 'admin_person_daily: admin role required' using errcode = 'WT403';
  end if;

  perform private.people_check_email('admin_person_daily', p_email);
  perform private.people_check_window('admin_person_daily', p_from, p_to);

  v_emails := private.people_tracked_emails(p_email);

  return query
  select
    wd.activity_day,
    coalesce(da.active_ms, 0)::bigint,
    coalesce(ev.events, 0)::bigint,
    coalesce(ev.content_views, 0)::bigint
  from private.people_window_days(p_from, p_to) wd
  left join private.people_activity(p_from, p_to, v_emails) ev on ev.activity_day = wd.activity_day
  left join private.people_daily_active_ms(p_from, p_to, v_emails) da on da.activity_day = wd.activity_day
  order by wd.activity_day;
end;
$$;

comment on function public.admin_person_daily(text, timestamptz, timestamptz) is
  'One row per Asia/Tashkent day of [p_from, p_to), zero-filled, for one person: active ms (per-day clamp), events, content views. Admin only (WT403).';

-- --- One person: time per app section ------------------------------------------------
create or replace function public.admin_person_sections(
  p_email text,
  p_from timestamptz,
  p_to timestamptz
)
returns table (section text, active_ms bigint, visits bigint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_tracked boolean;
begin
  if not (select private.is_admin()) then
    raise exception 'admin_person_sections: admin role required' using errcode = 'WT403';
  end if;

  perform private.people_check_email('admin_person_sections', p_email);
  perform private.people_check_window('admin_person_sections', p_from, p_to);

  v_tracked := cardinality(private.people_tracked_emails(p_email)) > 0;

  -- One person's range of telemetry_events_user_email_ts_idx, as a row
  -- comparison for the reason given in private.people_activity: plpgsql may
  -- switch to a generic plan after five calls.
  return query
  select s.page_section, sum(coalesce(s.duration_ms, 0))::bigint, count(*)
  from (
    select
      e.duration_ms,
      coalesce(
        nullif(
          split_part(
            -- '/ru/faq' -> '/faq', '/ru' -> '' ; '/ruxsat' is left alone.
            case when e.path ~ '^/(uz|ru)(/|$)' then substr(e.path, 4) else e.path end,
            '/', 2
          ),
          ''
        ),
        'home'
      ) as page_section
    from public.telemetry_events e
    where v_tracked
      and e.user_email = p_email
      and (e.user_email, e.ts) >= (p_email, p_from)
      and (e.user_email, e.ts) < (p_email, p_to)
      and e.type = 'page_leave'
  ) s
  group by s.page_section
  order by 2 desc, 3 desc, s.page_section collate "C";
end;
$$;

comment on function public.admin_person_sections(text, timestamptz, timestamptz) is
  'Page time (page_leave duration, idle not subtracted) and visits per first path segment for one person in [p_from, p_to); a leading /uz or /ru is stripped, ''/'' is ''home''. Largest first. Admin only (WT403).';

-- --- One person: newest events ---------------------------------------------------------
create or replace function public.admin_person_recent_events(
  p_email text,
  p_limit integer default 30
)
returns table (
  event_ts timestamptz,
  event_type text,
  event_path text,
  event_entity_type text,
  event_entity_id text,
  event_meta jsonb
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_tracked boolean;
begin
  if not (select private.is_admin()) then
    raise exception 'admin_person_recent_events: admin role required' using errcode = 'WT403';
  end if;

  perform private.people_check_email('admin_person_recent_events', p_email);
  perform private.people_check_limit('admin_person_recent_events', p_limit);

  v_tracked := cardinality(private.people_tracked_emails(p_email)) > 0;

  -- A backward walk of telemetry_events_user_email_ts_idx that stops after
  -- p_limit kept rows (checked in a generic plan too: `order by ts ... limit`
  -- for one user_email already favours that index); the (ts, id) tie-break is
  -- an incremental sort on top.
  return query
  select e.ts, e.type, e.path, e.entity_type, e.entity_id, e.meta
  from public.telemetry_events e
  where v_tracked
    and e.user_email = p_email
    and e.type not in ('web_vital', 'idle_start', 'idle_end', 'page_leave')
  order by e.ts desc, e.id desc
  limit p_limit;
end;
$$;

comment on function public.admin_person_recent_events(text, integer) is
  'One person''s newest telemetry events (all retained, newest first, at most p_limit 1-100), without web_vital, idle_start, idle_end and page_leave. Admin only (WT403).';

-- --- Content usage across operators and sales managers ---------------------------------
create or replace function public.admin_top_content(
  p_from timestamptz,
  p_to timestamptz,
  p_limit integer default 10
)
returns table (
  view_type text,
  view_entity_id text,
  view_path text,
  views bigint,
  copies bigint,
  people bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_admins text[];
begin
  if not (select private.is_admin()) then
    raise exception 'admin_top_content: admin role required' using errcode = 'WT403';
  end if;

  perform private.people_check_window('admin_top_content', p_from, p_to);
  perform private.people_check_limit('admin_top_content', p_limit);

  select coalesce(array_agg(a.email), '{}'::text[]) into v_admins
  from public.allowed_users a
  where a.role = 'admin';

  return query
  with used as (
    select
      e.id,
      e.ts,
      e.user_email,
      e.type = 'copy' as is_copy,
      -- A copy is filed under the view event of its content type, so it lands
      -- in the same group as that item's views.
      case e.type
        when 'copy' then
          case e.entity_type
            when 'script' then 'script_select'
            when 'stage' then 'stage_view'
            when 'objection' then 'objection_view'
            when 'faq' then 'faq_view'
            when 'competitor' then 'competitor_view'
            when 'package' then 'package_view'
          end
        else e.type
      end as item_type,
      case when e.type = 'copy' then e.entity_id else coalesce(e.entity_id, e.path) end as item_key
    from public.telemetry_events e
    where e.ts >= p_from and e.ts < p_to
      and (
        e.type in ('script_select', 'stage_view', 'objection_view', 'faq_view', 'competitor_view', 'package_view')
        or (
          e.type = 'copy'
          and e.entity_type in ('script', 'stage', 'objection', 'faq', 'competitor', 'package')
          and e.entity_id is not null and e.entity_id <> ''
        )
      )
      and e.user_email <> all (v_admins)
  ),
  ranked as (
    select
      u.item_type,
      count(*) filter (where not u.is_copy) as view_count,
      count(*) filter (where u.is_copy) as copy_count,
      count(distinct u.user_email) as people_count,
      min(array[extract(epoch from u.ts), u.id::numeric]) as first_seen
    from used u
    group by u.item_type, u.item_key
    order by count(*) desc, count(*) filter (where not u.is_copy) desc, min(array[extract(epoch from u.ts), u.id::numeric])
    limit p_limit
  )
  select r.item_type, t.entity_id, t.path, r.view_count, r.copy_count, r.people_count
  from ranked r
  -- One primary-key probe per listed group (see op_top in
  -- dashboard_operator_activity for why this is not a plain join).
  cross join lateral (
    select x.entity_id, x.path
    from public.telemetry_events x
    where x.id = (r.first_seen[2])::bigint
    limit 1
  ) t
  order by r.view_count + r.copy_count desc, r.view_count desc, r.first_seen;
end;
$$;

comment on function public.admin_top_content(timestamptz, timestamptz, integer) is
  'Most used content items in [p_from, p_to) across everyone but admins: views of the six view events plus copies attributed by entity_type/entity_id, distinct people, ranked by views + copies (at most p_limit 1-100); entity_id/path from the first-seen row. Admin only (WT403).';

-- =============================================================================
-- Section 5 — grants
-- =============================================================================
-- `create function` grants EXECUTE to PUBLIC, and Supabase's default privileges
-- grant it to anon, authenticated and service_role directly — revoke all of
-- those, then grant the one role an admin's session uses. An operator or a
-- sales manager is also `authenticated`: the is_admin() check at the top of
-- each public body refuses them, and the private helpers are unreachable over
-- PostgREST (the schema is not exposed) and read nothing past RLS.

revoke all on function
  private.people_check_window(text, timestamptz, timestamptz),
  private.people_check_email(text, text),
  private.people_check_limit(text, integer),
  private.people_tracked_emails(text),
  private.dashboard_checklist_completed(timestamptz, timestamptz, text),
  private.people_window_days(timestamptz, timestamptz),
  private.people_activity(timestamptz, timestamptz, text[]),
  private.people_daily_active_ms(timestamptz, timestamptz, text[]),
  public.dashboard_operator_activity(timestamptz, timestamptz, text),
  public.admin_people_overview(timestamptz, timestamptz),
  public.admin_person_summary(text, timestamptz, timestamptz, timestamptz),
  public.admin_person_daily(text, timestamptz, timestamptz),
  public.admin_person_sections(text, timestamptz, timestamptz),
  public.admin_person_recent_events(text, integer),
  public.admin_top_content(timestamptz, timestamptz, integer)
  from public, anon, service_role;

grant execute on function
  private.people_check_window(text, timestamptz, timestamptz),
  private.people_check_email(text, text),
  private.people_check_limit(text, integer),
  private.people_tracked_emails(text),
  private.dashboard_checklist_completed(timestamptz, timestamptz, text),
  private.people_window_days(timestamptz, timestamptz),
  private.people_activity(timestamptz, timestamptz, text[]),
  private.people_daily_active_ms(timestamptz, timestamptz, text[]),
  public.dashboard_operator_activity(timestamptz, timestamptz, text),
  public.admin_people_overview(timestamptz, timestamptz),
  public.admin_person_summary(text, timestamptz, timestamptz, timestamptz),
  public.admin_person_daily(text, timestamptz, timestamptz),
  public.admin_person_sections(text, timestamptz, timestamptz),
  public.admin_person_recent_events(text, integer),
  public.admin_top_content(timestamptz, timestamptz, integer)
  to authenticated;

-- PostgREST picks up new functions from its schema cache; Supabase reloads it
-- on DDL, and this makes sure of it.
notify pgrst, 'reload schema';

commit;
