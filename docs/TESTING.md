# Testing

Four layers. The first three run in CI on every push and pull request; the RLS script is manual.

| Layer | Command | Lives in | CI |
| --- | --- | --- | --- |
| Unit (Vitest, node env) | `npm test` | `tests/unit/**/*.test.ts` | yes |
| End-to-end (Playwright, Chromium) | `npm run build && npm run e2e` | `tests/e2e/*.spec.ts` | yes, unauthenticated only |
| Row Level Security | Supabase SQL editor | `supabase/tests/rls-checks.sql` | no — staging only |
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

CI has no Google sign-in, so the default suite only covers what an anonymous visitor can reach:

- `auth-gate.spec.ts`: `/`, `/admin`, `/dashboard/content`, `/ru/` redirect to the matching login page.
- `copilot-auth.spec.ts`: `/api/copilot` refuses anonymous requests before validating the body; `/api/cron/content-scan` needs the bearer secret.
- `offline.spec.ts`: `/offline` (uz and ru) renders its EmptyState and retry button without a redirect.
- `notifications.spec.ts`: `/admin/notifications` is behind the gate.

### Optional: signed-in manager checks (`TEST_SESSION_COOKIE`)

`auth-gate.spec.ts` has a second block that checks `/dashboard` renders the KPI grid and `/admin` renders six
section cards. It is skipped unless `TEST_SESSION_COOKIE` is set.

1. `npm run build && npm run start`, open `http://localhost:3000`, sign in with a **manager** Google account.
2. DevTools → Application → Cookies → `http://localhost:3000`. Copy every `sb-<project-ref>-auth-token`
   cookie. Large sessions are split into `.0`, `.1`, … chunks, and all of them are needed.
3. Join them as a cookie header and run the suite in the same shell:

   ```powershell
   $env:TEST_SESSION_COOKIE = 'sb-abcd-auth-token.0=base64-…; sb-abcd-auth-token.1=…'
   npm run e2e
   ```

The cookie is a live session: treat it like a password. Never commit it, never add it to CI secrets. It
expires with the session; if the manager block fails with "redirected away", capture a fresh one.

## RLS checks (staging only)

`supabase/tests/rls-checks.sql` asserts, per role, what `authenticated` can SELECT:

| As | Must NOT see | Must see |
| --- | --- | --- |
| operator | draft rows in every `content_*` table, `content_versions`, `copilot_logs`, `admin_notifications`, `content_gate_reports`, other operators' `telemetry_events` | published content (positive control) |
| manager | — | all of the left column |

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

`telemetry_events` (and `allowed_users`) were created before `supabase/migrations/` existed, so their
policies aren't in this repo. The telemetry check tests whatever policy staging actually has. If it fails,
write the missing policy as a new migration instead of editing the table by hand.

Re-run it after every migration that touches a policy or GRANT.

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
- **Playwright browsers** are cached under `~/.cache/ms-playwright`, keyed by the installed Playwright version.
