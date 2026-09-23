-- Audit-2 / S13 — copilot_logs becomes readable: KPIs and "what could the
-- copilot not answer".
--
-- app/api/copilot/route.ts has written one copilot_logs row per request since
-- 0006 (status ok / no_hits / error / rate_limited, the question, the ids it
-- retrieved, latency) and nothing read them. A `no_hits` question is the
-- strongest signal this product produces for missing content: an operator asked
-- something and the knowledge base had nothing. These two functions are what
-- /dashboard/copilot renders.
--
--   public.copilot_stats(p_from, p_to)
--       one row: request counts per status, the no_hits and error rates, and
--       p50 / p95 latency.
--   public.copilot_unanswered(p_from, p_to, p_limit)
--       no_hits questions grouped by a normalized form of the question text:
--       how often it was asked, by how many distinct operators, and when last.
--
-- WINDOWS  [p_from, p_to), timestamptz, compared on copilot_logs.ts — the same
--          half-open convention as the 0016 dashboard functions
--          (lib/dashboard/range.ts turns a Tashkent date range into the bounds).
--
-- RATES    A rate_limited row is a request the copilot refused before it looked
--          at anything (its question is null): it says nothing about content or
--          about the model. Both rates therefore divide by the requests that
--          were actually handled — total minus rate_limited — and are NULL when
--          there were none. Stored as a fraction in [0, 1], rounded to 4
--          places; the UI turns it into a percentage.
--
-- LATENCY  Over status ok and no_hits rows that carry latency_ms: the requests
--          that answered. An error's latency is a timeout or an early failure,
--          and folding it in would move p95 for reasons unrelated to how long
--          an answer takes. Interpolated percentiles (percentile_cont), rounded
--          to whole milliseconds; NULL when there is no such row. (The
--          web-vitals function of 0016 uses nearest-rank because its TS
--          reference does; there is no TS reference here.)
--
-- PRIVACY  copilot_unanswered never returns an email — only the number of
--          distinct operators behind a question. Question text is visible to
--          managers only and stays out of telemetry (lib/telemetry/schema.ts).
--          run_retention() (0016) nulls the question after 30 days, so a range
--          reaching further back counts those requests in copilot_stats but
--          cannot list them here: a redacted question is excluded from
--          copilot_unanswered, never grouped under an empty key.
--
-- NORMALIZED FORM  private.copilot_normalize_question() mirrors
-- normalizeSearchText() in lib/search/normalize.ts, step for step:
--   1. lowercase                       2. Uzbek Cyrillic -> Latin, letter by letter
--   3. strip the apostrophe glyphs ' ’ ‘ ` ʻ ʼ     4. collapse whitespace runs to
--   one space and trim
-- so "Нарх қанча?" and "narx qancha?" land in one group. What the SQL cannot
-- reproduce exactly, or does on purpose differently:
--   * Lowercasing. JS toLowerCase is the Unicode default mapping; the SQL uses
--     ICU's root locale when the und-x-icu collation exists (same choice as
--     private.dashboard_zero_result_events in 0016), which agrees with it —
--     "İ" and final sigma included — and otherwise falls back to the database
--     default collation, which differs only on those edge cases.
--   * Whitespace. Written as an explicit set (ECMAScript WhiteSpace +
--     LineTerminator, the set JS \s and trim() use) rather than [[:space:]],
--     whose meaning for non-ASCII characters depends on the collation.
--   * The transliteration table is a copy of CYRILLIC_TO_LATIN by value. It has
--     no shared source, so supabase/tests/copilot-checks.sql keeps a corpus of
--     questions with their expected key, and tests/unit/dashboard/copilot-normalize.test.ts
--     runs the same corpus through normalizeSearchText — a change to either
--     side that is not made to the other fails one of the two.
--   * An empty result (a question of only punctuation or spaces) is dropped
--     from copilot_unanswered instead of becoming a group named "".
-- The key is only for grouping. What a manager reads and pre-fills a FAQ from is
-- sample_question: the most recent question of the group, as it was typed.
--
-- Both public functions are SECURITY INVOKER, so copilot_logs_manager_select
-- (0014) still decides which rows they can read; each also starts with
-- private.is_manager() and raises WT403 for anyone else, and WT400 for a bad
-- argument (the codes of 0015 / 0016).
--
-- APPLY ORDER (see docs/MIGRATIONS.md): after 0018 (needs 0014 and 0006).
-- Re-running it is safe.

begin;

-- =============================================================================
-- Section 0 — preflight
-- =============================================================================

do $preflight$
begin
  if to_regprocedure('private.is_manager()') is null then
    raise exception '0019: private.is_manager() is missing — apply 0014_role_gated_rls.sql first.';
  end if;

  if to_regclass('public.copilot_logs') is null then
    raise exception '0019: public.copilot_logs is missing — apply 0006_copilot_logs.sql first.';
  end if;
end
$preflight$;

-- =============================================================================
-- Section 1 — private.copilot_normalize_question()
-- =============================================================================
-- Created through EXECUTE because the collation is chosen at migration time
-- (see "Lowercasing" above). It is STABLE, not IMMUTABLE: a collation's rules
-- can change with an ICU upgrade.

do $normalize$
declare
  lower_collation constant text := case
    when exists (select 1 from pg_catalog.pg_collation where collname = 'und-x-icu')
      then 'pg_catalog."und-x-icu"'
    else 'pg_catalog."default"'
  end;
begin
  execute format($ddl$
    create or replace function private.copilot_normalize_question(p_question text)
    returns text
    language sql
    stable
    strict
    security invoker
    set search_path = ''
    as $fn$
      select btrim(
        pg_catalog.regexp_replace(
          pg_catalog.regexp_replace(
            -- 1:1 letters by translate(); ъ and ь have no counterpart, so they
            -- are dropped. ў -> o' and ғ -> g' in normalize.ts lose their
            -- apostrophe one step later, so they map straight to o and g.
            pg_catalog.translate(
              -- The multi-letter mappings first: none of these letters is in
              -- the translate() set below.
              pg_catalog.replace(pg_catalog.replace(pg_catalog.replace(pg_catalog.replace(
              pg_catalog.replace(pg_catalog.replace(pg_catalog.replace(
                pg_catalog.lower(p_question collate %s),
                'ё', 'yo'), 'ц', 'ts'), 'ч', 'ch'), 'ш', 'sh'),
                'щ', 'sh'), 'ю', 'yu'), 'я', 'ya'),
              'абвгдезийклмнопрстуфхыэжқғўҳъь',
              'abvgdeziyklmnoprstufxiejqgoh'
            ),
            '[''’‘`ʻʼ]', '', 'g'
          ),
          -- ECMAScript WhiteSpace + LineTerminator: TAB, LF, VT, FF, CR, SPACE,
          -- NBSP, U+1680, U+2000-U+200A, LS, PS, U+202F, U+205F, U+3000, BOM.
          '[\t\n\v\f\r    -     　﻿]+',
          ' ', 'g'
        ),
        ' '
      )
    $fn$
  $ddl$, lower_collation);

  if lower_collation = 'pg_catalog."default"' then
    raise notice '0019: collation und-x-icu not found — copilot question keys are lowercased with the database default collation.';
  end if;
end
$normalize$;

comment on function private.copilot_normalize_question(text) is
  'Grouping key of a copilot question: lowercase, Uzbek Cyrillic -> Latin, apostrophes stripped, whitespace collapsed and trimmed. Mirrors normalizeSearchText in lib/search/normalize.ts (differences are listed in 0019).';

revoke all on function private.copilot_normalize_question(text) from public, anon, service_role;
grant execute on function private.copilot_normalize_question(text) to authenticated;

-- =============================================================================
-- Section 2 — public.copilot_stats()
-- =============================================================================

create or replace function public.copilot_stats(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  total_count bigint,
  ok_count bigint,
  no_hits_count bigint,
  error_count bigint,
  rate_limited_count bigint,
  no_hits_rate numeric,
  error_rate numeric,
  p50_latency_ms numeric,
  p95_latency_ms numeric
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_manager()) then
    raise exception 'copilot_stats: manager role required' using errcode = 'WT403';
  end if;

  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'copilot_stats: expected p_from <= p_to' using errcode = 'WT400';
  end if;

  return query
  select
    count(*),
    count(*) filter (where l.status = 'ok'),
    count(*) filter (where l.status = 'no_hits'),
    count(*) filter (where l.status = 'error'),
    count(*) filter (where l.status = 'rate_limited'),
    round(
      count(*) filter (where l.status = 'no_hits')::numeric
        / nullif(count(*) filter (where l.status <> 'rate_limited'), 0),
      4
    ),
    round(
      count(*) filter (where l.status = 'error')::numeric
        / nullif(count(*) filter (where l.status <> 'rate_limited'), 0),
      4
    ),
    round(
      (percentile_cont(0.5) within group (order by l.latency_ms)
         filter (where l.status in ('ok', 'no_hits') and l.latency_ms is not null))::numeric,
      0
    ),
    round(
      (percentile_cont(0.95) within group (order by l.latency_ms)
         filter (where l.status in ('ok', 'no_hits') and l.latency_ms is not null))::numeric,
      0
    )
  from public.copilot_logs l
  where l.ts >= p_from and l.ts < p_to;
end;
$$;

comment on function public.copilot_stats(timestamptz, timestamptz) is
  'Copilot request counts per status, no_hits / error rate (of handled requests, i.e. excluding rate_limited) and p50 / p95 latency of answered requests in [p_from, p_to). Manager only (WT403).';

-- =============================================================================
-- Section 3 — public.copilot_unanswered()
-- =============================================================================

create or replace function public.copilot_unanswered(
  p_from timestamptz,
  p_to timestamptz,
  p_limit integer default 100
)
returns table (
  question_key text,
  sample_question text,
  ask_count bigint,
  operator_count bigint,
  last_asked_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_manager()) then
    raise exception 'copilot_unanswered: manager role required' using errcode = 'WT403';
  end if;

  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'copilot_unanswered: expected p_from <= p_to' using errcode = 'WT400';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 1000 then
    raise exception 'copilot_unanswered: p_limit must be 1-1000' using errcode = 'WT400';
  end if;

  return query
  with asked as (
    select
      l.id,
      l.ts,
      l.email,
      l.question,
      private.copilot_normalize_question(l.question) as normalized
    from public.copilot_logs l
    where l.status = 'no_hits'
      and l.question is not null
      and l.ts >= p_from and l.ts < p_to
  )
  select
    a.normalized,
    -- The most recent wording, as typed: what the FAQ form is pre-filled with.
    (array_agg(a.question order by a.ts desc, a.id desc))[1],
    count(*),
    count(distinct a.email),
    max(a.ts)
  from asked a
  where a.normalized <> ''
  group by a.normalized
  order by count(*) desc, max(a.ts) desc, a.normalized collate "C"
  limit p_limit;
end;
$$;

comment on function public.copilot_unanswered(timestamptz, timestamptz, integer) is
  'no_hits copilot questions in [p_from, p_to) grouped by normalized text: most recent wording, times asked, distinct operators (never emails) and last asked. Redacted (null) questions are not listed. Manager only (WT403).';

-- `create function` grants EXECUTE to PUBLIC, and Supabase's default privileges
-- grant it to anon, authenticated and service_role directly — revoke all of
-- those, then grant the one role a manager's session uses. An operator is also
-- `authenticated`: the is_manager() check at the top of each body refuses them.
revoke all on function
  public.copilot_stats(timestamptz, timestamptz),
  public.copilot_unanswered(timestamptz, timestamptz, integer)
  from public, anon, service_role;

grant execute on function
  public.copilot_stats(timestamptz, timestamptz),
  public.copilot_unanswered(timestamptz, timestamptz, integer)
  to authenticated;

notify pgrst, 'reload schema';

commit;
