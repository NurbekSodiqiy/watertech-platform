-- Copilot statistics — run against the STAGING project only (see
-- docs/TESTING.md), after 0019_copilot_stats.sql.
--
-- Paste the whole file into the Supabase SQL editor and run it once. It
-- inserts a fixed set of copilot_logs rows (marker `copilot-check` in `model`,
-- all in March 2001, so no real request falls inside the window), calls
-- copilot_stats() and copilot_unanswered() as a manager and compares each result
-- to the hand-computed expectation below. Then it checks that an operator and a
-- token without a role claim are refused by the functions themselves (WT403),
-- that bad arguments answer WT400, that no email leaves copilot_unanswered, and
-- that only `authenticated` may execute the functions.
-- Everything runs in one transaction that ends in ROLLBACK, and a failed
-- assertion aborts it — either way no fixture row is ever committed.
--
--   Passed: the last result is a single row "Copilot checks passed".
--   Failed: an error whose message starts with "COPILOT FAIL:".
--
-- THE NORMALIZATION CORPUS is shared with the unit suite:
-- tests/unit/dashboard/copilot-normalize.test.ts reads the JSON between the two
-- `$corpus$` markers and asserts that normalizeSearchText() (lib/search/normalize.ts)
-- produces every expected key, while this file asserts that
-- private.copilot_normalize_question() does. A drift on either side fails one
-- of the two. Non-ASCII whitespace is written as \uXXXX so it survives editors.

begin;

select set_config('copilot_checks.corpus', $corpus$
[
    { "question": "Narx qancha?", "key": "narx qancha?" },
    { "question": "  NARX   qancha?  ", "key": "narx qancha?" },
    { "question": "Нарх қанча?", "key": "narx qancha?" },
    { "question": "So'z", "key": "soz" },
    { "question": "so\u2018z", "key": "soz" },
    { "question": "so\u2019z", "key": "soz" },
    { "question": "so\u02bbz", "key": "soz" },
    { "question": "so`z", "key": "soz" },
    { "question": "so\u02bcz", "key": "soz" },
    { "question": "Ёлка цена щётка", "key": "yolka tsena shyotka" },
    { "question": "Ўзбек ғишт ҳақида", "key": "ozbek gisht haqida" },
    { "question": "a\u00a0b\u2003c\tb\nd", "key": "a b c b d" },
    { "question": "\ufeffnarx\u3000", "key": "narx" },
    { "question": "   ", "key": "" },
    { "question": "?!", "key": "?!" },
    { "question": "\u0130stanbul", "key": "i\u0307stanbul" },
    { "question": "ΟΔΟΣ", "key": "οδος" },
    { "question": "Что такое ПНД труба?", "key": "chto takoe pnd truba?" },
    { "question": "Ъезд ь", "key": "ezd" },
    { "question": "O'zbekcha   JAVOB", "key": "ozbekcha javob" },
    { "question": "Пластик труба 25мм нархи", "key": "plastik truba 25mm narxi" },
    { "question": "ЖУДА қиммат", "key": "juda qimmat" }
]
$corpus$, true);

-- === Fixtures (as the editor's own role) =====================================
-- Window under test: [2001-03-10T00:00Z, 2001-03-11T00:00Z).
--   ok           4 rows, latency 1000 / 2000 / 3000 / 4000
--   no_hits      5 rows in the window (one exactly on p_from), latency
--                500 / 600 (question redacted) / 700 / 800 / 900
--   error        1 row (60000 ms — must not move the percentiles)
--   rate_limited 1 row (no latency)
-- plus one no_hits row exactly on p_to and one a second before p_from, which
-- the half-open window excludes.

insert into public.copilot_logs (ts, email, question, latency_ms, model, status) values
  ('2001-03-10T01:00:00Z', 'copilot-a@test', 'Narx qancha?',        1000,  'copilot-check', 'ok'),
  ('2001-03-10T01:05:00Z', 'copilot-a@test', 'Kafolat qancha?',     2000,  'copilot-check', 'ok'),
  ('2001-03-10T01:10:00Z', 'copilot-b@test', 'Yetkazib berish',     3000,  'copilot-check', 'ok'),
  ('2001-03-10T01:15:00Z', 'copilot-b@test', 'Montaj narxi',        4000,  'copilot-check', 'ok'),
  ('2001-03-10T02:00:00Z', 'copilot-a@test', 'Narx  QANCHA?',       500,   'copilot-check', 'no_hits'),
  ('2001-03-10T03:00:00Z', 'copilot-b@test', 'Нарх қанча?',         700,   'copilot-check', 'no_hits'),
  ('2001-03-10T04:00:00Z', 'copilot-a@test', 'Mahsulot kafolati',   900,   'copilot-check', 'no_hits'),
  ('2001-03-10T05:00:00Z', 'copilot-a@test', null,                  600,   'copilot-check', 'no_hits'),
  ('2001-03-10T00:00:00Z', 'copilot-c@test', 'Boundary in',         800,   'copilot-check', 'no_hits'),
  ('2001-03-10T06:00:00Z', 'copilot-a@test', 'Something broke',    60000,  'copilot-check', 'error'),
  ('2001-03-10T07:00:00Z', 'copilot-a@test', null,                  null,  'copilot-check', 'rate_limited'),
  ('2001-03-11T00:00:00Z', 'copilot-c@test', 'Boundary out',        800,   'copilot-check', 'no_hits'),
  ('2001-03-09T23:59:59Z', 'copilot-c@test', 'Too early',           800,   'copilot-check', 'no_hits');

-- === The normalized form, as the editor's own role ===========================

do $$
declare
  pair jsonb;
begin
  for pair in select value from jsonb_array_elements(current_setting('copilot_checks.corpus')::jsonb) loop
    if private.copilot_normalize_question(pair ->> 'question') is distinct from pair ->> 'key' then
      raise exception 'COPILOT FAIL: normalize(%) = %, expected %',
        pair ->> 'question', private.copilot_normalize_question(pair ->> 'question'), pair ->> 'key';
    end if;
  end loop;

  if private.copilot_normalize_question(null) is not null then
    raise exception 'COPILOT FAIL: normalize(null) is not null';
  end if;
end $$;

-- === Results, as a manager ====================================================

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000e1","role":"authenticated","email":"copilot-manager@test","app_metadata":{"role":"manager"}}';

do $$
declare
  s record;
  u jsonb;
  window_from constant timestamptz := '2001-03-10T00:00:00Z';
  window_to constant timestamptz := '2001-03-11T00:00:00Z';
begin
  select * into strict s from public.copilot_stats(window_from, window_to);

  if (s.total_count, s.ok_count, s.no_hits_count, s.error_count, s.rate_limited_count)
       is distinct from (11::bigint, 4::bigint, 5::bigint, 1::bigint, 1::bigint) then
    raise exception 'COPILOT FAIL: stats counts = %, expected (11,4,5,1,1)', s;
  end if;

  -- 5 / 10 and 1 / 10: the rate_limited request is not a handled one.
  if s.no_hits_rate is distinct from 0.5 or s.error_rate is distinct from 0.1 then
    raise exception 'COPILOT FAIL: rates = (%, %), expected (0.5, 0.1)', s.no_hits_rate, s.error_rate;
  end if;

  -- 500 600 700 800 900 1000 2000 3000 4000: median 900; p95 sits 0.6 of the
  -- way from 3000 to 4000. The 60 s error is not a sample.
  if s.p50_latency_ms is distinct from 900 or s.p95_latency_ms is distinct from 3600 then
    raise exception 'COPILOT FAIL: latency = (%, %), expected (900, 3600)', s.p50_latency_ms, s.p95_latency_ms;
  end if;

  -- An empty window answers zeros and NULL rates / latencies, not no row.
  select * into strict s from public.copilot_stats('2001-04-01T00:00:00Z', '2001-04-02T00:00:00Z');
  if s.total_count <> 0 or s.no_hits_rate is not null or s.error_rate is not null
     or s.p50_latency_ms is not null or s.p95_latency_ms is not null then
    raise exception 'COPILOT FAIL: empty window = %', s;
  end if;

  -- Only the two spellings of "narx qancha?" share a group; the redacted
  -- question is not listed; ties on count fall to the most recent ask.
  select coalesce(jsonb_agg(to_jsonb(r) order by r.rn), '[]') into u
  from (
    -- last_asked_at as UTC wall-clock time, so the comparison does not depend on
    -- the session time zone.
    select row_number() over () as rn, q.question_key, q.sample_question, q.ask_count, q.operator_count,
           q.last_asked_at at time zone 'UTC' as last_asked_at
    from public.copilot_unanswered(window_from, window_to) q
  ) r;

  if u <> '[
    {"rn":1,"question_key":"narx qancha?","sample_question":"Нарх қанча?","ask_count":2,"operator_count":2,"last_asked_at":"2001-03-10T03:00:00"},
    {"rn":2,"question_key":"mahsulot kafolati","sample_question":"Mahsulot kafolati","ask_count":1,"operator_count":1,"last_asked_at":"2001-03-10T04:00:00"},
    {"rn":3,"question_key":"boundary in","sample_question":"Boundary in","ask_count":1,"operator_count":1,"last_asked_at":"2001-03-10T00:00:00"}
  ]'::jsonb then
    raise exception 'COPILOT FAIL: unanswered = %', u;
  end if;

  if (select count(*) from public.copilot_unanswered(window_from, window_to, 1)) <> 1 then
    raise exception 'COPILOT FAIL: p_limit = 1 did not cut the list';
  end if;

  -- The one group listed by a limit of 1 is the top one.
  if (select q.question_key from public.copilot_unanswered(window_from, window_to, 1) q) <> 'narx qancha?' then
    raise exception 'COPILOT FAIL: p_limit = 1 kept the wrong group';
  end if;

  if exists (select 1 from public.copilot_unanswered('2001-04-01T00:00:00Z', '2001-04-02T00:00:00Z')) then
    raise exception 'COPILOT FAIL: empty window listed questions';
  end if;
end $$;

-- === Bad arguments ==========================================================

do $$
declare
  call record;
begin
  for call in
    select * from (values
      ('copilot_stats from > to',       'select * from public.copilot_stats(now(), now() - interval ''1 day'')'),
      ('copilot_stats null from',       'select * from public.copilot_stats(null, now())'),
      ('copilot_unanswered from > to',  'select * from public.copilot_unanswered(now(), now() - interval ''1 day'')'),
      ('copilot_unanswered limit 0',    'select * from public.copilot_unanswered(now() - interval ''1 day'', now(), 0)'),
      ('copilot_unanswered limit 1001', 'select * from public.copilot_unanswered(now() - interval ''1 day'', now(), 1001)'),
      ('copilot_unanswered null limit', 'select * from public.copilot_unanswered(now() - interval ''1 day'', now(), null)')
    ) as t(label, sql)
  loop
    begin
      execute call.sql;
      raise exception 'COPILOT FAIL: % was accepted', call.label;
    exception when others then
      if sqlstate <> 'WT400' then
        raise exception 'COPILOT FAIL: % answered % (%), expected WT400', call.label, sqlstate, sqlerrm;
      end if;
    end;
  end loop;
end $$;

-- === Everyone else is refused =================================================
-- An operator and a claim-less token hold EXECUTE (they are `authenticated`) and
-- must be stopped by the is_manager() check inside the function (WT403) — not
-- merely answered with zeros because RLS hid the rows.

do $$
declare
  ident record;
  call record;
begin
  for ident in
    select * from (values
      ('an operator',
        '{"sub":"00000000-0000-4000-8000-0000000000e2","role":"authenticated","email":"copilot-a@test","app_metadata":{"role":"operator"}}'),
      ('a token without a role claim',
        '{"sub":"00000000-0000-4000-8000-0000000000e3","role":"authenticated","email":"copilot-x@test"}')
    ) as t(label, claims)
  loop
    perform set_config('request.jwt.claims', ident.claims, true);

    for call in
      select * from (values
        ('copilot_stats',      'select * from public.copilot_stats(now() - interval ''1 day'', now())'),
        ('copilot_unanswered', 'select * from public.copilot_unanswered(now() - interval ''1 day'', now())')
      ) as t(fn, sql)
    loop
      begin
        execute call.sql;
        raise exception 'COPILOT FAIL: % can call public.%()', ident.label, call.fn;
      exception when others then
        if sqlstate <> 'WT403' then
          raise exception 'COPILOT FAIL: % calling public.%() got % (%), expected WT403',
            ident.label, call.fn, sqlstate, sqlerrm;
        end if;
      end;
    end loop;
  end loop;
end $$;

reset role;

-- === Shape and grants ============================================================
-- No column of either result may carry an operator's email, and only
-- `authenticated` may execute the functions and the normalizer (Supabase's
-- default privileges grant anon and service_role EXECUTE on every new function,
-- which 0019 revokes).

do $$
declare
  fn text;
  grantee text;
begin
  if exists (
    select 1
    from pg_catalog.pg_proc p
    cross join lateral unnest(p.proargnames) as arg(name)
    where p.oid in (
      'public.copilot_stats(timestamptz, timestamptz)'::regprocedure,
      'public.copilot_unanswered(timestamptz, timestamptz, integer)'::regprocedure
    )
    and arg.name ilike '%email%'
  ) then
    raise exception 'COPILOT FAIL: a copilot function returns an email column';
  end if;

  foreach fn in array array[
    'public.copilot_stats(timestamptz, timestamptz)',
    'public.copilot_unanswered(timestamptz, timestamptz, integer)',
    'private.copilot_normalize_question(text)'
  ] loop
    if not has_function_privilege('authenticated', fn, 'execute') then
      raise exception 'COPILOT FAIL: authenticated cannot execute % (missing GRANT)', fn;
    end if;
    foreach grantee in array array['anon', 'service_role'] loop
      if has_function_privilege(grantee, fn, 'execute') then
        raise exception 'COPILOT FAIL: % can execute %', grantee, fn;
      end if;
    end loop;
  end loop;
end $$;

rollback;

select 'Copilot checks passed' as result;
