# Migrations

Every schema change in this project is a numbered file in `supabase/migrations/`. There is no migration
runner: the Supabase CLI is not available on the dev machines here (`SUPABASE_PROJECT_ID` is unset, see
`scripts/gen-types.sh`), so each file is pasted into the **Supabase Dashboard → SQL Editor** and run by
hand, in order, as the `postgres` role. That role owns the tables in `public`, which matters for
`0013` — its `snapshot_content_version()` is `SECURITY DEFINER`.

Never edit a file that has already been run anywhere. Corrections go into the next number.

## Apply order

| # | File | What it does | Depends on |
| --- | --- | --- | --- |
| 0001 | `custom_access_token_hook.sql` | `app_metadata.role` claim from `allowed_users` | `allowed_users` (0013) |
| 0002 | `content_tables.sql` | 7 content tables, `content_versions`, update triggers, RLS | — |
| 0003 | `content_tables_grants.sql` | `GRANT`s for 0002 (RLS alone grants nothing) | 0002 |
| 0004 | `content_ru_columns.sql` | `*_ru` columns for the Russian locale | 0002 |
| 0005 | `dashboard_policies.sql` | manager reads `allowed_users` (operator filter) | `allowed_users` (0013) |
| 0006 | `copilot_logs.sql` | copilot request log | — |
| 0007 | `notifications_and_gate.sql` | `admin_notifications`, `content_gate_reports` | — |
| 0008 | `rate_limits.sql` | durable rate limiter + `rate_limit_hit()` | — |
| 0009 | `user_state.sql` | per-user state (onboarding, pins, read receipts) | — |
| 0010 | `content_changelog.sql` | `content_changelog` | 0002 (trigger functions) |
| 0011 | `content_contacts.sql` | `content_contacts` | 0002 |
| 0012 | `content_sops.sql` | `content_sops` | 0002 |
| 0013 | `baseline_and_audit_integrity.sql` | baseline for `allowed_users` + `telemetry_events`; `status` defaults to `'draft'`; `updated_by` stamped by the DB; delete snapshots; `content_versions` locked down | 0002, 0010–0012 |
| 0014 | `role_gated_rls.sql` | `private.app_role/is_member/is_manager`; every policy role-gated and InitPlan-wrapped; the access-token hook refuses instead of stamping `'none'` | 0013 (and 0009, see below) |
| 0015 | `reorder_rows.sql` | `public.reorder_content_rows(text, text[], int[])` — version-guarded, all-or-nothing `sort_order` write for a whole list | 0014 (`private.is_manager()`) |
| 0016 | `dashboard_rpc_and_retention.sql` | seven `public.dashboard_*` aggregate functions (manager only), covering indexes on `telemetry_events`, `public.run_retention()` and its pg_cron job when pg_cron is enabled | 0014, 0006, 0007, 0013 |
| 0017 | `user_admin_and_access_audit.sql` | managers write `allowed_users` (insert; update of `role`/`is_active`/`full_name` only); `private.allowed_users_guard` (stale-manager WT403, last manager WT460, self-change WT461); append-only `public.access_audit` written by trigger; `public.admin_user_last_activity()` | 0014, 0013, 0002 |

### An existing project (staging, production)

Run the pending files in numeric order, one at a time, checking the result of each before the next.
`0014`, `0015`, `0016` and then `0017` go last. `0013` through `0017` all abort with a clear message when an
earlier file is missing, so the order is enforced rather than assumed.

`0014` is a security fix, and applying the SQL is only half of it: the access-token hook it rewrites has
no effect until it is **enabled in the dashboard** (Authentication → Hooks). That step and the rest of
the manual configuration are the checklist in [SECURITY.md](SECURITY.md#3-dashboard-checklist--the-owners-manual-steps).

`0013` runs as one transaction and builds three indexes on `telemetry_events`, which blocks writes to
that table (`/api/events`) until it commits. At this project's volume that is a second or two, and a
batch that does time out is retried on the client's next flush (`lib/telemetry/client.ts`), so an
in-flight event is not lost. `CREATE INDEX CONCURRENTLY` is not an option
inside a transaction — if the table ever grows enough for this to matter, move the three index
statements into their own file and run them concurrently, outside a transaction.

### A fresh project

`0001` and `0005` reference `public.allowed_users`, which `0013` creates — so `0013` runs twice:

1. **`0013` first.** It creates `allowed_users` and `telemetry_events`, then reports
   `no content_* table found — baseline sections applied only` and stops there. It deliberately does
   *not* create the `allowed_users` policies on this pass, because `0001` and `0005` still have to
   create their own.
2. **`0001` → `0012`** in order.
3. **`0013` again.** Now the content sections run: `status` defaults, the `stamp_content_actor` and
   delete-snapshot triggers, `content_versions.op`, and the `content_versions` lockdown. Every
   statement in the file is idempotent, so the second pass re-applies the baseline harmlessly.
4. **`0014`.** Once, after `0013`'s second pass.
5. **`0015`.** After `0014` — it checks for `private.is_manager()` and aborts without it.
6. **`0016`.** After `0015`, same check.
7. **`0017`.** After `0016`. On a fresh project it notices that there is no active manager yet — add the
   first one by hand (the `insert` in [SECURITY.md §5](SECURITY.md#5-adding-removing-and-promoting-people));
   everyone after that is added at `/admin/users`.
8. `npm run seed:content` to load the content tables from `lib/content/*.ts`.

## Pending checklist

As of 2026-09-22 the live project is believed to be at **0007**. Tick these off as they are applied:

- [ ] **0008** `rate_limits` — until it is applied `/api/copilot` fails closed with 503.
- [ ] **0010** `content_changelog` — the changelog page shows its empty state and the admin list errors.
- [ ] **0011** `content_contacts` — the contacts page shows its empty state.
- [ ] **0012** `content_sops` — the six `/tools/amocrm/*` pages 404 until this **and** `npm run seed:content` have run.
- [ ] **0013** baseline + audit integrity — requires 0010–0012 first.
- [ ] **0014** role-gated RLS + the refusing access-token hook — requires 0013 first. **P0**: until it is
      applied, any Google account that completes the OAuth flow with the public anon key can read every
      content table over PostgREST.
- [ ] **0015** `reorder_content_rows` — requires 0014 first. Nothing calls it until the drag-and-drop
      list UI lands in S12, so an unapplied 0015 breaks nothing today; `reorderRows()` would answer
      `unknown` (the RPC is missing) if it were called.
- [ ] **0016** dashboard functions + retention — requires 0014 first. **Apply it before (or together with)
      deploying the code that calls it**: from S09 on the dashboard reads only through these functions, so
      until 0016 exists every telemetry widget on `/dashboard`, `/dashboard/content` and `/dashboard/quality`
      shows its error state (the RPC is missing), and `/api/cron/content-scan` answers `retention_failed`
      after its scan. Nothing an operator sees is affected.
- [ ] `supabase/tests/dashboard-parity.sql` and `retention-checks.sql` on staging, after 0016.
- [ ] **0017** allow-list administration + `access_audit` — requires 0014 first. Until it is applied,
      `/admin/users` lists the users (the read policy is 0014's) but every add / role change / deactivate
      answers `unauthorized` (no write grant, no policy), and the "last activity" column is empty with a
      notice. Nothing else is affected. Also set `SUPABASE_SERVICE_ROLE_KEY` on the server if it is not
      already: without it the row changes but the Auth ban does not (`auth_sync_failed`).
- [ ] Enable the Custom Access Token hook and walk the rest of
      [SECURITY.md §3](SECURITY.md#3-dashboard-checklist--the-owners-manual-steps) — 0014's SQL does
      nothing on its own.
- [ ] `npm run gen:types` after 0013 (see below).
- [ ] `supabase/tests/rls-checks.sql` on staging, after 0014.

`0009` (`user_state`) may or may not be applied; the app degrades to local-only state without it. It is
no longer free to skip, though: `0014` hardens the policies `0009` creates, and if `0009` is applied
**after** `0014`, its own email-only policies come back — so **re-run `0014`** in that case. `0014`
raises a notice saying exactly that when it finds no `user_state` table.

### After applying 0013

1. **Regenerate the types.** `lib/supabase/database.types.ts` carries the new columns
   (`allowed_users.full_name / is_active / created_at / updated_at / updated_by`, `content_versions.op`)
   hand-written in generator format. Run `npm run gen:types` (needs `SUPABASE_PROJECT_ID` and a
   logged-in Supabase CLI) to replace the hand edits with the real schema, then `npm run typecheck`.
2. **Check the seed.** `npm run seed:content` now names `status` explicitly on every table, because
   `0013` changed the column default to `'draft'`. Re-running the seed publishes the shipped content
   and leaves `content_contacts` as drafts, exactly as before.
3. **Run the RLS checks** (next section) — `0013` changes policies and grants.

### After applying 0014

1. **Enable the Custom Access Token hook** and work through
   [SECURITY.md §3](SECURITY.md#3-dashboard-checklist--the-owners-manual-steps). The SQL is inert until
   that switch is on: nothing stamps `app_metadata.role`, so `middleware.ts` sends everyone to
   `/login?error=not_allowed` and every read policy sees a non-member.
2. **Sign in once as an operator and once as a manager** before announcing it. This migration can lock
   every user out if the allow-list is wrong (a mixed-case email is fine now; `is_active = false` is
   not). The Supabase dashboard is a separate login and stays reachable, so turning the hook off there
   is always the way back.
3. **No type regeneration needed.** The `private` schema is not exposed by PostgREST and nothing in the
   app calls its functions, so `lib/supabase/database.types.ts` is unaffected.
4. **Run the RLS checks** (next section).

### After applying 0016

1. **Run the checks on staging**: `supabase/tests/dashboard-parity.sql` (every function against a
   hand-computed table, plus the operator refusal and the grants) and `supabase/tests/retention-checks.sql`
   — see [TESTING.md](TESTING.md#dashboard-parity-and-retention-checks-staging-only).
2. **Decide who schedules retention.** 0016 schedules `watertech-run-retention` (daily, 21:30 UTC = 02:30
   Tashkent) only if pg_cron is already enabled; its last notice says which way it went. Without pg_cron,
   `/api/cron/content-scan` (Vercel Cron, 03:00 UTC) calls `run_retention(p_skip_if_scheduled => true)` after
   its scan, and that call becomes a no-op the day a pg_cron job exists — so enabling pg_cron later
   (Dashboard → Database → Extensions) and **re-running 0016** is all it takes to move the job into the
   database. Job history: `select * from cron.job_run_details order by start_time desc limit 10;`.
3. **Run the first retention pass by hand.** On a project that has never pruned anything the first run can
   delete a large backlog in one transaction, which can outlast the API's statement timeout when the cron
   route calls it. Run `select * from public.run_retention();` once in the SQL editor; every later daily run
   only removes one day's worth.
4. **No type regeneration strictly needed**, but `npm run gen:types` would now also emit the
   `dashboard_*` / `run_retention` entries hand-written in `lib/supabase/database.types.ts` — compare them.

### After applying 0017

1. **Read the notices.** 0017 reports (a) a project with no active manager — add one by hand, nothing
   else can — and (b) legacy mixed-case emails, which `/admin/users` lists but cannot change until
   `update public.allowed_users set email = lower(email) where email <> lower(email);` has run. It also
   warns if the guard/audit functions are not owned by the owner of `access_audit` (run it as `postgres`).
2. **Run `supabase/tests/rls-checks.sql` on staging** — its 0017 blocks assert every refusal by SQLSTATE.
3. **Check `SUPABASE_SERVICE_ROLE_KEY`** is set where the app runs: deactivation bans the account in
   Supabase Auth through the service-role client (docs/SECURITY.md §4).
4. **No type regeneration strictly needed**; `access_audit` and `admin_user_last_activity` are
   hand-written in `lib/supabase/database.types.ts` — compare them with `npm run gen:types` when convenient.

### Retention policy (0016)

`public.run_retention()` is the only place the numbers live (its `constant` declarations); this table
describes them.

| Table | Rule |
| --- | --- |
| `telemetry_events` | rows older than 180 days are deleted |
| `copilot_logs` | `question` is set to null after 30 days; the row is deleted after 90 days |
| `content_gate_reports` | rows older than 180 days are deleted |
| `admin_notifications` | **read** notifications created more than 90 days ago are deleted; unread ones are kept |
| `content_versions` | the newest 50 `op = 'update'` snapshots per `(table_name, row_id)` are kept; `op = 'delete'` snapshots (what `/admin/trash` restores from) are kept 180 days |

The dashboard's longest range (93 days, `MAX_RANGE_SPAN_DAYS` in `lib/dashboard/range.ts`) compares against the 93
days before it, 186 days in total — so at that one range the previous window's oldest ~6 days are already
pruned and the KPI deltas lean positive. Every shorter range is unaffected.

## Running `rls-checks.sql` on staging

`supabase/tests/rls-checks.sql` is the verification step for anything that touches a policy, a `GRANT`
or a write-side trigger. **Staging only, never production**: it inserts fixture rows, and although the
whole script ends in `ROLLBACK`, it holds locks on live tables while it runs and consumes `bigserial`
ids that are not given back.

1. Supabase Dashboard → **staging** project → SQL Editor → New query.
2. Paste the whole file. Run it once.
3. Pass: a single row, `RLS checks passed`. Fail: an error starting with `RLS FAIL:` that names the
   role and the table.

What it asserts about `0013` specifically:

- a manager cannot insert a fabricated `content_versions` row (policy dropped, `INSERT` revoked);
- a content row inserted without a `status` lands as `'draft'`;
- `updated_by` is taken from the JWT even when the payload sends a different email, on insert and on
  update;
- deleting a row writes a snapshot with `op = 'delete'`, including the `content_packages` row deleted
  by the `on delete cascade` from its group.

What it asserts about `0014` specifically:

- the access-token hook stamps the role for an active `allowed_users` row, matching the email
  case-insensitively, and returns `{"error":{"http_code":403,"message":"not_allowed"}}` for an unknown
  email, an `is_active = false` row, and claims with no email at all;
- three non-member identities — `role: "none"`, a token with no `app_metadata`, and a deactivated user —
  see **zero rows in every table, published content included**, and cannot insert into `user_state`;
- an operator still reads published content and their own `user_state`; a manager still reads drafts and
  every dashboard table, `allowed_users` included.

What it asserts about `0017` specifically:

- an operator cannot insert, promote (themselves included), deactivate or delete an `allowed_users` row —
  including an unfiltered `UPDATE`, which only the update policy can stop — nor call
  `admin_user_last_activity()`;
- a manager can add a row and re-role another, both stamped with their JWT email and audited; a no-op
  update writes no audit row; `email`, `created_at`, `updated_at` and `updated_by` are not updatable, and
  nothing is deletable;
- a manager may rename but not demote or deactivate their own row (`WT461`), and the last active manager
  cannot be demoted (`WT460`) — through a manager session, and through `service_role`/the SQL editor too,
  single-row and whole-table;
- a manager token whose row was demoted or deactivated can no longer write the allow-list (`WT403`);
- `access_audit` is readable by managers only, writable by nobody (its owner included), and the grant
  matrix of both tables matches 0017.

A failure of the `0013` block on a project where `0013` has not been applied means "apply 0013", not
"the policies are wrong"; the `0014` blocks fail the same way with "is 0014 applied?", and a missing
`0017` stops the file early with "apply 0017_user_admin_and_access_audit.sql".
`permission denied … missing GRANT` anywhere means a table is missing its `GRANT … to authenticated`
(the lesson of `0003`).

## Rollback

There is no down-migration mechanism; a rollback is a new numbered file. `0013` is written so that
each section can be reverted independently — the statements below are what to put in that file, not
something to keep in `0013` itself.

**Section 1 — `allowed_users`.** Do not drop the table; it holds the allow-list. To undo only the new
columns: `alter table public.allowed_users drop column if exists full_name, drop column if exists
is_active, drop column if exists created_at, drop column if exists updated_at, drop column if exists
updated_by;` and
`alter table public.allowed_users drop constraint if exists allowed_users_email_lowercase_chk,
drop constraint if exists allowed_users_role_chk;`. The two policies are the ones `0001` and `0005`
already define, so leave them alone. Re-granting write access to `authenticated` is not a rollback
anyone should want.

**Section 2 — `telemetry_events`.** The table pre-dates the migration, so rolling back means dropping
only what `0013` added: `drop index if exists public.telemetry_events_ts_idx, public.telemetry_events_user_email_ts_idx, public.telemetry_events_type_ts_idx;`.
Dropping the table would destroy the dashboard's history — never do that as a rollback. (Once `0016` is
applied, `_ts_idx` and `_type_ts_idx` no longer exist: `0016` replaced them with `_ts_cover_idx` and
`_type_ts_cover_idx` on the same key columns.)

**Section 3 — trigger functions.** Restore the `0002` body of `snapshot_content_version()` (plain
`language plpgsql`, no `security definer`, `BEFORE UPDATE` behaviour only) and
`drop function if exists public.stamp_content_actor();` *after* dropping its triggers (section 4).
Restoring the old function means `authenticated` needs `INSERT` on `content_versions` again, so
section 6 has to be rolled back with it.

**Section 4 — `status` default.** `alter table public.<t> alter column status set default 'published';`
for each of the 10 tables. Nothing to migrate: the default only affects future inserts.

**Section 4 — triggers.** `drop trigger if exists trg_stamp_content_actor on public.<t>;` and
`drop trigger if exists trg_snapshot_version_delete on public.<t>;` for each of the 10 tables. Rows
already written keep their stamped `updated_by`, and delete snapshots already taken stay in
`content_versions` (harmless history).

**Section 4 — `content_versions.op`.** `alter table public.content_versions drop column if exists op;`
after the delete triggers are gone — the column is `not null`, so the trigger must not still be
inserting into it. Existing rows are not otherwise affected.

**Section 4 — `content_versions` lockdown.** `grant insert on table public.content_versions to
authenticated;`, `grant usage, select on sequence public.content_versions_id_seq to authenticated;`
and re-create `content_versions_manager_insert` from `0002`. Only needed if the `SECURITY DEFINER`
snapshot function is rolled back too — with it in place, nothing in the app uses these privileges.

### Rolling back 0014

Don't, unless the hook is locking out legitimate users — and in that case **turn the hook off in
Authentication → Hooks first**. That is instant, reversible, and restores sign-in without touching the
schema; it leaves the RLS half of `0014` in place, which is the half that closed the data leak. Fixing
the `allowed_users` row (lowercase email, `is_active = true`, `role` set) is almost always the real
remedy.

If the SQL itself has to go back, a new numbered file re-creates the `0002`/`0010`–`0012` read policies
(`<t>_authenticated_select_published` + `<t>_manager_select_all`), the `0009` `user_state` policies and
the `0001` hook body, then `drop schema private cascade;` last — the policies reference its functions,
so dropping it first fails. **Doing this re-opens the P0 in `docs/SECURITY.md` §2.** Reverting only the
hook, and keeping the role-gated policies, is the safe partial rollback: restore the `0001` body and
nothing else.

### Rolling back 0016

Nothing in 0016 changes or deletes data by itself — only `run_retention()` does, when something calls it.
To stop pruning immediately: `select cron.unschedule('watertech-run-retention');` (if the job exists) and
`revoke execute on function public.run_retention(boolean) from service_role;` (the cron route then logs
`retention_failed` after each scan). Rows already pruned are gone; there is no undo for retention.

A full rollback file drops the ten functions (`public.dashboard_kpis`, `_operator_activity`, `_hourly`,
`_zero_result_searches`, `_web_vitals`, `_not_helpful`, `_most_viewed`, `public.run_retention`,
`private.dashboard_active_ms`, `private.dashboard_zero_result_events`) and re-creates the two 0013 indexes
(`create index telemetry_events_ts_idx on public.telemetry_events (ts);`,
`create index telemetry_events_type_ts_idx on public.telemetry_events (type, ts);`) before dropping the
`_cover_` pair. The dashboard code of S09 cannot run without the functions, so it goes back together
with the app release that preceded it.

### Rolling back 0017

To take write access away again without losing anything: `drop policy if exists
"allowed_users_manager_insert" on public.allowed_users;`, the same for `"allowed_users_manager_update"`,
then `revoke insert, update on table public.allowed_users from authenticated;`. `/admin/users` then answers
`unauthorized` for every change and the allow-list goes back to being edited in the SQL editor. Leave the
guard and audit triggers in place: they cost nothing and keep auditing the SQL editor.

A full rollback file also drops the four triggers on `allowed_users` (`trg_allowed_users_guard`,
`trg_set_updated_at`, `trg_stamp_actor`, `trg_allowed_users_audit`), the functions
`private.allowed_users_guard()`, `private.audit_allowed_users()`, `public.admin_user_last_activity()`, and
finally `private.access_audit_append_only()` with the table it protects. **Keep `public.access_audit`**
unless the history is truly unwanted — it is the only record of who changed the allow-list. `anon`'s
revoked privileges are not worth restoring.
