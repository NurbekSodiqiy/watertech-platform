-- Dashboard parity — run against the STAGING project only (see docs/TESTING.md).
--
-- Paste the whole file into the Supabase SQL editor and run it once, after
-- 0016_dashboard_rpc_and_retention.sql. It inserts a fixed set of
-- telemetry_events (emails `parity-*@test`, all in March 2001, so no real
-- event can fall inside the windows), calls every dashboard function as a
-- manager for all operators and for one operator, and compares each result to
-- the hand-computed expected table below. Then it checks that an operator and
-- a token without a role claim are refused by the functions themselves, and
-- that only `authenticated` holds EXECUTE on them.
-- Everything runs in one transaction that ends in ROLLBACK, and a failed
-- assertion aborts it — either way no fixture row is ever committed.
--
--   Passed: the last result is a single row "Dashboard parity checks passed".
--   Failed: an error whose message starts with "PARITY FAIL:".
--
-- ONE EXPECTED TABLE FOR BOTH SIDES. The JSON document between the two
-- `$parity$` markers is the fixture AND the expected results.
-- tests/unit/dashboard/parity.test.ts reads this very file, runs the TS
-- reference aggregators (lib/telemetry/aggregate.ts, lib/dashboard/kpi.ts,
-- lib/dashboard/quality.ts) over the same events, and asserts that the
-- expected rows below, mapped through lib/dashboard/telemetry-rpc.ts, equal
-- what they produce. Change an expectation here and both suites see it.
--
-- Shape: "events" are telemetry_events rows in insertion order (so ids ascend
-- in that order — ties on ts are broken by id); "windows" are the UTC bounds
-- lib/dashboard/range.ts derives from "range" (Tashkent dates); "expected"
-- holds each function's rows as PostgREST returns them, per scope ("all" =
-- no operator filter, "operator" = the "operator" email). hourly is the 24
-- event_count values in hour order; last_seen_at is written as JS
-- toISOString() would.
--
-- What the fixture exercises, beyond plain counts: events exactly on each
-- window boundary; idle pairs that restart, dangle and interleave across two
-- sessions; an operator whose idle time exceeds their visible time (clamped to
-- 0); two operators tied on active time (ordered by first event, not email);
-- checklist toggles whose `checked` is a string, 0, {}, "" or missing, and two
-- toggles of one item in the same millisecond; zero-result queries that differ
-- only by case, surrounding spaces or a trailing NBSP, one in Cyrillic, a blank
-- one, and a resultCount of "0" (a string, not counted); web vitals with an
-- empty name or a string value (not counted) and an even and odd sample
-- count; top-5 cut-off with ties; a view with no entity_id (keyed and labelled
-- by path).

begin;

select set_config('dashboard_parity.doc', $parity$
{
  "range": { "from": "2001-03-10", "to": "2001-03-11" },
  "windows": {
    "from": "2001-03-09T19:00:00.000Z",
    "to": "2001-03-11T19:00:00.000Z",
    "prevFrom": "2001-03-07T19:00:00.000Z"
  },
  "operator": "parity-a@test",
  "checklistTotal": 8,
  "events": [
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-09T19:00:00.000Z", "type": "page_enter", "path": "/" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T04:00:00.000Z", "type": "page_enter", "path": "/sales-process/scripts" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T04:05:00.000Z", "type": "stage_view", "path": "/sales-process/scripts", "entity_type": "stage", "entity_id": "st-1" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T04:06:00.000Z", "type": "stage_view", "path": "/sales-process/scripts", "entity_type": "stage", "entity_id": "st-1" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T04:07:00.000Z", "type": "objection_view", "path": "/sales-process/objections", "entity_type": "objection", "entity_id": "obj-qimmat" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T04:08:00.000Z", "type": "objection_view", "path": "/sales-process/objections", "entity_type": "objection", "entity_id": "obj-qimmat" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T04:09:00.000Z", "type": "faq_view", "path": "/faq", "entity_type": "faq", "entity_id": "Narxi qancha?" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T04:10:00.000Z", "type": "competitor_view", "path": "/sales-process/battle-cards/comp-x", "entity_type": "competitor", "entity_id": "comp-x" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T04:11:00.000Z", "type": "package_view", "path": "/products", "entity_type": "package", "entity_id": "pkg-1" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T04:12:00.000Z", "type": "script_select", "path": "/sales-process/scripts", "entity_type": "script", "entity_id": "lead-orqali-tushgan" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T04:13:00.000Z", "type": "stage_view", "path": "/sales-process/scripts/x" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T04:14:00.000Z", "type": "copy", "path": "/sales-process/scripts" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T04:15:00.000Z", "type": "copy", "path": "/sales-process/scripts" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T05:00:00.000Z", "type": "idle_start", "path": "/" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T05:00:20.000Z", "type": "idle_end", "path": "/" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T05:10:00.000Z", "type": "idle_start", "path": "/" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T05:10:05.000Z", "type": "idle_start", "path": "/" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T05:10:35.000Z", "type": "idle_end", "path": "/" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T05:11:00.000Z", "type": "idle_end", "path": "/" },
    { "user_email": "parity-a@test", "session_id": "parity-a2", "ts": "2001-03-10T05:20:00.000Z", "type": "idle_start", "path": "/faq" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T05:20:10.000Z", "type": "idle_start", "path": "/" },
    { "user_email": "parity-a@test", "session_id": "parity-a2", "ts": "2001-03-10T05:20:40.000Z", "type": "idle_end", "path": "/faq" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T05:21:00.000Z", "type": "idle_end", "path": "/" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T05:30:00.000Z", "type": "page_leave", "path": "/sales-process/scripts", "duration_ms": 300000 },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T06:00:00.000Z", "type": "idle_start", "path": "/" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T06:30:00.000Z", "type": "page_leave", "path": "/faq" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T07:00:00.000Z", "type": "checklist_toggle", "path": "/company/onboarding", "entity_id": "item-1", "meta": { "checked": true } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T07:01:00.000Z", "type": "checklist_toggle", "path": "/company/onboarding", "entity_id": "item-1", "meta": { "checked": false } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T07:02:00.000Z", "type": "checklist_toggle", "path": "/company/onboarding", "entity_id": "item-2", "meta": { "checked": "yes" } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T07:03:00.000Z", "type": "checklist_toggle", "path": "/company/onboarding", "entity_id": "item-3", "meta": { "checked": 0 } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T07:04:00.000Z", "type": "checklist_toggle", "path": "/company/onboarding", "entity_id": "item-4", "meta": { "checked": {} } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T07:05:00.000Z", "type": "checklist_toggle", "path": "/company/onboarding", "entity_id": "", "meta": { "checked": true } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T07:06:00.000Z", "type": "checklist_toggle", "path": "/company/onboarding", "meta": { "checked": true } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T07:07:00.000Z", "type": "checklist_toggle", "path": "/company/onboarding", "entity_id": "item-5" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T07:08:00.000Z", "type": "checklist_toggle", "path": "/company/onboarding", "entity_id": "item-6", "meta": { "checked": false } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T07:08:00.000Z", "type": "checklist_toggle", "path": "/company/onboarding", "entity_id": "item-6", "meta": { "checked": true } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T07:09:00.000Z", "type": "checklist_toggle", "path": "/company/onboarding", "entity_id": "item-7", "meta": { "checked": "" } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T08:00:00.000Z", "type": "search", "path": "/", "meta": { "query": "  Kafolat  ", "resultCount": 0 } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T08:01:00.000Z", "type": "search", "path": "/", "meta": { "query": "kafolat", "resultCount": 0 } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T08:02:00.000Z", "type": "search", "path": "/", "meta": { "query": "KAFOLAT ", "resultCount": 0 } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T08:03:00.000Z", "type": "search", "path": "/", "meta": { "query": "narx", "resultCount": 3 } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T08:04:00.000Z", "type": "search", "path": "/", "meta": { "query": "   ", "resultCount": 0 } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T08:05:00.000Z", "type": "search", "path": "/", "meta": { "query": "", "resultCount": 0 } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T08:06:00.000Z", "type": "search", "path": "/", "meta": { "query": "ТРУБА", "resultCount": 0 } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T08:07:00.000Z", "type": "search", "path": "/", "meta": { "query": "x", "resultCount": "0" } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T08:08:00.000Z", "type": "search", "path": "/" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T09:00:00.000Z", "type": "feedback", "path": "/faq", "meta": { "helpful": false } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T09:01:00.000Z", "type": "feedback", "path": "/faq", "meta": { "helpful": true } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T09:02:00.000Z", "type": "feedback", "path": "/products", "meta": { "helpful": "false" } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T10:00:00.000Z", "type": "web_vital", "path": "/", "meta": { "name": "LCP", "value": 1200, "rating": "good" } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T10:01:00.000Z", "type": "web_vital", "path": "/", "meta": { "name": "LCP", "value": 2400, "rating": "needs-improvement" } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T10:02:00.000Z", "type": "web_vital", "path": "/", "meta": { "name": "LCP", "value": 1800, "rating": "good" } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T10:03:00.000Z", "type": "web_vital", "path": "/", "meta": { "name": "LCP", "value": 3000, "rating": "needs-improvement" } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T10:04:00.000Z", "type": "web_vital", "path": "/", "meta": { "name": "CLS", "value": 0.05, "rating": "good" } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T10:05:00.000Z", "type": "web_vital", "path": "/", "meta": { "name": "", "value": 5 } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-10T10:06:00.000Z", "type": "web_vital", "path": "/", "meta": { "name": "INP", "value": "200" } },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-11T10:00:00.000Z", "type": "page_leave", "path": "/products", "duration_ms": 200000 },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-11T18:59:59.999Z", "type": "copy", "path": "/products" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-11T19:00:00.000Z", "type": "page_enter", "path": "/" },
    { "user_email": "parity-b@test", "session_id": "parity-b1", "ts": "2001-03-10T04:30:00.000Z", "type": "page_enter", "path": "/" },
    { "user_email": "parity-b@test", "session_id": "parity-b1", "ts": "2001-03-10T04:31:00.000Z", "type": "stage_view", "path": "/sales-process/scripts", "entity_type": "stage", "entity_id": "st-1" },
    { "user_email": "parity-b@test", "session_id": "parity-b1", "ts": "2001-03-10T04:32:00.000Z", "type": "objection_view", "path": "/sales-process/objections", "entity_type": "objection", "entity_id": "obj-qimmat" },
    { "user_email": "parity-b@test", "session_id": "parity-b1", "ts": "2001-03-10T04:33:00.000Z", "type": "objection_view", "path": "/sales-process/objections", "entity_type": "objection", "entity_id": "obj-qimmat" },
    { "user_email": "parity-b@test", "session_id": "parity-b1", "ts": "2001-03-10T04:34:00.000Z", "type": "objection_view", "path": "/sales-process/objections", "entity_type": "objection", "entity_id": "obj-unknown" },
    { "user_email": "parity-b@test", "session_id": "parity-b1", "ts": "2001-03-10T04:35:00.000Z", "type": "idle_start", "path": "/sales-process/objections" },
    { "user_email": "parity-b@test", "session_id": "parity-b1", "ts": "2001-03-10T04:37:00.000Z", "type": "idle_end", "path": "/sales-process/objections" },
    { "user_email": "parity-b@test", "session_id": "parity-b1", "ts": "2001-03-10T04:38:00.000Z", "type": "search", "path": "/", "meta": { "query": "Труба", "resultCount": 0 } },
    { "user_email": "parity-b@test", "session_id": "parity-b1", "ts": "2001-03-10T04:39:00.000Z", "type": "feedback", "path": "/products", "meta": { "helpful": false } },
    { "user_email": "parity-b@test", "session_id": "parity-b1", "ts": "2001-03-10T04:40:00.000Z", "type": "page_leave", "path": "/sales-process/objections", "duration_ms": 100000 },
    { "user_email": "parity-b@test", "session_id": "parity-b1", "ts": "2001-03-10T04:41:00.000Z", "type": "feedback", "path": "/products", "meta": { "helpful": false } },
    { "user_email": "parity-b@test", "session_id": "parity-b1", "ts": "2001-03-10T11:00:00.000Z", "type": "search", "path": "/", "meta": { "query": "sertifikat", "resultCount": 0 } },
    { "user_email": "parity-b@test", "session_id": "parity-b1", "ts": "2001-03-10T11:01:00.000Z", "type": "search", "path": "/", "meta": { "query": "Sertifikat", "resultCount": 0 } },
    { "user_email": "parity-b@test", "session_id": "parity-b1", "ts": "2001-03-10T12:00:00.000Z", "type": "feedback", "path": "/company", "meta": { "helpful": false } },
    { "user_email": "parity-d@test", "session_id": "parity-d1", "ts": "2001-03-10T04:20:00.000Z", "type": "web_vital", "path": "/", "meta": { "name": "LCP", "value": 2000, "rating": "good" } },
    { "user_email": "parity-c@test", "session_id": "parity-c1", "ts": "2001-03-07T19:00:00.000Z", "type": "page_enter", "path": "/" },
    { "user_email": "parity-c@test", "session_id": "parity-c1", "ts": "2001-03-07T18:59:59.999Z", "type": "page_enter", "path": "/" },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-08T05:10:00.000Z", "type": "page_leave", "path": "/", "duration_ms": 90000 },
    { "user_email": "parity-c@test", "session_id": "parity-c1", "ts": "2001-03-08T05:20:00.000Z", "type": "page_leave", "path": "/", "duration_ms": 30000 },
    { "user_email": "parity-a@test", "session_id": "parity-a1", "ts": "2001-03-08T06:00:00.000Z", "type": "search", "path": "/", "meta": { "query": "kafolat", "resultCount": 0 } },
    { "user_email": "parity-c@test", "session_id": "parity-c1", "ts": "2001-03-09T18:59:59.999Z", "type": "search", "path": "/", "meta": { "query": "x", "resultCount": 0 } }
  ],
  "expected": {
    "all": {
      "kpis": {
        "active_operators": 2, "active_operators_prev": 1,
        "active_ms": 360000, "active_ms_prev": 120000,
        "zero_result_searches": 7, "zero_result_searches_prev": 2
      },
      "operator_activity": [
        {
          "operator_email": "parity-a@test", "active_ms": 360000, "copy_count": 3, "checklist_completed": 3,
          "top_viewed": [
            { "view_type": "stage_view", "entity_id": "st-1", "path": "/sales-process/scripts", "view_count": 2 },
            { "view_type": "objection_view", "entity_id": "obj-qimmat", "path": "/sales-process/objections", "view_count": 2 },
            { "view_type": "faq_view", "entity_id": "Narxi qancha?", "path": "/faq", "view_count": 1 },
            { "view_type": "competitor_view", "entity_id": "comp-x", "path": "/sales-process/battle-cards/comp-x", "view_count": 1 },
            { "view_type": "package_view", "entity_id": "pkg-1", "path": "/products", "view_count": 1 }
          ]
        },
        { "operator_email": "parity-d@test", "active_ms": 0, "copy_count": 0, "checklist_completed": 0, "top_viewed": [] },
        {
          "operator_email": "parity-b@test", "active_ms": 0, "copy_count": 0, "checklist_completed": 0,
          "top_viewed": [
            { "view_type": "objection_view", "entity_id": "obj-qimmat", "path": "/sales-process/objections", "view_count": 2 },
            { "view_type": "stage_view", "entity_id": "st-1", "path": "/sales-process/scripts", "view_count": 1 },
            { "view_type": "objection_view", "entity_id": "obj-unknown", "path": "/sales-process/objections", "view_count": 1 }
          ]
        }
      ],
      "hourly": [1, 0, 0, 0, 0, 0, 0, 0, 0, 24, 11, 2, 11, 9, 3, 8, 2, 1, 0, 0, 0, 0, 0, 1],
      "zero_result_searches": [
        { "search_query": "kafolat", "search_count": 3, "last_seen_at": "2001-03-10T08:02:00.000Z" },
        { "search_query": "труба", "search_count": 2, "last_seen_at": "2001-03-10T08:06:00.000Z" },
        { "search_query": "sertifikat", "search_count": 2, "last_seen_at": "2001-03-10T11:01:00.000Z" }
      ],
      "web_vitals": [
        { "metric_name": "CLS", "p50": 0.05, "p75": 0.05, "samples": 1 },
        { "metric_name": "LCP", "p50": 2000, "p75": 2400, "samples": 5 }
      ],
      "not_helpful": [
        { "page_path": "/products", "feedback_count": 2 },
        { "page_path": "/faq", "feedback_count": 1 },
        { "page_path": "/company", "feedback_count": 1 }
      ],
      "most_viewed": [
        { "view_type": "objection_view", "view_entity_id": "obj-qimmat", "view_path": "/sales-process/objections", "view_count": 4 },
        { "view_type": "stage_view", "view_entity_id": "st-1", "view_path": "/sales-process/scripts", "view_count": 3 },
        { "view_type": "faq_view", "view_entity_id": "Narxi qancha?", "view_path": "/faq", "view_count": 1 },
        { "view_type": "stage_view", "view_entity_id": null, "view_path": "/sales-process/scripts/x", "view_count": 1 },
        { "view_type": "objection_view", "view_entity_id": "obj-unknown", "view_path": "/sales-process/objections", "view_count": 1 }
      ]
    },
    "operator": {
      "kpis": {
        "active_operators": 1, "active_operators_prev": 0,
        "active_ms": 360000, "active_ms_prev": 90000,
        "zero_result_searches": 4, "zero_result_searches_prev": 1
      },
      "operator_activity": [
        {
          "operator_email": "parity-a@test", "active_ms": 360000, "copy_count": 3, "checklist_completed": 3,
          "top_viewed": [
            { "view_type": "stage_view", "entity_id": "st-1", "path": "/sales-process/scripts", "view_count": 2 },
            { "view_type": "objection_view", "entity_id": "obj-qimmat", "path": "/sales-process/objections", "view_count": 2 },
            { "view_type": "faq_view", "entity_id": "Narxi qancha?", "path": "/faq", "view_count": 1 },
            { "view_type": "competitor_view", "entity_id": "comp-x", "path": "/sales-process/battle-cards/comp-x", "view_count": 1 },
            { "view_type": "package_view", "entity_id": "pkg-1", "path": "/products", "view_count": 1 }
          ]
        }
      ],
      "hourly": [1, 0, 0, 0, 0, 0, 0, 0, 0, 12, 11, 2, 11, 9, 3, 8, 0, 0, 0, 0, 0, 0, 0, 1],
      "zero_result_searches": [
        { "search_query": "kafolat", "search_count": 3, "last_seen_at": "2001-03-10T08:02:00.000Z" },
        { "search_query": "труба", "search_count": 1, "last_seen_at": "2001-03-10T08:06:00.000Z" }
      ],
      "web_vitals": [
        { "metric_name": "CLS", "p50": 0.05, "p75": 0.05, "samples": 1 },
        { "metric_name": "LCP", "p50": 2400, "p75": 3000, "samples": 4 }
      ],
      "not_helpful": [
        { "page_path": "/faq", "feedback_count": 1 }
      ],
      "most_viewed": [
        { "view_type": "stage_view", "view_entity_id": "st-1", "view_path": "/sales-process/scripts", "view_count": 2 },
        { "view_type": "objection_view", "view_entity_id": "obj-qimmat", "view_path": "/sales-process/objections", "view_count": 2 },
        { "view_type": "faq_view", "view_entity_id": "Narxi qancha?", "view_path": "/faq", "view_count": 1 },
        { "view_type": "stage_view", "view_entity_id": null, "view_path": "/sales-process/scripts/x", "view_count": 1 }
      ]
    }
  }
}
$parity$, true);

-- === Fixtures (inserted as the editor's own role, before any role switch) =====
-- `order by n` keeps the document's order, so ids ascend with it.

insert into public.telemetry_events (user_email, session_id, ts, type, path, entity_type, entity_id, duration_ms, meta)
select
  f.ev ->> 'user_email',
  f.ev ->> 'session_id',
  (f.ev ->> 'ts')::timestamptz,
  f.ev ->> 'type',
  f.ev ->> 'path',
  f.ev ->> 'entity_type',
  f.ev ->> 'entity_id',
  (f.ev ->> 'duration_ms')::integer,
  nullif(f.ev -> 'meta', 'null'::jsonb)
from jsonb_array_elements(current_setting('dashboard_parity.doc')::jsonb -> 'events') with ordinality as f(ev, n)
order by f.n;

-- === As a manager: every function against the expected table ===================

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-0000000000d1","role":"authenticated","email":"parity-manager@test","app_metadata":{"role":"manager"}}';

do $$
declare
  doc constant jsonb := current_setting('dashboard_parity.doc')::jsonb;
  w_from constant timestamptz := (doc -> 'windows' ->> 'from')::timestamptz;
  w_to constant timestamptz := (doc -> 'windows' ->> 'to')::timestamptz;
  w_prev constant timestamptz := (doc -> 'windows' ->> 'prevFrom')::timestamptz;
  scope record;
  fn text;
  actual jsonb;
  expected jsonb;
begin
  if current_user <> 'authenticated' or not private.is_manager() then
    raise exception 'PARITY FAIL: setup — expected authenticated/manager, got %/% (is 0014 applied?)',
      current_user, private.app_role();
  end if;

  for scope in
    select * from (values ('all', null::text), ('operator', doc ->> 'operator')) as t(name, operator)
  loop
    for fn in select jsonb_object_keys(doc -> 'expected' -> scope.name) loop
      expected := doc -> 'expected' -> scope.name -> fn;
      -- An expected key with no branch here yields null and fails below, so a
      -- typo in the document cannot pass silently.
      actual := case fn
        when 'kpis' then (
          select to_jsonb(r) from public.dashboard_kpis(w_from, w_to, w_prev, scope.operator) r)
        when 'operator_activity' then (
          select coalesce(jsonb_agg(to_jsonb(r) - 'ordinality' order by r.ordinality), '[]'::jsonb)
          from public.dashboard_operator_activity(w_from, w_to, scope.operator) with ordinality r)
        when 'hourly' then (
          select jsonb_agg(r.event_count order by r.ordinality)
          from public.dashboard_hourly(w_from, w_to, scope.operator) with ordinality r)
        when 'zero_result_searches' then (
          select coalesce(jsonb_agg(jsonb_build_object(
            'search_query', r.search_query,
            'search_count', r.search_count,
            'last_seen_at', to_char(r.last_seen_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
          ) order by r.ordinality), '[]'::jsonb)
          from public.dashboard_zero_result_searches(w_from, w_to, scope.operator, 100) with ordinality r)
        when 'web_vitals' then (
          select coalesce(jsonb_agg(to_jsonb(r) - 'ordinality' order by r.ordinality), '[]'::jsonb)
          from public.dashboard_web_vitals(w_from, w_to, scope.operator) with ordinality r)
        when 'not_helpful' then (
          select coalesce(jsonb_agg(to_jsonb(r) - 'ordinality' order by r.ordinality), '[]'::jsonb)
          from public.dashboard_not_helpful(w_from, w_to, scope.operator, 100) with ordinality r)
        when 'most_viewed' then (
          select coalesce(jsonb_agg(to_jsonb(r) - 'ordinality' order by r.ordinality), '[]'::jsonb)
          from public.dashboard_most_viewed(w_from, w_to, scope.operator, 10) with ordinality r)
      end;

      if actual is distinct from expected then
        raise exception 'PARITY FAIL: % (scope %): expected %, got %',
          fn, scope.name, expected, coalesce(actual::text, '<no branch or no row>');
      end if;
    end loop;
  end loop;

  -- The hourly rows are the 24 Tashkent hours in order, not just 24 numbers.
  if (select array_agg(r.hour_of_day order by r.ordinality)
      from public.dashboard_hourly(w_from, w_to) with ordinality r)
     is distinct from (select array_agg(h) from generate_series(0, 23) h) then
    raise exception 'PARITY FAIL: dashboard_hourly does not return hours 0-23 in order';
  end if;

  -- '' means "every operator", exactly like a missing ?op= (filterRows).
  if (select to_jsonb(r) from public.dashboard_kpis(w_from, w_to, w_prev, '') r)
     is distinct from doc -> 'expected' -> 'all' -> 'kpis' then
    raise exception 'PARITY FAIL: dashboard_kpis treats p_operator = '''' differently from null';
  end if;

  -- p_limit cuts the ranked list without reordering it.
  if (select jsonb_agg(r.search_query order by r.ordinality)
      from public.dashboard_zero_result_searches(w_from, w_to, null, 2) with ordinality r)
     is distinct from '["kafolat", "труба"]'::jsonb then
    raise exception 'PARITY FAIL: dashboard_zero_result_searches(p_limit => 2) is not the first two rows';
  end if;

  -- Bad arguments are refused, not answered with an empty result.
  begin
    perform public.dashboard_kpis(w_to, w_from, w_prev);
    raise exception 'PARITY FAIL: dashboard_kpis accepted p_from > p_to';
  exception when sqlstate 'WT400' then null;
  end;
  begin
    perform public.dashboard_most_viewed(w_from, w_to, null, 0);
    raise exception 'PARITY FAIL: dashboard_most_viewed accepted p_limit = 0';
  exception when sqlstate 'WT400' then null;
  end;
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
        '{"sub":"00000000-0000-4000-8000-0000000000d2","role":"authenticated","email":"parity-a@test","app_metadata":{"role":"operator"}}'),
      ('a token without a role claim',
        '{"sub":"00000000-0000-4000-8000-0000000000d3","role":"authenticated","email":"parity-x@test"}')
    ) as t(label, claims)
  loop
    perform set_config('request.jwt.claims', ident.claims, true);

    for call in
      select * from (values
        ('dashboard_kpis',                 'select * from public.dashboard_kpis(now() - interval ''1 day'', now(), now() - interval ''2 days'')'),
        ('dashboard_operator_activity',    'select * from public.dashboard_operator_activity(now() - interval ''1 day'', now())'),
        ('dashboard_hourly',               'select * from public.dashboard_hourly(now() - interval ''1 day'', now())'),
        ('dashboard_zero_result_searches', 'select * from public.dashboard_zero_result_searches(now() - interval ''1 day'', now())'),
        ('dashboard_web_vitals',           'select * from public.dashboard_web_vitals(now() - interval ''1 day'', now())'),
        ('dashboard_not_helpful',          'select * from public.dashboard_not_helpful(now() - interval ''1 day'', now())'),
        ('dashboard_most_viewed',          'select * from public.dashboard_most_viewed(now() - interval ''1 day'', now())')
      ) as t(fn, sql)
    loop
      begin
        execute call.sql;
        raise exception 'PARITY FAIL: % can call public.%()', ident.label, call.fn;
      exception when others then
        if sqlstate <> 'WT403' then
          raise exception 'PARITY FAIL: % calling public.%() got % (%), expected WT403',
            ident.label, call.fn, sqlstate, sqlerrm;
        end if;
      end;
    end loop;
  end loop;
end $$;

-- The grants themselves. Calling as anon would not prove this: anon has no
-- USAGE on `private`, so the is_manager() call fails with 42501 even where
-- EXECUTE was wrongly left in place. Only `authenticated` may execute the
-- dashboard functions and their helpers; Supabase's default privileges grant
-- anon and service_role EXECUTE on every new function, which 0016 revokes.

do $$
declare
  fn text;
  grantee text;
begin
  foreach fn in array array[
    'public.dashboard_kpis(timestamptz, timestamptz, timestamptz, text)',
    'public.dashboard_operator_activity(timestamptz, timestamptz, text)',
    'public.dashboard_hourly(timestamptz, timestamptz, text)',
    'public.dashboard_zero_result_searches(timestamptz, timestamptz, text, integer)',
    'public.dashboard_web_vitals(timestamptz, timestamptz, text)',
    'public.dashboard_not_helpful(timestamptz, timestamptz, text, integer)',
    'public.dashboard_most_viewed(timestamptz, timestamptz, text, integer)',
    'private.dashboard_active_ms(timestamptz, timestamptz, text)',
    'private.dashboard_zero_result_events(timestamptz, timestamptz, text)'
  ] loop
    if not has_function_privilege('authenticated', fn, 'execute') then
      raise exception 'PARITY FAIL: authenticated cannot execute % (missing GRANT)', fn;
    end if;
    foreach grantee in array array['anon', 'service_role'] loop
      if has_function_privilege(grantee, fn, 'execute') then
        raise exception 'PARITY FAIL: % can execute %', grantee, fn;
      end if;
    end loop;
  end loop;
end $$;

rollback;

select 'Dashboard parity checks passed' as result;
