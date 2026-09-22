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

### An existing project (staging, production)

Run the pending files in numeric order, one at a time, checking the result of each before the next.
`0013` goes last. It aborts with a clear message if `0010`–`0012` have not been applied yet, so the
order is enforced rather than assumed.

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
4. `npm run seed:content` to load the content tables from `lib/content/*.ts`.

## Pending checklist

As of 2026-09-22 the live project is believed to be at **0007**. Tick these off as they are applied:

- [ ] **0008** `rate_limits` — until it is applied `/api/copilot` fails closed with 503.
- [ ] **0010** `content_changelog` — the changelog page shows its empty state and the admin list errors.
- [ ] **0011** `content_contacts` — the contacts page shows its empty state.
- [ ] **0012** `content_sops` — the six `/tools/amocrm/*` pages 404 until this **and** `npm run seed:content` have run.
- [ ] **0013** baseline + audit integrity — requires 0010–0012 first.
- [ ] `npm run gen:types` after 0013 (see below).
- [ ] `supabase/tests/rls-checks.sql` on staging, after 0013.

`0009` (`user_state`) may or may not be applied; the app degrades to local-only state without it.

### After applying 0013

1. **Regenerate the types.** `lib/supabase/database.types.ts` carries the new columns
   (`allowed_users.full_name / is_active / created_at / updated_at / updated_by`, `content_versions.op`)
   hand-written in generator format. Run `npm run gen:types` (needs `SUPABASE_PROJECT_ID` and a
   logged-in Supabase CLI) to replace the hand edits with the real schema, then `npm run typecheck`.
2. **Check the seed.** `npm run seed:content` now names `status` explicitly on every table, because
   `0013` changed the column default to `'draft'`. Re-running the seed publishes the shipped content
   and leaves `content_contacts` as drafts, exactly as before.
3. **Run the RLS checks** (next section) — `0013` changes policies and grants.

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

A failure of that last block on a project where `0013` has not been applied means "apply 0013", not
"the policies are wrong". `permission denied … missing GRANT` anywhere means a table is missing its
`GRANT … to authenticated` (the lesson of `0003`).

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
Dropping the table would destroy the dashboard's history — never do that as a rollback.

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
