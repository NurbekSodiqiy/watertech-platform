# Testing

Five layers. Everything but the RLS script runs in CI on every push and pull request; the RLS script is
manual, and the signed-in half of the e2e suite needs a session cookie captured by hand (below).

| Layer | Command | Lives in | CI |
| --- | --- | --- | --- |
| Unit (Vitest, node env) | `npm test` | `tests/unit/**/*.test.ts` | yes |
| End-to-end (Playwright, Chromium) | `npm run build && npm run e2e` | `tests/e2e/*.spec.ts` | yes, unauthenticated only |
| Row Level Security | Supabase SQL editor | `supabase/tests/rls-checks.sql` | no — staging only |
| Dashboard SQL parity + retention | Supabase SQL editor | `supabase/tests/dashboard-parity.sql`, `retention-checks.sql` | no — staging only (the TS half of the parity check runs in `npm test`) |
| Copilot statistics | Supabase SQL editor | `supabase/tests/copilot-checks.sql` | no — staging only (the normalization corpus's TS half runs in `npm test`) |
| Storage policies + product photos | Supabase SQL editor | `supabase/tests/storage-checks.sql` | no — staging only (the limits' TS half runs in `npm test`) |
| Which migrations a project has had | Supabase SQL editor | `supabase/tests/migration-status.sql` | no — read-only, safe on any project (docs/MIGRATIONS.md) |
| Accessibility (axe-core, in Playwright) | `npm run e2e` | `tests/e2e/a11y.spec.ts` | yes, public routes only |
| Types + lint | `npm run typecheck && npm run lint` | — | yes |

Full local run, same order as CI:

```
npm run typecheck && npm run lint && npm test && npm run build && npm run e2e
```

## Unit tests

- Files mirror the module they cover: `lib/agents/publish-gate/checks.ts` → `tests/unit/agents/publish-gate.test.ts`.
- `server-only` is aliased to `tests/stubs/empty.ts` in `vitest.config.ts`, so server modules import normally.
- Shared content lives in `tests/fixtures/content.ts`. It is a small unlocalised `ContentBundle` plus products
  that contains the broken cases on purpose: a draft script, an objection pointing at a missing script, one
  pointing at the draft, and two near-duplicate FAQs. `gateContext()` builds the publish gate's context,
  `publishedContentBundle()` what the operator loaders would return. Build gate rows with the real
  `*ToRow` mappers from `lib/content/db.ts`, not by hand.
- Server modules that wrap `unstable_cache` or the service-role client are tested through their real
  entry point with those two mocked, e.g. `vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }))`
  and `vi.mock("@/lib/supabase/admin", …)`. See `copilot-retrieve.test.ts` and `content-health.test.ts`.
- `concurrency.test.ts` uses a real supabase-js client with a fake `fetch`, which keeps the test type-safe
  and asserts the PostgREST filters (`id=eq.…&version=eq.…`).
- `it.fails(...)` marks a known issue: it passes while the bug exists and turns red once it's fixed, which
  is the cue to change it to `it(...)`.

## End-to-end tests

Playwright starts `npm run start`, so **build first**. It reuses a server already listening on
`localhost:3000`. Never point it at `npm run dev`, which is slow and not what CI runs.

CI has no Google sign-in, so what runs there is what an anonymous visitor can reach:

- `smoke.spec.ts`: `/` gate, the sign-in button in both locales, `/api/events` 401.
- `auth-gate.spec.ts`: `/`, `/admin`, `/dashboard/content`, `/ru/` redirect to the matching login page, and
  so do URLs that merely end in a file extension (`/sales-process/scripts/<slug>.json`, `/x.json` — the
  matcher hole Audit-2 F1 closed); `/sw.js`, the manifest and one file from each `public/` folder are
  still served without a session.
- `copilot-auth.spec.ts`: `/api/copilot` refuses anonymous requests before validating the body; `/api/cron/content-scan` needs the bearer secret.
- `offline.spec.ts`: `/offline` (uz and ru) renders its EmptyState and retry button without a redirect.
- `notifications.spec.ts`: `/admin/notifications` is behind the gate.
- `locale.spec.ts` (the `sign-in keeps the locale` block): `/ru/login` sends `locale=ru` to `/auth/callback`, and the callback lands back in `/ru`.
- `a11y.spec.ts` / `mobile.spec.ts` (the public blocks): axe scans `/login` and `/offline` in both themes; 375x812 has no horizontal scroll.

The rest need a session and skip themselves without one.

### Optional: signed-in checks (`TEST_OPERATOR_COOKIE`, `TEST_SESSION_COOKIE`, `TEST_MANAGER_COOKIE`)

One cookie per role (role model v2, CLAUDE.md §7). `middleware.ts` keeps operators and sales managers out
of `/admin` and `/dashboard`. The admin may open the operator routes too, but only as a preview (no
telemetry, admin-only menu items), so the operator specs still run as an operator.

| Variable | Role | Unlocks |
| --- | --- | --- |
| `TEST_OPERATOR_COOKIE` | operator | `story.spec.ts`, `pins.spec.ts`, `changelog.spec.ts`, `locale.spec.ts`, and the operator blocks of `a11y.spec.ts` and `mobile.spec.ts` |
| `TEST_SESSION_COOKIE` | admin (the variable's name predates the role) | the `admin session` block of `auth-gate.spec.ts` (`/dashboard`, `/admin`, `/admin/users`, the operator-app preview and the avatar menu's way back to `/admin`) and `admin-bulk-reorder.spec.ts` |
| `TEST_MANAGER_COOKIE` | manager (a sales manager) | the `sales manager session` block of `auth-gate.spec.ts`: `/` renders, and `/admin/**` and `/dashboard/**` send them home |

1. `npm run build && npm run start`, open `http://localhost:3000`, sign in with an account of that role.
2. DevTools → Application → Cookies → `http://localhost:3000`. Copy every `sb-<project-ref>-auth-token`
   cookie. Large sessions are split into `.0`, `.1`, … chunks, and all of them are needed.
3. Join them as a cookie header and run the suite in the same shell:

   ```powershell
   $env:TEST_OPERATOR_COOKIE = 'sb-abcd-auth-token.0=base64-…; sb-abcd-auth-token.1=…'
   $env:TEST_SESSION_COOKIE  = 'sb-abcd-auth-token.0=…'   # the admin's, for auth-gate.spec.ts
   $env:TEST_MANAGER_COOKIE  = 'sb-abcd-auth-token.0=…'   # a sales manager's (optional)
   npm run e2e
   ```

All are live sessions: treat them like passwords. Never commit one, never add one to CI secrets. They
expire with the session; a spec that fails with "redirected away — the session cookie is expired or has the
wrong role" wants a fresh one (or another role's).

`tests/e2e/session.ts` holds the shared helpers: `useOperatorSession()` / `useAdminSession()` /
`useSalesManagerSession()` install the cookie and skip the enclosing describe when it is unset,
`expectSignedInAt()` fails with that message instead of an empty assertion, and `collectConsoleErrors()`
backs the "no console errors" checks. The role × route matrix itself is unit-tested without a session:
`tests/unit/security/middleware-roles.test.ts` drives the real middleware with stubbed claims.

### Accessibility (`a11y.spec.ts`)

axe-core via `@axe-core/playwright` (pinned 4.13.0), tags `wcag2a wcag2aa wcag21a wcag21aa`. A run fails on
any `serious` or `critical` violation; `minor`/`moderate` findings are printed in the failure message.

axe returns `incomplete`, not `violation`, for text on a semi-transparent fill — it cannot composite the
background. Those pairs are measured by hand in `docs/AUDIT.md` instead; re-measure them when a
`--status-*` token or a `/15`-style tint changes.

The same file holds the keyboard walk: skip link → `<main>`, sidebar, Ctrl+K, Ctrl+J, and the mobile nav
drawer, each asserted to trap focus while open and to return it to its trigger on Escape.

### Mobile (`mobile.spec.ts`)

375x812. `html, body { overflow-x: clip }` in `globals.css` hides a sideways scrollbar, so the check walks
every painted element and fails on the widest one whose right edge is past the viewport — not on
`document.scrollWidth` alone. The failure message names that element.

## RLS checks (staging only)

`supabase/tests/rls-checks.sql` asserts, per role, what `authenticated` can SELECT:

| As | Must NOT see | Must see |
| --- | --- | --- |
| operator, and sales manager (`manager`, 0020) — one loop, the same expectations for both | draft rows in every `content_*` table (including `content_changelog`, `content_contacts`, `content_sops`), `content_versions`, `copilot_logs`, `admin_notifications`, `content_gate_reports`, `rate_limits`, `allowed_users`, `access_audit`, other members' `telemetry_events` and `user_state` | published content, and their own `user_state` rows (positive controls) |
| admin | `rate_limits` | all of the left column, read-only for `user_state` and `access_audit` |
| non-member × 3 | **every table, published content included** | nothing at all |

It also asserts the write side: an operator or a sales manager may insert/update/delete only their own
`user_state` rows and no content row at all, the admin may not write `user_state` rows, a non-member may not
insert one, and no session role may select `rate_limits` or execute `rate_limit_hit()` — that counter
belongs to the server's service-role client alone (migration 0008). Every `dashboard_*`, `copilot_*` and
`admin_*` function, and `reorder_content_rows()`, refuses an operator and a sales manager itself (`WT403`);
that list is compared with the catalog first, so a new such function cannot ship without a line in it. A
catalog block fails if any policy compares the role claim to a literal instead of calling
`private.is_member()` / `private.is_admin()` — after 0020 a leftover `= 'manager'` would hand a sales manager
the owner's rows, and a re-run of 0013 on its own re-creates two such policies (re-run 0014 after it).

The three non-member identities are the tokens migration 0014 exists to neutralize: `role: "none"` (what
the old hook stamped for an unknown email), a token carrying no `app_metadata` at all, and a user whose
`allowed_users.is_active` is `false`. A separate block at the top of the file calls
`public.custom_access_token_hook()` directly and asserts the other half of 0014 — that those accounts are
refused a token, with `{"error":{"http_code":403,"message":"not_allowed"}}`, while an active member's
email is matched case-insensitively and gets its role stamped. See [SECURITY.md](SECURITY.md) for the
model this verifies and the dashboard steps it cannot.

The admin write block covers the integrity rules migration 0013 moved into the database: an admin cannot
insert a fabricated `content_versions` row or update or delete an existing one, a content row inserted
without a `status` lands as `draft`,
`updated_by` is stamped from the JWT even when the payload sends another email, and a delete leaves a
snapshot with `op = 'delete'` — including the `content_packages` row removed by the `on delete cascade`
from its group.

The allow-list blocks (migrations 0017 and 0020) run the statements `/admin/users` sends, as PostgREST
would send them, and assert each refusal by SQLSTATE. An operator or a sales manager cannot insert, promote,
deactivate or delete a row. The admin can add operators and turn them into sales managers and back
(stamped and audited, a no-op update unaudited), but cannot touch `email`/`created_at`/`updated_at`/
`updated_by`, delete, demote or deactivate their own row (`WT461`), or create, promote to, demote,
deactivate or reactivate an admin row (`WT462` — renaming one is allowed); an admin token whose row was
demoted or deactivated is refused (`WT403`). On the owner's side, the service-role key meets `WT462` on
every admin-row change (email and delete included) while its other writes are audited; the SQL editor
itself (no JWT) can add and remove an admin row, but the last active admin cannot be demoted, deactivated or
deleted (`WT460`) — not from the SQL editor, not by the service role in a whole-table `UPDATE`, and not by
that admin's own session, where `WT460` comes before `WT461` and `WT462`. To reach "last admin", the block
deactivates every other admin on staging from the SQL editor — inside the same rolled-back transaction.
`access_audit` cannot be written by anyone, its owner included.

**Run it against the staging project only, never production.** It writes fixture rows. They are always
rolled back, but while it runs it holds locks on live tables, and rolled-back inserts still consume
`bigserial` ids.

1. Supabase Dashboard → staging project → SQL Editor → New query.
2. Paste the whole file and run it once.
3. **Passed:** the result is a single row, `RLS checks passed`.
   **Failed:** an error starting with `RLS FAIL:` naming the role and table, e.g.
   `RLS FAIL: operator can select copilot_logs (1 rows visible)`. `permission denied … missing GRANT`
   means a table lacks its `GRANT … to authenticated` (see migration 0003).

The script switches roles with `set local role authenticated` and `set local request.jwt.claims = '…'`,
which is what `auth.jwt()` reads, so the policies run exactly as for a real request.

`telemetry_events` and `allowed_users` were created before `supabase/migrations/` existed; migration 0013
is their baseline. On a project where 0013 has not been applied yet the telemetry check tests whatever
policy that project actually has, and the 0013 block fails — that failure means "apply 0013" (see
`docs/MIGRATIONS.md`), not that the policies are wrong. The same reading applies to 0014: the hook block
fails with "is 0014 applied?" and the non-member block reports rows a pre-0014 policy genuinely exposes.
Either way, write the fix as a new migration instead of editing the table by hand.

Re-run it after every migration that touches a policy or GRANT.

## Dashboard parity and retention checks (staging only)

Migration 0016 moved the admin dashboard's aggregates into SQL functions. The TS aggregators
(`lib/telemetry/aggregate.ts`, `lib/dashboard/kpi.ts`, `lib/dashboard/quality.ts`) stay as the
reference, and one expected table pins both sides:

- `supabase/tests/dashboard-parity.sql` holds a JSON document (between the `$parity$` markers) with
  ~80 fixture events and every function's expected rows, for all operators and for one. It inserts the
  events, calls each `dashboard_*` function as an admin and compares the result to those rows. It then
  checks that an operator, a sales manager and a claim-less token are refused with `WT403` by the
  functions themselves, and that only `authenticated` holds `EXECUTE` on them.
- `tests/unit/dashboard/parity.test.ts` (in `npm test`) reads **the same file**, runs the TS
  aggregators over the same events, and asserts that the expected rows mapped through
  `lib/dashboard/telemetry-rpc.ts` equal what the aggregators produce. Change an expectation and both
  suites see it; add a widget and it gets a fixture case in the document, not a second table.
- `supabase/tests/retention-checks.sql` puts one row on each side of every horizon in
  `public.run_retention()`, runs it, asserts what is left, runs it again (nothing left to do), checks
  the `p_skip_if_scheduled` switch against the pg_cron job, and that only `service_role` can execute it —
  no session role, the admin's included.
  One fixture is a row deleted 10 days ago and edited 52 times since its restore: its delete snapshot
  must survive the newest-50 rule, which ranks update snapshots only.

Run each like `rls-checks.sql`: staging project → SQL Editor → paste the whole file → run once. Pass is a
single row (`Dashboard parity checks passed` / `Retention checks passed`), failure an error starting
with `PARITY FAIL:` / `RETENTION FAIL:`. Both end in `ROLLBACK`. The parity fixture lives in March 2001,
so no real event can fall into its windows; the retention check also prunes real staging rows inside
the transaction, which the rollback restores.

## Copilot checks (staging only, after 0019)

`supabase/tests/copilot-checks.sql` inserts thirteen `copilot_logs` rows in March 2001 (marker `copilot-check` in
`model`) and asserts, as an admin, what `copilot_stats()` and `copilot_unanswered()` promise: the counts per
status; the no-hits and error rates over *handled* requests (a `rate_limited` row is not one); p50 / p95 over the
requests that answered (a 60 s error does not move them); a half-open window (a row exactly on `p_to` is out, one
exactly on `p_from` is in); NULL rates and latencies for an empty window; a redacted (null) question never listed;
two spellings of one question in one group with the most recent wording as the sample; ordering by count, then
recency. It then checks that an operator, a sales manager and a claim-less token get `WT403`, bad arguments `WT400`, that no
result column carries an email, and that only `authenticated` may execute the functions.

The normalization corpus in that file (between the `$corpus$` markers) is shared with
`tests/unit/dashboard/copilot-normalize.test.ts`, which feeds every question to `normalizeSearchText()` in
`lib/search/normalize.ts` — the function `private.copilot_normalize_question()` mirrors. Change the corpus
or either implementation and one of the two suites fails. Run it like `dashboard-parity.sql`; pass is
`Copilot checks passed`, failure an error starting with `COPILOT FAIL:`. It ends in `ROLLBACK`.

## Storage checks (staging only, after 0018)

`supabase/tests/storage-checks.sql` asserts what 0018 promises about catalog photos: the `product-images`
bucket is public with a 2 MB limit and exactly the JPEG/PNG/WebP/AVIF types; its four policies are
authenticated-only, gated on `private.is_manager()` (an alias of `is_admin()` since 0020) and scoped to the
bucket (and, for writes, to `products/`) — checked on the policy text too, because the admin-only SELECT
policy would otherwise hide an over-wide UPDATE or DELETE policy; an operator and a sales manager can list,
write, rename and delete nothing; the admin can do all four inside the bucket and nothing in another one;
and `content_products.image_path` refuses a key that names another
product, climbs out of `products/`, or has a disallowed extension.

It inserts rows into `storage.objects` directly (catalog rows only — no file is written) and sets
`storage.allow_delete_query` for its own transaction, which newer Storage versions require for a plain
SQL delete. Run it like `rls-checks.sql`; pass is `storage checks passed`, failure an error starting with
`STORAGE FAIL:`. It ends in `ROLLBACK`.

The TS side of the same limits is `tests/unit/admin/product-image.test.ts`, which reads the migration
file and fails if its size limit, MIME list or `image_path` pattern drift from `lib/admin/product-image.ts`.

## CI (`.github/workflows/ci.yml`)

One job: `npm ci` → typecheck → lint → `npm test` → build → Playwright (Chromium) → e2e. Traces are
uploaded when a step fails.

- **Node 22.** `@supabase/supabase-js` 2.116 requires it: on Node 20 the client constructor throws (no global
  `WebSocket`), which turns the API routes' 401s into 500s.
- **Secrets.** Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as repository secrets
  (Settings → Secrets and variables → Actions). Without them CI falls back to a dummy project, which is
  enough for the anonymous specs.
- **Deliberately absent.** No service-role key and no `GEMINI_API_KEY`. `SUPABASE_SERVICE_ROLE_KEY` and
  `CRON_SECRET` are set to obvious placeholders only because `lib/env.ts` requires them to be present.
  Copilot therefore answers 503 to a signed-in caller in CI, and 401 to everyone else.
- **`CONTENT_BUILD_MODE: allow-empty`.** See below.
- **Playwright browsers** are cached under `~/.cache/ms-playwright`, keyed by the installed Playwright version.
- **No session cookies.** `TEST_OPERATOR_COOKIE` and `TEST_SESSION_COOKIE` are deliberately unset, so every
  signed-in spec skips. CI covers the public routes; the operator ones are a local, pre-merge check.

### `CONTENT_BUILD_MODE` (the build's content guard)

Operator pages are statically prerendered and revalidated through `unstable_cache` in
`lib/content/loader.ts`. A content read that fails now behaves differently depending on who is reading
(`ContentReadMode` in `lib/content/safe.ts`):

| Getter | Mode | On a failed read |
| --- | --- | --- |
| `getScripts()`, `getFaqs()`, `getContentBundle()`, ... | `"page"` | throws `ContentUnavailableError`, naming the content kind |
| `getScriptsOrEmpty()`, `getContentBundleOrEmpty()`, ... | `"degrade"` | logs `[content:<kind>]` and returns an empty result |

Pages use the first, Route Handlers (`/api/search-index`, `/api/content-refs`), the Copilot retriever
and the request-time manager dashboard use the second. Throwing is the point on a page: `next build`
stops instead of generating a knowledge base with nothing in it, and a Supabase outage during
background ISR revalidation leaves the last good page in the Full Route Cache rather than replacing it
with empty sections for up to an hour.

CI cannot satisfy that — it builds against a placeholder project where every read fails by design — so
the workflow sets `CONTENT_BUILD_MODE: allow-empty`, which makes `"page"` behave like `"degrade"`. It is
the only supported value besides `strict`; anything unreadable (a typo, a blank `CONTENT_BUILD_MODE=`
line) is treated as `strict`, so a misspelled flag can only make a build stricter.

**Never set it in Vercel, in production, or in `.env.local`.** Leaving it unset is what makes a broken
deploy fail loudly. To reproduce either half locally:

```powershell
# fails: "Content unavailable: "sops" could not be read. …"
$env:NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:1'; npm run build

# succeeds, prerendering empty pages — what CI does
$env:CONTENT_BUILD_MODE = 'allow-empty'; npm run build
Remove-Item Env:CONTENT_BUILD_MODE, Env:NEXT_PUBLIC_SUPABASE_URL
```

`tests/unit/content/safe.test.ts` covers both modes and the flag; the route table is unchanged either
way (`docs/PERF.md`), since none of this reaches the browser.

## Seeding content (`npm run seed:content`)

The seed writes every `content_*` table from `lib/content/*.ts` with the service-role key, which is why
it now refuses to run unless it is told, twice, that it is not pointed at production
(`supabase/seed/guard.ts`, covered by `tests/unit/seed/guard.test.ts`):

| Variable / flag | Effect |
| --- | --- |
| `SEED_TARGET=staging` | required; any other value (or unset) refuses |
| `PROD_PROJECT_REFS` | comma-separated project refs that are never seeded; required for a hosted project |
| `--dry-run` | prints the plan and writes nothing |
| `--force` | overwrites existing rows instead of skipping them |

The project ref is parsed from `NEXT_PUBLIC_SUPABASE_URL` (`https://<ref>.supabase.co`). A local stack
(`localhost`, `127.0.0.1`) is allowed; a host that is neither is **refused** — an unrecognised domain
cannot be proven not to be production.

Writes are insert-only by default (`upsert … ignoreDuplicates`, i.e. `ON CONFLICT DO NOTHING`), so a
re-run leaves every row a manager has edited exactly as they saved it, `status` included. That is the
accident the guard exists for: the old unconditional upsert reset published contacts back to draft and
overwrote CMS edits with the shipped TS arrays. Both a dry run and a real run print the same per-table
plan before anything is written.

```powershell
$env:SEED_TARGET = 'staging'; $env:PROD_PROJECT_REFS = '<prod-ref>'
npm run seed:content -- --dry-run     # plan only
npm run seed:content                  # insert what is missing
npm run seed:content -- --force       # overwrite existing rows (rarely what you want)
```
