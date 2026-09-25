# Audit-2 — release audit

The release audit of roadmap Audit-2 (S01–S14), at commit `4d832e3`, 2026-09-23, Next.js 14.2.35, Node
24.20. Every claim below was checked by running something or by reading the code path end to end; where
a check could not run on this machine, the table says so and why. The S17 audit follows further down, and the
**R3 release audit** (roles v2, people analytics, admin shell, company scenes) is the last section of this file.

Severity, as in S17: **P0** breaks users or security · **P1** visible defect · **P2** rule drift or a
defence-in-depth gap · **P3** nit.

## A. Results

| Check | Result | Measured |
|---|---|---|
| `npm run typecheck` | pass | 0 errors |
| `npm run lint` | pass | 0 warnings |
| `npm run check:i18n` | pass | no hard-coded strings; `uz.json` / `ru.json` 1 254 keys each, none one-sided |
| `npm test` | pass | 68 files, 1 061 tests (67 / 1 015 before this audit) |
| `npm run build` | pass | 145 pages generated; every operator route ≤ 180 kB (section E) |
| `npm run e2e` | pass, partial | 44 passed, 48 skipped: 43 need `TEST_OPERATOR_COOKIE`, 5 need `TEST_SESSION_COOKIE`; 0 failed |
| Migrations, fresh project (0013 → 0001–0012 → 0013 → 0014–0019) | pass (PGlite) | all 20 applies, then 0013–0019 re-applied: idempotent |
| Migrations, existing project (a reconstructed 0007 database → 0008–0019) | pass (PGlite) | same; 0017 reports the legacy mixed-case email, as documented |
| Migrations in strict filename order (what `supabase db reset` does) | **fail** | stops at 0001: `relation "public.allowed_users" does not exist` — open item O6 |
| `rls-checks.sql`, `dashboard-parity.sql`, `retention-checks.sql`, `storage-checks.sql`, `copilot-checks.sql` | pass (PGlite, both paths) | one "passed" row each |
| Mutation test of the SQL checks | pass after F3/F4 | content_versions retention rules: 6 of 6 injected faults caught (5 of 6 before); history rewrite: 2 of 2 (0 of 2 before) |
| Threat model (section C) | 9 of 9 hold | one middleware bypass found and fixed (F1) |
| Cross-layer regression hunt (section D) | pass | one unvalidated publish path fixed (F2) |

**Not run here.** The Supabase CLI (`supabase start` / `db reset`) is not installed and there is no Docker,
so the SQL ran in PGlite 0.5.8 (PostgreSQL 18 compiled to WebAssembly) behind a stub of Supabase's roles,
default privileges, `auth.jwt()` and the Storage tables. That exercises every migration and every check
file, but not PostgREST, GoTrue calling the auth hook, pg_cron or the Storage server — staging runs of the
five check files remain the release gate (section F). Nothing signed in ran: automation here has no Google
session, which is what the 48 skipped e2e cases need.

## B. Findings of this audit

### Fixed

| # | Sev | Where | Finding | Fix | Test |
|---|---|---|---|---|---|
| F1 | P2 | [middleware.ts](../middleware.ts), [lib/security/middleware-matcher.ts](../lib/security/middleware-matcher.ts) | The matcher skipped middleware for **any** path ending in `.svg/.png/…/.json/.txt/.map`, and its three single-file exclusions (`favicon.ico`, `sw\.js`, `manifest\.webmanifest`) were unanchored prefixes. Under a dynamic segment that bypassed the auth gate: `/uz/tools/amocrm/lead-creation.map`, `/ru/sales-process/scripts/<slug>.json` and `/uz/admin/scripts/x.json` answered **200 to an anonymous request** — the operator URLs with the operator shell (navigation, FAQ count, published changelog ids) around a not-found body, the admin one with the plain not-found page. Each operator URL of this kind, and each `/<anything>.json` or `/sw.js<anything>`, also **wrote a new ISR cache entry**, unauthenticated and unbounded. No content row and no user data was exposed: the slug never matches, and admin reads are RLS-scoped. | The extension exclusion is scoped to the three folders `public/` has (`certificates/`, `icons/`, `products/`, all flat); the three files are anchored with `$`. | 19 unit cases, 16 of which fail on the old literal. Compiled with Next's own `getMiddlewareMatchers`: 6 of 20 probe paths reached middleware before, 20 of 20 after, and 14 of 14 asset/infra paths are still excluded. 10 e2e cases in `auth-gate.spec.ts` (5 URLs land on the login page, 5 assets are still served without a session). Live probe of the new build: anonymous requests wrote 0 ISR entries. |
| F2 | P3 | [lib/dashboard/actions.ts](../lib/dashboard/actions.ts) | The dashboard quick actions passed the browser's `id` / `expectedVersion` to the publish gate and PostgREST without the zod parse CLAUDE.md §7 requires — `factory.setStatus` parses the same triple. A malformed id ran the gate on a missing row, which still writes a gate report and a "publish blocked" notification naming that string. | The same shape as `setStatus` (`idSchema`, a non-negative integer), parsed before the gate. | [tests/unit/dashboard/actions.test.ts](../tests/unit/dashboard/actions.test.ts): 27 cases, 21 red before the fix. |
| F3 | P3 | [supabase/tests/retention-checks.sql](../supabase/tests/retention-checks.sql) | A `run_retention()` that ranked delete snapshots into the newest-50 rule passed the check. It would evict the delete snapshot of a restored-then-edited row inside 180 days and keep 49 edits instead of 50. | Fixture: a row deleted 10 days ago, restored and edited 52 times since. | The injected fault now fails with "a 10-day-old delete snapshot was deleted …". |
| F4 | P3 | [supabase/tests/rls-checks.sql](../supabase/tests/rls-checks.sql) | Only a manager's INSERT into `content_versions` was asserted; a migration that re-granted UPDATE or DELETE to `authenticated` — letting a manager rewrite or erase history — passed. | UPDATE and DELETE asserted refused as well. | Both injected faults now fail. |

Also added for task 2 (tooling, not a finding): [supabase/tests/migration-status.sql](../supabase/tests/migration-status.sql),
a read-only catalog query that says which of 0001–0019 a project has had. Verified on an empty database,
at 0007, 0012, 0016 and 0019.

### Open

| # | Sev | Where | Finding | Proposed fix | Why not fixed here |
|---|---|---|---|---|---|
| O1 | P3 | tables from 0002–0016 | `anon` keeps whatever table privileges the project's default privileges gave it: only `rate_limits`, `allowed_users` and `access_audit` are revoked. On a project with Supabase's standard defaults (a fresh staging project) `anon` holds ALL on 16 tables. Inert — RLS is on everywhere and no policy names `anon`, so SELECT and DML see and change nothing, and TRUNCATE/TRIGGER/REFERENCES are not reachable through PostgREST, GraphQL or Realtime — but the table and column names are visible to anonymous introspection. SECURITY.md said "anon holds no grant on any table"; corrected. | A new migration revoking all table and sequence privileges in `public` from `anon`, plus a catalog assertion in `rls-checks.sql` over every public table. | A new schema step on every project, for a gap nothing can exploit — the owner's call. |
| O2 | P3 | `app/api/search-index`, `app/api/content-refs` | `Cache-Control: private, max-age=300`: after a sign-out the browser's HTTP cache (not the service worker's, which is purged) can replay the published search index for up to 5 minutes on a shared PC. No owner data. | `private, no-cache`; the service worker's own (purged) cache keeps the palette fast. | Changes caching behaviour for published content only. |
| O3 | P3 | `app/api/events`, `app/api/copilot` | Body cap (§7 step 4): `/api/events` checks only the declared `Content-Length`, which a chunked body omits; `/api/copilot` re-checks the size but only after `request.text()` has buffered the whole body. Bounded by Vercel's 4.5 MB request limit, and zod bounds what is stored. | One streaming reader that stops at the cap, used by both routes. | Hardening; nothing beyond a 4.5 MB parse is reachable on Vercel. |
| O4 | P3 | `components/admin/DataTable.tsx:739`, `:894`, `:901` | §6 type/radius scale: S12 added `rounded-md` ×2 and `text-[11.5px]`, following the admin area's existing drift (21 × `rounded-md` and 6 × `text-[11.5px]` before Audit-2; app-wide also `text-sm` ×20, `text-[16px]` ×14, …). Colours and the palette are clean. | One design-system task: extend the scale or sweep it, then add a lint check. | Fixing 3 of ~100 would make the admin UI inconsistent. |
| O5 | P3 | `lib/content/loader.ts` | No test pins `status = 'published'` on the ten service-role loaders (correct today, verified by reading). A regression there would put drafts on operator pages — RLS does not apply to the service role. | Assert each getter's PostgREST query, the way `concurrency.test.ts` does. | Test-only; no defect. |
| O6 | P3 | `supabase/migrations` | Not replayable in filename order: 0001 and 0005 need `allowed_users`, which 0013 creates, so `supabase db reset` fails at 0001. The documented two-pass order works (verified). | If the CLI is adopted: a `0000` bootstrap (`create table if not exists public.allowed_users (email text primary key, role text not null)`), or `supabase migration squash`. | The project has no CLI. |
| O7 | P3 | CLAUDE.md §7, §9 | Rule text vs code: §7 asks for a CSP nonce on a new `<script>`, but `next.config.js` deliberately ships no nonce (`'unsafe-inline'`, for static prerendering); §9 says telemetry `meta` ≤ 500 bytes, `lib/telemetry/schema.ts` allows 600. | Align the text or the code in a rules task. | A rule-text decision. |
| O8 | P3 | `components/admin/DataTable.tsx:345` | `runBulk` has no try/finally: a network failure mid-run leaves the bulk panel "running" until a reload. | try/finally around the loop. | UX nit. |
| O9 | P3 | `lib/admin/actions/reorder.ts:1-2` | The `"use server"` directive appears twice. | Delete one line. | Nit. |

S17's open items 15 and 16 (below) are unchanged.

## C. Threat model

| Claim | Verdict | Evidence |
|---|---|---|
| A non-allow-listed JWT reads nothing | holds | The access-token hook issues no token for an unknown or inactive email (0014; the hook block of `rls-checks.sql`). Middleware sends a token without a role to `/login?error=not_allowed`; the four session Route Handlers (`/api/events`, `/api/copilot`, `/api/search-index`, `/api/content-refs`) go through `getServerSession()`, which is null without a role (401), and the cron route takes a bearer secret compared in constant time; every admin Server Action goes through `requireManagerSession()`. RLS: three non-member identities see 0 rows in every table (`rls-checks.sql`). Functions, enumerated from the catalog: everything `authenticated` may execute is SECURITY INVOKER and refuses non-managers itself (WT403); the SECURITY DEFINER ones are `service_role`- or trigger-only; `anon` can execute nothing callable. |
| An operator cannot read drafts, logs or other operators' state | holds | RLS operator block of `rls-checks.sql` (drafts in all ten tables, `content_versions`, `copilot_logs`, `admin_notifications`, `content_gate_reports`, `access_audit`, others' `telemetry_events` and `user_state`). The ten service-role loaders filter `status = 'published'` (read; O5). Draft preview exists only inside the admin editors. |
| A manager cannot forge history or remove the last manager | holds | `content_versions`: INSERT/UPDATE/DELETE revoked from `authenticated`, rows written only by the SECURITY DEFINER trigger (F4 closes the test gap); `version`, `updated_at`, `updated_by` forced by triggers on every update; `access_audit` append-only even for its owner; WT460 last manager, WT461 self-change and WT403 stale token enforced for a manager session, `service_role` and whole-table updates (`rls-checks.sql` 0017 blocks); the same rules pre-checked in TS (`user-access.test.ts`). |
| No service-role import reachable from client code | holds | 10 importers of `lib/supabase/admin.ts`, all server-side (Route Handlers, `"use server"` or `server-only` modules, the seed CLI). An import-graph walk from all 124 `"use client"` files, stopping at the 27 `"use server"` boundaries they cross, found 0 paths to `lib/supabase/admin`, `lib/supabase/server`, `next/headers` or any `server-only` module. The values of `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` and `CRON_SECRET` occur in 0 files under `.next/static` and `.next/server`. |
| Sign-out leaves no owner data or user caches | holds (O2 residual) | `lib/auth/purge.ts`: uploads and telemetry stop synchronously, the owner's namespaced localStorage keys, all of sessionStorage and the telemetry buffer go; the service worker deletes the 10 caches on `PURGED_CACHE_NAMES` by exact name; the session is revoked; a hard navigation replaces the document. Another tab's sign-out or account switch runs the same purge (`SessionProvider`). Unit: `purge`, `owner`, `store`, `sw-routes`. `sign-out.spec.ts` needs `TEST_OPERATOR_COOKIE` (skipped here). |
| No `/products/*` or other route bypasses middleware | holds after F1 | Before F1, 14 of 20 probe paths skipped middleware (section B). |
| No raw database error reaches the client | holds | Admin actions log through `logDbError` and return a code; Route Handlers return fixed `{ error }` strings; the error boundaries never render `error.message`; a Server Component throw is masked by Next in production. |
| Uploads validate type and size on the server | holds | `lib/admin/actions/product-image.ts`: session → fields → declared type, extension and size → magic bytes (JPEG/PNG/WebP/AVIF, never SVG) → row version → content-addressed key. The bucket repeats the 2 MB and MIME limits (`storage-checks.sql`); `serverActions.bodySizeLimit` is 3 MB. |
| Retention never deletes an `op = 'delete'` snapshot within 180 days | holds | `run_retention()` ranks only `op = 'update'` rows for the newest-50 rule and deletes delete snapshots only past 180 days; `retention-checks.sql` with the F3 fixture, mutation-tested. |

## D. Cross-layer regression hunt

| Path that writes content | Publish gate | Optimistic concurrency | `revalidateContent` |
|---|---|---|---|
| create (`factory`) | when saved as published, on the candidate | `.insert()` → `id_taken` | yes |
| update (`factory`) | when saved as published, on the candidate | `eq("version")` | yes |
| setStatus (`factory`), and bulk publish/draft (one setStatus per row) | on the stored row | `eq("version")` | yes |
| remove, and bulk delete | — | `eq("version")`; references block or cascade | yes |
| restore a version onto a live row | when the row is published, on the merged candidate; `status` is never written | `eq("version")` | yes |
| restore from the trash | always comes back as a draft | `.insert()` → `id_taken` | yes |
| reorder | — (`sort_order` only) | all-or-nothing, per-row version (0015) | yes |
| product photo | — (`image_path` only, shape-checked by the database) | `eq("version")`; the new object is removed on a conflict | yes |
| dashboard publish / unpublish / mark reviewed | publish: on the stored row (input validated since F2) | `eq("version")` | yes |
| allow-list (not content) | — | none, by design: set-to-target writes, serialized by the guard's advisory lock | n/a |

**i18n:** 1 254 keys in each of `uz.json` / `ru.json`, none one-sided; all 12 `AdminErrorCode`s have a
message in both (`messages.test.ts`). **Design lock:** no hex/rgb outside the documented exceptions (the
Google mark on `/login`, `app/manifest.ts`), no Tailwind default palette, no `bg-white`/`text-white`/
`bg-black`, no inline colour styles; the type/radius scale is O4.

## E. Measured numbers

Route table of the final build — identical before and after this audit's fixes except the middleware
(122 → 123 kB). Shared by all routes: 89.4 kB.

| Area | First Load JS |
|---|---|
| Operator, largest | `/company/onboarding` 180 kB (at the budget), `/sales-process/scripts` 170, `/products` 166, `/company/about` and `/company/mission-values` 163, `/` 160, `/sales-process/battle-cards/[slug]` 156, `/changelog` 145 |
| Operator, every other route | 127–144 kB |
| Manager | `/admin/scripts/[id]` 178 kB (largest), other editors 169–170, lists 146, `/admin/users` 154, `/admin/trash` 129, `/admin/activity` 109, dashboards 133–140 |
| Public | `/login` 200 kB (imports the Supabase client on purpose, see `docs/PERF.md`), `/offline` 109 kB |

Tests: 68 unit files / 1 061 tests; 92 e2e cases (44 ran, 48 need a cookie); 5 staging SQL check files
plus `migration-status.sql`. PGlite, one full check file each (WebAssembly, so an upper bound):
`rls-checks` 74–84 ms, `dashboard-parity` 47–62, `retention-checks` 13–23, `storage-checks` 20–28,
`copilot-checks` 19–26; the whole fresh chain 0013 → 0019 applies in about 0.2 s.

## F. Production apply order

Staging first, then production. Everything below is by hand in **Dashboard → SQL Editor**, as `postgres`,
one file per run, reading the notices of each before the next ([MIGRATIONS.md](MIGRATIONS.md) is the full
runbook, [SECURITY.md §3](SECURITY.md#3-dashboard-checklist--the-owners-manual-steps) the dashboard steps).

1. **Find out where the project is.** Run `supabase/tests/migration-status.sql` (read-only — safe on
   production). The first `false` row is the next file. MIGRATIONS.md believes production is at 0007, but
   the project in `.env.local` has served `content_sops` rows (this audit's strict-mode build prerendered
   all 12 SOP pages, possibly from `.next/cache`): either `.env.local` points at staging, or that belief
   is stale.
2. `0008` → `0009` → `0010` → `0011` → `0012` → `0013` (on an existing project, once).
3. `0014`, then **Authentication → Hooks → Customize Access Token (JWT) Claims: enable,
   `public.custom_access_token_hook`**, and the rest of SECURITY.md §3 (sign-ups, Google provider,
   redirect URLs, JWT expiry and ECC signing keys, allow-list review). Sign in once as an operator and once
   as a manager before going on. Turning the hook off is the way back if nobody can sign in.
4. `0015` → `0016`, then `select * from public.run_retention();` once by hand → `0017` (read its notices:
   no active manager / mixed-case emails; set `SUPABASE_SERVICE_ROLE_KEY` on the server for bans) →
   `0018` (Storage enabled) → `0019`.
5. **Staging only:** `rls-checks.sql`, `dashboard-parity.sql`, `retention-checks.sql`,
   `storage-checks.sql`, `copilot-checks.sql` — each must answer its single "passed" row. They write
   fixtures inside a rolled-back transaction; never run them on production.
6. Deploy the app. The code of S09–S13 calls 0016–0019, so it must not go live before them.
7. `migration-status.sql` again: 19 migrations and 3 facts `true`.

Content for 0010–0012 (changelog, contacts, SOPs) reaches a project through `npm run seed:content`, which
refuses anything but `SEED_TARGET=staging` and any ref in `PROD_PROJECT_REFS` — on production it is
entered through `/admin`.

## G. Residual risks

- **Access-token window.** A deactivated or demoted user keeps their current access token until it
  expires (≤ the JWT expiry, 1 h by default) — SECURITY.md §4.
- **The publish gate is application-level.** A manager calling PostgREST directly with their own token can
  set `status = 'published'` without it, or insert a row with a backdated `updated_at`. History and
  `updated_by` stay trigger-written. Managers are trusted; the gate is quality control, not a boundary.
- **PGlite is not Supabase.** PostgREST, GoTrue calling the hook, pg_cron and the Storage server were not
  exercised; the staging runs in section F are the real gate.
- **Unknown legacy policies.** 0013/0014 drop only the policy names they know. `rls-checks.sql` fails on
  a leftover permissive SELECT policy on `telemetry_events` (verified by injecting one), and INSERT/
  UPDATE/DELETE there are revoked, so a leftover write policy is inert.
- **48 signed-in e2e cases** (sign-out purge, pins, changelog badge, locale, the operator a11y and mobile
  checks, admin bulk/reorder) did not run in this audit.
- **CSP** allows inline scripts — the documented trade-off for static prerendering (`next.config.js`).
- O1 (anonymous grants) and O2 (HTTP-cache replay) above.

## H. Fixed per phase (S01–S14)

| Phase | Commit | What it fixed |
|---|---|---|
| S01 env split | `9d09fb8` | One `getServerEnv()` became three lazy, independent getters: a missing `CRON_SECRET` no longer took the service key — and every content getter — down with it. Env errors name the variable, never its value; each getter refuses to run in a browser. |
| S02 DB baseline (0013) | `d134312` | Migrations for the two hand-made tables; `status` defaults to `draft`; `updated_by` stamped by the database from the JWT; DELETE (including cascades) leaves a snapshot; managers can no longer fabricate `content_versions` rows. |
| S03 role-gated RLS (0014) | `8b10857` | **P0:** any Google account that completed OAuth could read every content table over PostgREST with the public anon key. The hook now refuses the token; every policy goes through `private.is_member()` / `is_manager()`. |
| S04 middleware matcher | `09616df` | A `products/` prefix exclusion let `/products/comparisons`, `/roadmap`, `/technical-docs` skip the locale rewrite and the auth gate. (The extension-based hole it left is F1.) |
| S05 shared-device purge | `f77cd05` | Client storage namespaced per account; sign-out purges queues, storage, the telemetry buffer and the service-worker caches; cross-tab purge; session-bound responses are never cached. |
| S06 registry and action factory | `6ad4b30` | One write body for ten tables; database messages no longer reach the browser (`AdminErrorCode`); version-guarded deletes; list pages stopped shipping whole rows. |
| S07 trash, restore, diff | `0e6e8ff` | A restore could republish a draft without the gate, and overwrite an edit made meanwhile; both fixed. Deletes refuse (or confirm a cascade) when other rows point at the row. |
| S08 safeContent, seed guard | `238b138` | A failed content read now fails the build or keeps the last good page instead of publishing an empty knowledge base; the seed refuses production and no longer overwrites CMS edits. |
| S09 dashboard RPCs, retention (0016) | `bc4d60c` | The dashboard's raw-row fetch was silently truncated at PostgREST's 1 000-row cap; aggregates moved into SQL. Retention policy in one function. |
| S10 user management (0017) | `441c7ce` | Allow-list editing with last-manager, self-change and stale-token guards, an append-only audit, and an Auth ban on deactivation. |
| S11 editors, product photos (0018) | `714f468` | All eight admin editors failed at request time (a zod schema passed into a Client Component); photo uploads with byte-level type checks. |
| S12 admin ergonomics | `144d624` | Bulk actions, reorder, pagination, an unsaved-changes guard, slug autofill, draft preview. |
| S13 copilot insights (0019) | `519cdfe` | Copilot statistics and unanswered questions without emails; activity feed; one manager navigation. |
| S14 operator performance and a11y | `4d832e3` | Lazy Supabase client: the six operator routes over 180 kB came back under it (worst: `/company/onboarding` 249 → 180 kB); S17 findings 9–14. |

---

# Audit — S17

An independent review of the whole app against CLAUDE.md, the tests added to keep the findings from
coming back, and the numbers the review was based on. Reviewed at commit `ac97215`, Next.js 14.2.35.

Severity: **P0** breaks users or security · **P1** visible defect · **P2** rule drift · **P3** nit.

## 1. Findings

### Fixed

| # | Severity | File | Rule | Finding | Fix |
|---|---|---|---|---|---|
| 1 | P1 | [components/AppShell.tsx:214](../components/AppShell.tsx#L214) | WCAG 2.4.1 Bypass Blocks | No skip link. Every operator route puts ~35 sidebar links between the top of the page and the content, with no way past them for a keyboard or screen-reader user. | Skip link as the first focusable element, `<main id="main-content" tabIndex={-1}>` as its target. `sr-only` until focused. |
| 2 | P1 | [components/AppShell.tsx:186](../components/AppShell.tsx#L186) | WCAG 2.1.2, 4.1.2 | The mobile nav drawer is modal (backdrop, click-outside close) but was a plain `<div>`: no `role="dialog"`, no `aria-modal`, no focus trap, no Escape. Focus stayed on the page behind it. | `role="dialog" aria-modal="true" aria-labelledby`, `useFocusTrap`, Escape closes. Also makes the shell's `g`-chord guard (which looks for `[role="dialog"]`) treat the drawer like every other overlay. |
| 3 | P1 | [components/Breadcrumbs.tsx:21](../components/Breadcrumbs.tsx#L21) | WCAG 2.4.4 / 4.1.2 | The home crumb is an icon-only `<Link>` with no accessible name — axe `link-name`, **serious**, on every page that renders a `PageHeader`. Found by the axe scan. | `aria-label={t("home")}`, icon `aria-hidden`. |
| 4 | P1 | [components/ThemeToggle.tsx:53](../components/ThemeToggle.tsx#L53), [components/LocaleSwitcher.tsx:29](../components/LocaleSwitcher.tsx#L29) | §6 mobile | At 375px the TopBar's right-hand controls measured 271px and ended at x=383 — 8px past the viewport. `html { overflow-x: clip }` hid the scrollbar, so the avatar menu was simply clipped off-screen and sign-out was unreachable on a phone. | Both pills drop from `px-2.5` to `px-2` below `sm` (`sm:px-2.5` keeps the desktop layout byte-identical): 16px back, cluster ends at 367px. |
| 5 | P2 | [components/Sidebar.tsx:301](../components/Sidebar.tsx#L301), [:326](../components/Sidebar.tsx#L326), [components/Breadcrumbs.tsx:21](../components/Breadcrumbs.tsx#L21) | WCAG 1.3.1 | Three unnamed `<nav>` landmarks (desktop rail, mobile drawer, breadcrumbs), two of them in the DOM at the same time. axe `landmark-unique`, moderate. | `aria-label` on each, the sidebar's chosen by `scope` so the rail and the drawer read differently. |
| 6 | P2 | [components/Sidebar.tsx:152](../components/Sidebar.tsx#L152) | WCAG 4.1.2 | The nav accordion toggle has an `aria-label` that changes with state but no `aria-expanded`, so the collapsed/expanded state was only in the label text. | `aria-expanded={open}`. |
| 7 | P2 | `components/ui/Reveal.tsx`, `components/ui/Parallax.tsx` | §14, dead code | Both had zero importers. `Reveal` is marked `@deprecated` and ships its hidden state in the server HTML — the exact thing §14 forbids — so leaving it is a trap for the next task that reaches for a fade-up. | Deleted. |
| 8 | P3 | [components/LocaleSwitcher.tsx:19](../components/LocaleSwitcher.tsx#L19) | §13 | The switcher was an unlabelled `<div>` of two buttons whose only text was `uz` / `ru`, which a screen reader spells out. | `role="group"` + `aria-label`, and each button carries the language's own name. |
| 9 | P1 | [components/Sidebar.tsx:22-32](../components/Sidebar.tsx#L22-L32) | WCAG 1.4.3 | `NavCountBadge` 11px text in `text-status-ok` / `text-status-warning` on a 15% tint: 2.92:1 / 2.00:1 in the light theme. | Number in `text-primary-dark` (≈10:1 light, ≈12:1 dark); tinted fill kept. `a11y.spec.ts` composites the fill over the surface and asserts ≥ 4.5:1 in both themes. |
| 10 | P1 | [components/TopBar.tsx:38-59](../components/TopBar.tsx#L38-L59) | §6 mobile | At 375px the search field shrank to 0px wide. | Below `sm`, an icon-only button (same `onOpenSearch`, `aria-label` = the existing `searchPlaceholder` string); the text field is `hidden sm:block`. `mobile.spec.ts` checks it is visible, inside the viewport and opens the palette. |
| 11 | P2 | [components/Sidebar.tsx:145](../components/Sidebar.tsx#L145), [:237](../components/Sidebar.tsx#L237) | WCAG 1.4.11 | `LockIcon` in `text-status-warning`: 2.25:1 in the light theme. | `text-status-outdated` (3.71:1) on both Sidebar lock icons (expanded row and the collapsed rail). |
| 12 | P2 | [components/CommandPalette.tsx:288-303](../components/CommandPalette.tsx#L288-L303) | WCAG 4.1.2 | The input was not a combobox; the list had no listbox/option roles. | `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete`, `aria-activedescendant` (driven by the highlight index) on the input; `role="listbox"` on the rows container, `role="option"` + `aria-selected` on each row, group headings `role="presentation"`. Collapsed (no `aria-controls`/`aria-activedescendant`) when there are no rows. |
| 13 | P2 | [components/FaqTab.tsx:91](../components/FaqTab.tsx#L91) | §6 | `text-5xl` outside the font-size scale. | `text-[32px]`. |
| 14 | P3 | [components/TelemetryProvider.tsx:10](../components/TelemetryProvider.tsx#L10) | CLAUDE.md | Comment cited `AGENTS.md`. | Now cites `CLAUDE.md §6`. |

### Open

| # | Severity | File | Rule | Finding | Proposed fix | Why not fixed here |
|---|---|---|---|---|---|---|
| 15 | P3 | [lib/content/certificates.ts](../lib/content/certificates.ts), [lib/content/daily-schedule.ts](../lib/content/daily-schedule.ts) | §8 | Both are imported as raw arrays by pages and components rather than through a `lib/content/loader.ts` getter. They are static TS, not Supabase rows, so no getter exists. | Either add pass-through getters for consistency, or state in §8 that static content kinds are exempt. | A rule-text question, not a code defect. |
| 16 | P3 | [tests/e2e/auth-gate.spec.ts:29-40](../tests/e2e/auth-gate.spec.ts#L29-L40) | — | `parseCookieHeader` now exists in both `auth-gate.spec.ts` and `tests/e2e/session.ts`. | Import it from `session.ts`. | Left alone so the one spec that already covers the manager session is untouched by this task. |

### Checked and clean

| Area | Rule | Result |
|---|---|---|
| Server/client boundary | §3 | No `"use client"` file imports `@/lib/supabase/server`, `@/lib/supabase/admin`, `next/headers` or `lib/telemetry/aggregate.ts`. No layout calls `cookies()` or `headers()`. |
| Static prerendering | §4 | All 38 operator routes render as `●` (SSG) in the route table below — none dynamic, none `force-dynamic`. |
| Hydration safety | §3 | No `new Date()`, `Math.random()`, `window`, `localStorage` or `navigator` during render anywhere. `ScriptTurns.getSuggestedSlots(new Date())` is only called from a copy-button click handler; the render path goes through `useSuggestedSlots` → `useNow()`. Every `toLocaleDateString` call is in a Server Component. Changelog dates are formatted on the server and passed down as strings for exactly this reason. |
| Content without JS / under reduced motion | §14 | `useRevealPhase` returns `static` (= final state) on the server, with JS off, and whenever reduced motion is on; it only arms the hidden state after mount, for elements already below the fold. `ScrollScene` pins progress at 1 under reduced motion. Verified in a browser: with `javaScriptEnabled: false` and with `reducedMotion: "reduce"`, every chapter heading of `/company/about` is visible with no scrolling and the water path reads `pathLength` 1. |
| Motion library | §14 | No GSAP, Lenis or locomotive-scroll anywhere, no `preventDefault()` on wheel/touch, no programmatic window scrolling. All animated elements are `m.*` under `LazyMotion strict`. |
| Design lock | §6 | No hardcoded hex or rgb outside `app/globals.css`, `app/manifest.ts` (PWA manifest, palette values) and the Google brand mark on `/login`. Zero uses of the Tailwind default palette, `bg-white`, `text-white` or `bg-black`. Solid accent fills all use `text-surface`, which resolves to the same colour as `--on-accent` in both themes. |
| Route handler order | §7 | All five handlers do session → role/secret → size cap → zod → typed `{ error }` JSON, in that order. `/api/events` takes `user_email` from the verified session, never the payload. `/api/cron/content-scan` compares its bearer with `timingSafeEqual`. |
| Telemetry | §9 | No component calls `fetch("/api/events")`; everything goes through `useTrack()`. |
| i18n | §13 | `npm run check:i18n` clean. uz/ru key parity holds (`tests/unit/i18n/messages-parity.test.ts`). The only `next/navigation` imports are `notFound`, `useSearchParams` and the deliberately-raw `usePathname` in the two telemetry modules, each with a comment explaining why. |
| Performance budgets | §4 | After S14 every operator route is <= 180 kB (`/company/onboarding` is exactly 180 kB, rounded); the six former exceptions are resolved, see `docs/PERF.md`. |
| RLS | §7 | `supabase/tests/rls-checks.sql` extended to cover the five tables this cycle added: `content_changelog` (0010), `content_contacts` (0011), `content_sops` (0012) get a draft row an operator must not see plus a published positive control, and `rate_limits` (0008) is asserted unreadable and `rate_limit_hit()` un-callable by both roles. `user_state` (0009) was already covered in both directions. **Not executed**: migrations 0008 and 0010–0012 are still pending application (see the project's migration notes), and the script is staging-only by design. |

## 2. Test inventory

New files are marked ✨. "CI" means the test runs unauthenticated, as CI does.

| Spec | Covers | CI | Needs |
|---|---|---|---|
| `tests/e2e/smoke.spec.ts` | `/` gate, `/login` in both locales, `/api/events` 401 | yes | — |
| `tests/e2e/auth-gate.spec.ts` | gated routes redirect per locale; manager `/dashboard` + `/admin` | partly | `TEST_SESSION_COOKIE` |
| `tests/e2e/copilot-auth.spec.ts` | `/api/copilot` and the cron route refuse anonymous callers | yes | — |
| `tests/e2e/offline.spec.ts` | `/offline` renders in place in both locales | yes | — |
| `tests/e2e/notifications.spec.ts` | `/admin/notifications` behind the gate | yes | — |
| ✨ `tests/e2e/session.ts` | shared helper: two cookies (operator / manager), console-error collector | — | — |
| ✨ `tests/e2e/story.spec.ts` | `/company/about` + `/company/mission-values`: all chapter headings visible after scrolling; under reduced motion visible with no scrolling and the water path fully drawn; no console errors | no | `TEST_OPERATOR_COOKIE` |
| ✨ `tests/e2e/pins.spec.ts` | pin an objection → appears under Favourites on `/` → survives reload → unpin removes it and stays removed | no | `TEST_OPERATOR_COOKIE` |
| ✨ `tests/e2e/changelog.spec.ts` | the sidebar unread badge drops by one after "Tanishdim" and stays down after a reload | no | `TEST_OPERATOR_COOKIE` |
| ✨ `tests/e2e/locale.spec.ts` | 9 sections keep their route when switching to ru and show Russian copy; switching back drops the prefix; `/ru/login` sends `locale=ru` to `/auth/callback`; the callback lands back in `/ru` | partly (3 of 13) | `TEST_OPERATOR_COOKIE` |
| ✨ `tests/e2e/a11y.spec.ts` | axe WCAG 2.1 A/AA on `/login`, `/offline` (CI) and `/`, `/sales-process/scripts`, `/products`, `/faq`, `/company/about`, each in both themes; keyboard walk: skip link, sidebar, Ctrl+K, Ctrl+J, mobile drawer — each trapping and restoring focus | partly (4 of 26) | `TEST_OPERATOR_COOKIE` |
| ✨ `tests/e2e/mobile.spec.ts` | 375×812: no horizontal overflow on the same routes, plus the open nav drawer | partly (3 of 9) | `TEST_OPERATOR_COOKIE` |
| `supabase/tests/rls-checks.sql` | per-role SELECT/INSERT/UPDATE/DELETE across every `content_*` table, `content_versions`, `copilot_logs`, `admin_notifications`, `content_gate_reports`, `telemetry_events`, `user_state`, `rate_limits` | no | staging SQL editor |

`tests/unit/**` is unchanged: 38 files, 464 tests.

**Why two cookies.** `middleware.ts` confines each role to its own area — a manager is redirected off `/`,
`/products` and every other operator route. The existing `TEST_SESSION_COOKIE` is a manager's, so the new
specs read `TEST_OPERATOR_COOKIE` instead. Both are documented in `docs/TESTING.md`.

**New dependency.** `@axe-core/playwright` **4.13.0**, pinned exactly (`--save-exact`), devDependency only.
It is the reference Playwright binding for axe-core and the only way to get a real accessibility scan into
CI; 4.13.0 is the current release and matches the axe-core rule set the numbers below were measured against.
Nothing in `app/`, `components/` or `lib/` imports it — it cannot reach the shipped bundle.

**Verified locally.** The 26 CI-runnable e2e tests pass. The session-gated specs cannot run here (no Google
sign-in; see the project's note about authenticated routes), so the shell assertions in `a11y.spec.ts` and
`mobile.spec.ts` and the scene assertions in `story.spec.ts` were checked against the real components through
a temporary, uncommitted harness page under `/offline/harness` — skip link, labelled nav, Ctrl+K and Ctrl+J
focus trap and restore, the mobile drawer, both axe scans, the 375px overflow measurement, and the story's
three states (scrolled, reduced motion, JS disabled). All passed; the harness was then removed. Findings 3
and 4 were found by that run, not by reading.

## 3. Measured contrast

Computed from the tokens in `app/globals.css` (WCAG 2.x relative luminance). AA is 4.5:1 for body text,
3:1 for large text and for UI components and meaningful graphics.

| Pair | Light | | Dark | |
|---|---:|---|---:|---|
| `text-primary` on `surface` | 11.50:1 | AAA | 13.46:1 | AAA |
| `text-primary` on `bg` | 10.29:1 | AAA | 15.38:1 | AAA |
| `text-primary` on `surface-alt` | 11.08:1 | AAA | 12.22:1 | AAA |
| `text-secondary` on `surface` | 5.11:1 | AA | 6.89:1 | AA |
| `text-secondary` on `bg` | 4.58:1 | AA | 7.87:1 | AAA |
| `text-secondary` on `surface-alt` | 4.92:1 | AA | 6.25:1 | AA |
| `accent` on `surface` | 7.06:1 | AAA | 6.03:1 | AA |
| `accent` on `bg` | 6.32:1 | AA | 6.89:1 | AA |
| `on-accent` on `accent` | 7.06:1 | AAA | 6.89:1 | AA |
| `surface` on `accent` (every solid button) | 7.06:1 | AAA | 6.03:1 | AA |
| `accent-hover` on `surface` | 9.56:1 | AAA | 7.76:1 | AAA |
| `status-ok` on `surface` | 3.42:1 | large / UI only | 6.70:1 | AA |
| `status-warning` on `surface` | **2.25:1** | **fail** | 8.40:1 | AAA |
| `status-outdated` on `surface` | 3.71:1 | large / UI only | 5.60:1 | AA |
| `border` on `surface` | 1.26:1 | n/a — decorative | 1.32:1 | n/a — decorative |

Composited, as actually rendered:

| Pair | Light | Dark | Note |
|---|---:|---:|---|
| `text-status-ok` on `bg-status-ok/15` over `surface` | **2.92:1** | 5.04:1 | `NavCountBadge`, 11px — finding 9 |
| `text-status-warning` on `bg-status-warning/15` over `surface` | **2.00:1** | 6.07:1 | `NavCountBadge`, 11px — finding 9 |
| `text-accent` on `bg-accent/10` over `surface` | 6.12:1 | 5.05:1 | chips, Call Mode button — fine |
| `text-accent` on `bg-accent/5` over `surface` | 6.58:1 | 5.56:1 | pinned nav row — fine |

The three `--status-*` tokens are the palette's weak point in the light theme, and only there. Every one of
them is used as a **tinted badge or a small icon**, never as body text, so nothing here is unreadable prose —
but two of those badges carry a number an operator is meant to read (finding 9) and one is a lock icon that
is the sole indicator of a restricted page (finding 11).

## 4. Build route table

`npm run build`, Next.js 14.2.35. Shared by all routes: **89.2 kB**. `/[locale]` prefixes stripped; every
row covers both `uz` and `ru`. No route's First Load JS changed from the `docs/PERF.md` baseline.

| Route | Area | Render | Page JS | First Load JS |
|---|---|---|---:|---:|
| `/_not-found` | infra | static | 174 B | 89.3 kB |
| `/` | operator | SSG | 8.11 kB | 226 kB |
| `/admin` | manager | SSG | 186 B | 100 kB |
| `/admin/changelog` | manager | SSG | 160 B | 140 kB |
| `/admin/changelog/[id]` | manager | dynamic | 2.05 kB | 149 kB |
| `/admin/competitors` | manager | SSG | 160 B | 140 kB |
| `/admin/competitors/[id]` | manager | dynamic | 2.05 kB | 149 kB |
| `/admin/contacts` | manager | SSG | 160 B | 140 kB |
| `/admin/contacts/[id]` | manager | dynamic | 2.05 kB | 149 kB |
| `/admin/faq` | manager | SSG | 160 B | 140 kB |
| `/admin/faq/[id]` | manager | dynamic | 2.05 kB | 149 kB |
| `/admin/notifications` | manager | SSG | 6.13 kB | 127 kB |
| `/admin/objections` | manager | SSG | 160 B | 140 kB |
| `/admin/objections/[id]` | manager | dynamic | 2.05 kB | 149 kB |
| `/admin/packages` | manager | SSG | 160 B | 140 kB |
| `/admin/packages/[id]` | manager | dynamic | 2.05 kB | 149 kB |
| `/admin/packages/groups` | manager | SSG | 159 B | 140 kB |
| `/admin/packages/groups/[id]` | manager | dynamic | 2.05 kB | 149 kB |
| `/admin/products` | manager | SSG | 160 B | 140 kB |
| `/admin/products/[id]` | manager | dynamic | 2.05 kB | 149 kB |
| `/admin/scripts` | manager | SSG | 160 B | 140 kB |
| `/admin/scripts/[id]` | manager | dynamic | 9.03 kB | 172 kB |
| `/admin/sops` | manager | SSG | 160 B | 140 kB |
| `/admin/sops/[id]` | manager | dynamic | 4.91 kB | 165 kB |
| `/admin/versions/[table]/[id]` | manager | dynamic | 5.14 kB | 126 kB |
| `/changelog` | operator | SSG | 5.91 kB | 212 kB |
| `/company` | operator | SSG | 155 B | 134 kB |
| `/company/about` | operator | SSG | 596 B | 163 kB |
| `/company/contacts` | operator | SSG | 160 B | 139 kB |
| `/company/factory-tour` | operator | SSG | 1.29 kB | 139 kB |
| `/company/internal-rules` | operator | SSG | 1.29 kB | 139 kB |
| `/company/mission-values` | operator | SSG | 234 B | 163 kB |
| `/company/onboarding` | operator | SSG | 10.7 kB | 248 kB |
| `/dashboard` | manager | SSG | 4.19 kB | 117 kB |
| `/dashboard/content` | manager | SSG | 5.89 kB | 137 kB |
| `/dashboard/quality` | manager | SSG | 4.19 kB | 117 kB |
| `/faq` | operator | SSG | 3 kB | 139 kB |
| `/login` | public | SSG | 2.46 kB | 200 kB |
| `/logistics` | operator | SSG | 155 B | 134 kB |
| `/logistics/returns-policy` | operator | SSG | 924 B | 125 kB |
| `/logistics/sample-shipping` | operator | SSG | 924 B | 125 kB |
| `/offline` | public | SSG | 3.67 kB | 109 kB |
| `/products` | operator | SSG | 10.3 kB | 231 kB |
| `/products/comparisons` | operator | SSG | 4.02 kB | 128 kB |
| `/products/roadmap` | operator | SSG | 924 B | 125 kB |
| `/products/technical-docs` | operator | SSG | 3.67 kB | 143 kB |
| `/sales-process` | operator | SSG | 156 B | 134 kB |
| `/sales-process/battle-cards` | operator | SSG | 160 B | 139 kB |
| `/sales-process/battle-cards/[slug]` | operator | SSG | 5.47 kB | 223 kB |
| `/sales-process/objections` | operator | SSG | 160 B | 139 kB |
| `/sales-process/scripts` | operator | SSG | 11.2 kB | 235 kB |
| `/sales-process/scripts/[slug]` | operator | SSG | 7.61 kB | 142 kB |
| `/standards` | operator | SSG | 156 B | 134 kB |
| `/standards/career-path` | operator | SSG | 924 B | 125 kB |
| `/standards/communication-standards` | operator | SSG | 924 B | 125 kB |
| `/standards/kpi-system` | operator | SSG | 486 B | 140 kB |
| `/standards/motivation-bonus` | operator | SSG | 486 B | 140 kB |
| `/tools` | operator | SSG | 156 B | 134 kB |
| `/tools/amocrm` | operator | SSG | 154 B | 134 kB |
| `/tools/amocrm/[slug]` | operator | SSG | 924 B | 125 kB |
| `/tools/calculator` | operator | SSG | 5.75 kB | 127 kB |
| `/tools/communication-standards` | operator | SSG | 924 B | 125 kB |
| `/tools/google-sheets` | operator | SSG | 924 B | 125 kB |
| `/tools/repeat-sales-funnel` | operator | SSG | 924 B | 125 kB |
| `/tools/sales-funnel` | operator | SSG | 924 B | 125 kB |
| `/api/content-refs` | infra | dynamic | 0 B | 0 B |
| `/api/copilot` | infra | dynamic | 0 B | 0 B |
| `/api/cron/content-scan` | infra | dynamic | 0 B | 0 B |
| `/api/events` | infra | dynamic | 0 B | 0 B |
| `/api/search-index` | infra | dynamic | 0 B | 0 B |
| `/auth/callback` | infra | dynamic | 0 B | 0 B |
| `/manifest.webmanifest` | infra | static | 0 B | 0 B |

Operator routes over the 180 kB budget: `/company/onboarding` 248 kB, `/sales-process/scripts` 235 kB,
`/products` 231 kB, `/` 226 kB, `/sales-process/battle-cards/[slug]` 223 kB, `/changelog` 212 kB — the same
six as the S16 baseline, all from the static `lib/supabase/client` import in `lib/user-state/store.ts`,
with the written reason in `docs/PERF.md`.

## 5. Next five improvements, by operator impact

1. **Make search reachable on a phone (finding 10).** During a call on a 375px screen there is currently no
   visible way into the knowledge-base search at all — the field is zero pixels wide. Everything else in this
   list is smaller than that.
2. **Dynamic-import the Supabase browser client.** `SessionProvider`, `lib/user-state/store.ts` and
   `lib/auth/sign-out.ts` all import it statically although each only uses it inside an effect or an async
   function. About 67 kB gzip off *every* operator page's first load, and the only change that brings all six
   over-budget routes under 180 kB (already open as item 1 in `docs/PERF.md`).
3. **Fix the light-theme badge and lock contrast (findings 9 and 11).** Two `text-primary-dark` swaps. The
   unread-changelog count is the app's one push signal to an operator, and it is currently at 2:1 in the
   default theme.
4. **Give the command palette combobox semantics (finding 12).** Ctrl+K is the fastest path to anything in
   the app; right now a screen-reader user can arrow through the results without being told what is highlighted.
5. **Apply and verify migrations 0008 and 0010–0012, then run `rls-checks.sql` on staging.** Until they are
   applied, Copilot fails closed with 503, the changelog and contacts pages show empty states, the six
   `/tools/amocrm` pages 404 — and the RLS assertions this audit added have never actually been executed.

# R3 release audit

The release check of roadmap R3 (S01–S07: role model v2 / 0020, people analytics / 0021, the one admin shell and
overview, the people directory and person page, the three `/company/*` scenes) before the owner uses the admin
panel daily. Base commit `2c61b63`, 2026-09-25, Next.js 14.2.35, Node 22.22, CI's placeholder env
(`.github/workflows/ci.yml`). Severity as above: **P0** breaks users or security · **P1** visible defect · **P2**
rule drift or a defence-in-depth gap · **P3** nit.

## R3.A Results

| Check | Result | Measured |
|---|---|---|
| `npm run typecheck` | pass | 0 errors |
| `npm run lint` | pass | 0 warnings |
| `npm run check:i18n` | pass | no hard-coded strings; `uz.json` / `ru.json` 1 458 keys each, none one-sided; no key added |
| `npm test` (with CI's env) | pass | 85 files, 1 327 tests. **Before this audit: 2 of 1 295 failed** (R3-F1) — CI's `npm test` step, and so its build and e2e steps, had been red on `master` since S05 (runs 22–26) |
| `npm run build` | pass | 113 pages; 36 operator routes, largest `/sales-process/scripts` 170 kB — **every operator route ≤ 180 kB**; admin routes listed in PERF.md "R3 release audit" (largest `/admin/scripts/[id]` 178 kB, person page 161 kB) |
| `npm run e2e` | pass, partial | **46 passed, 93 skipped, 0 failed.** Skipped, by the cookie each group needs: `TEST_OPERATOR_COOKIE` 55 (a11y 23, locale 10, mobile 8, story 8, sign-out 2, people 2, changelog 1, pins 1); `TEST_SESSION_COOKIE` (admin) 29 (a11y 15, people 7, auth-gate 5, admin-bulk-reorder 2); `TEST_MANAGER_COOKIE` 9 (auth-gate 6, people 3). This machine has no Google session. Chromium: the pinned Playwright 1.63 wants build 1243, the container has 1194 — run through a scratch config with `launchOptions.executablePath` (repo config unchanged) |
| Role × route matrix (R3.C) | holds | at middleware (unit, `middleware-roles.test.ts`, 48 cases), page gate (read + `admin-gates.test.ts`), Server Action (read) and database (read) |
| 0021 functions | hold | all 7 public functions `security invoker`, `set search_path = ''`, first statement `if not (select private.is_admin()) … errcode 'WT403'`; the 8 private helpers `security invoker` + `search_path = ''`; EXECUTE revoked from `public, anon, service_role`, granted to `authenticated` only (`0021_people_analytics.sql` §5) |
| Admin rows via the API (WT462) | holds | `private.allowed_users_guard()` (0020): with `request.jwt.claims` set (a session or the service role), an insert of an admin row, a delete of one, and an update that touches the role / `is_active` / email of an admin row (or promotes to admin) raise `WT462`; `full_name` stays editable; `ASSIGNABLE_ROLES` keeps the UI to operator/manager |
| Admin telemetry | holds (after R3-F5) | `/api/events` returns `204` for an admin before the rate limiter, the body and the insert (`app/api/events/route.ts`); the client sends nothing before the role is known and nothing for an admin after (`lib/telemetry/client.ts`, 32 unit cases) |
| Person page vs a non-allow-listed email | holds | `parsePersonParam` (zod `userEmailSchema`) → `getPersonRecord` (exact match on `allowed_users` under the admin's RLS session) → `notFound()`; no widget is rendered without a row, and the RPCs answer a zero row or an empty set for an unknown email |
| `lib/supabase/admin.ts` imports | hold | none added in R3 (`git diff 82765be..HEAD -G supabase/admin` → one unit test only); the 9 existing importers are two Route Handlers (`/api/events`, `/api/copilot`), one Server Action module (`lib/admin/actions/users.ts`, the Auth ban), and server-only modules predating R3 (the publish gate, `stale-scan`, `retention`, the content loaders, `content-health.ts`, `durable-rate-limit.ts`), each with its reason comment |
| Dead code / naming sweep (R3.E) | clean | no live code uses a retired name; the remaining mentions are history, a guard test or an applied migration |
| Chart token contrast | pass | R3.F, and pinned by `tests/unit/ui/design-tokens.test.ts` |

**Not run here.** No SQL ran in this audit: there is no Postgres, and the S01/S02 PGlite verification (MIGRATIONS.md)
covers 0020/0021 — the functions and the guard were re-read end to end instead. The staging runs of
`people-checks.sql`, `rls-checks.sql` and `dashboard-parity.sql` remain the release gate (MIGRATIONS.md, Owner
steps). Nothing signed in ran (above); the new admin axe and keyboard specs are written and skip without the cookie.

## R3.B Findings

### Fixed

| # | Sev | Where | Finding | Fix | Test |
|---|---|---|---|---|---|
| R3-F1 | P1 | [tests/unit/content/safe.test.ts](../tests/unit/content/safe.test.ts) | The page-mode cases read the ambient `CONTENT_BUILD_MODE`; CI exports `allow-empty` for the whole job, so both failed there (`expected [] to be an instance of ContentUnavailableError`, CI run 26, `master` @ `2c61b63`). CI's `npm test` step had been red since S05, which also meant its build and e2e steps never ran for S05–S07. | The page-mode block pins `vi.stubEnv("CONTENT_BUILD_MODE", "strict")`. | The file passes with and without `CONTENT_BUILD_MODE=allow-empty` (15/15 each); the full suite under CI's env: 1 327/1 327. |
| R3-F2 | P1 | [components/onboarding/RouteDayCard.tsx](../components/onboarding/RouteDayCard.tsx) | The day header — a `bg-accent` button — drew its focus ring as an inset `ring-primary`, which is the same `--accent` token: **no visible focus** on `/company/onboarding`'s day toggles for keyboard users, in both themes (WCAG 2.4.7). The card's `overflow-hidden` would clip an outset ring too. | `focus-visible:ring-on-accent` (the token that reads on an accent fill in both themes); rule added to CLAUDE.md §6. | `tests/unit/ui/design-tokens.test.ts` scans `components/` and `app/` for an inset primary/accent ring on a `bg-accent`/`bg-primary` literal — red on the old file; e2e "company scenes — keyboard" asserts a computed ring on focus. |
| R3-F3 | P2 | [components/admin/ConfirmDialog.tsx](../components/admin/ConfirmDialog.tsx) | `role="alertdialog"` + `aria-modal="true"`, but focus stayed on the trigger, Tab walked the page behind the backdrop, Escape did nothing and nothing restored focus. It guards the person page's role and status changes and every CMS delete. | `useFocusTrap` (the hook `<Dialog>` uses): focus moves to Cancel, Tab cycles inside, focus returns to the trigger; Escape cancels except while the write is pending. | `tests/unit/admin/confirm-dialog.test.ts` (wiring; vitest has no DOM here); e2e "admin keyboard walk" opens it from the access panel's switch, Escapes it and expects focus back on the switch. |
| R3-F4 | P2 | [app/[locale]/dashboard/layout.tsx](../app/%5Blocale%5D/dashboard/layout.tsx) | Unlike the `/admin` layout, the `/dashboard` layout had no gate of its own — only its pages did. With `dashboard/loading.tsx` the layout streams first, so were middleware bypassed, a non-admin would get a `200` with the admin shell (nav labels, the bell) before the page's redirect. No data: the bell's count is RLS-scoped (0 for a non-admin). | `await requireAdminPage(locale)` in the layout, before anything renders; the page calls stay. | `tests/unit/auth/admin-gates.test.ts`: both admin layouts gate before `getMessages()`, every `/dashboard` page and both people pages gate. |
| R3-F5 | P3 | [lib/telemetry/client.ts](../lib/telemetry/client.ts) | Until `SessionProvider` (a lazy chunk) had named the role, the tracker could send: an admin's page that fired 25 events, sat 20 s, or unloaded early posted a batch (the beacon). `/api/events` dropped it (`204`), so nothing was recorded — but CLAUDE.md §9 says an admin sends nothing. | No flush and no beacon until the role is known; queued events wait in memory, go out for an operator/manager, are dropped for an admin. | 2 cases in `tests/unit/telemetry/client.test.ts`, both red before the fix (flush interval + batch size + `pagehide` + `visibilitychange` send nothing; an operator's pre-role event is sent once named). |
| R3-F6 | P3 | docs, tests | Text vs code: README said the seed upserts every row and called the admin CMS "future", and that CI needs a real Supabase project; MIGRATIONS said nothing calls 0021 yet; SECURITY / CLAUDE.md §7 named only the admin layout as a page gate; CLAUDE.md §7/§8 and ADDING_A_MODULE.md still said "manager" for the admin; §2 listed `home/` twice. The middleware matrix test lacked `/company/about` and a person path. | Edited in place (docs list in the change summary); 6 matrix cases added. | `middleware-roles.test.ts` 48/48. |

### Open

| # | Sev | Where | Finding | Proposed fix |
|---|---|---|---|---|
| R3-O1 | P3 | `app/globals.css` (light) | `--chart-green` #1F9D55 on its own `--chart-track` #E6EEF6 is **2.98:1** — the bar's end against the track, just under WCAG 1.4.11's 3:1. Against `surface` / `surface-alt` it passes (R3.F), and every bar has its value printed next to it, so no number depends on the fill. | A design-system task: light `--chart-green` → **#1D9651** (3.24:1 on the track, 3.65 on `surface-alt`, 3.79 on `surface`), and extend `design-tokens.test.ts` to the track pair. |
| R3-O2 | P3 | `app/[locale]/(admin)/admin/users/[email]/page.tsx` | The seven RPCs start in parallel with the allow-list read (one `Promise.all`), so an admin who types a non-allow-listed email still costs seven function calls (each a zero row) before the 404. Admin-only, nothing rendered; the page's comment chose latency. | Keep, or await `getPersonRecord` first and start the widgets only for a row (+1 round trip per person view). |
| R3-O3 | P3 | `components/admin/ConfirmDialog.tsx`, `components/ui/Dialog.tsx` | Two modal implementations remain: `ConfirmDialog` now shares the focus hook but not `<Dialog>` (it needs `role="alertdialog"`). | A `role` prop on `<Dialog>` (`"dialog"` default, `"alertdialog"`), then `ConfirmDialog` renders through it. |
| R3-O4 | P3 | `tests/e2e/*` | The admin and sales-manager specs have never run on this machine (no cookies). | Before daily use, the owner runs `npm run e2e` with `TEST_SESSION_COOKIE`, `TEST_OPERATOR_COOKIE` and `TEST_MANAGER_COOKIE` (TESTING.md). |

Audit-2's open items O1–O9 are unchanged (O9: `lib/admin/actions/reorder.ts` still has `"use server"` twice).

## R3.C Role × route matrix

| Route | admin | manager (sales) | operator | Enforced by |
|---|---|---|---|---|
| `/` | preview (no telemetry) | yes | yes | middleware: not an admin area |
| `/company/about` | preview | yes | yes | same |
| `/admin` | yes | → `/` | → `/` | middleware `isAdminArea()`→`homeForRole()`; `(admin)/admin/layout.tsx` `requireAdminPage` |
| `/admin/users` | yes | → `/` | → `/` | middleware; admin layout; the page's own `requireAdminPage`; `addUser`/`setRole`/`setActive` → `requireAdminSession` (`unauthorized`) and the allow-list guard (WT403) |
| `/admin/users/<email>` | yes; non-allow-listed / malformed email → 404; an admin row → no numbers, locked panel | → `/` | → `/` | middleware; admin layout; page; the 0021 functions (WT403) |
| `/dashboard` | yes | → `/` | → `/` | middleware; `dashboard/layout.tsx` (R3-F4) and the page; `publishFromDashboard` & co. → `requireAdminSession`; 0016 functions (WT403) |
| `/dashboard/quality` | yes | → `/` | → `/` | middleware; layout; page; 0016 functions |

No session → `/login`; a token without a known role → `/login?error=not_allowed` (all seven rows). The `/ru` forms
land on `/ru`. Every Server Action file (`"use server"`, 15) calls `requireAdminSession` first, directly or through
the injected `deps.requireSession` (`lib/admin/actions/deps.ts`).

## R3.D Accessibility

Keyboard, read end to end and (where a session is needed) written as e2e: the AdminShell nav — links with
`aria-current`, a `focus-visible` ring, a phone strip that scrolls the current item into view; role tabs — a real
`tablist`, roving `tabIndex`, arrows / Home / End (people.spec); CompareTable — sort buttons with `aria-sort`, each
row reachable through its row-header link; PeopleDirectory cards — links with a ring; the access panel — role buttons
with `aria-pressed`, a `role="switch"`, a confirm dialog that now traps focus (R3-F3); the three scenes — decorative
SVG `aria-hidden`, text in DOM order, the day header now with a visible ring (R3-F2), the day checkbox a native input
with a `peer-focus-visible` ring. New e2e: axe on `/admin`, `/admin/users`, the table view, a person page, `/dashboard`,
`/dashboard/quality` in both themes, `/company/mission-values` added to the operator scan, and the admin keyboard walk.

## R3.E Dead code and naming sweep

`git grep` for `requireManagerSession`, `isManagerArea`, `MANAGER_AREAS`, `MANAGER_NAV`, `ManagerAreaSwitch`,
`ManagerMonitoringHeader`, `DashboardTabs`, `last_manager`, `PipelineStory`, `FittingGlyph`: nothing in live code.
Kept on purpose: `tests/unit/admin/nav.test.ts` (asserts the three retired files stay deleted), CLAUDE.md §7/§15 and
PERF.md history (what was renamed or removed, when), Audit-2 §C of this file (history), and
`supabase/migrations/0017_…sql` line 23 (`last_manager` in a comment of an applied migration — never edited).
`is_manager()` after 0019: only inside 0020 (its alias definition, preflight and grants), a comment in 0021 and
`lib/admin/actions/user-access.ts` explaining it, and the check files that assert the alias still answers for the admin.

## R3.F Measured contrast (chart tokens)

WCAG relative luminance from the channels in `app/globals.css` (≥ 3:1 required for a bar fill, 1.4.11):

| Pair | Light | Dark |
|---|---:|---:|
| `--chart-green` on `--surface` | 3.49 | 8.54 |
| `--chart-green` on `--surface-alt` | 3.36 | 7.76 |
| `--chart-blue` on `--surface` | 4.75 | 6.17 |
| `--chart-blue` on `--surface-alt` | 4.58 | 5.60 |
| `--chart-green` on `--chart-track` | **2.98** (R3-O1) | 7.25 |
| `--chart-blue` on `--chart-track` | 4.06 | 5.24 |
| `--accent` (focus ring) on `--surface` / `--surface-alt` | 7.06 / 6.80 | 6.03 / 5.47 |

## R3.G Residual risks

1. **Signed-in paths are unverified by automation here.** 93 e2e cases (all admin / manager / operator flows, the new
   admin axe and keyboard specs) need the owner's cookies.
2. **SQL is verified on PGlite, not Postgres + PostgREST.** 0020/0021 were exercised there in S01/S02; this audit only
   re-read them. Staging runs of `people-checks.sql`, `rls-checks.sql` and `dashboard-parity.sql` are the gate.
3. **A role change reaches a session at its next token refresh (≤ 1 h).** A demoted or deactivated admin keeps a
   valid `admin` claim until then: the allow-list guard (WT403) stops their writes to `allowed_users`, but content
   writes, reads through `is_admin()` and the admin pages trust the claim (SECURITY.md §4).
4. **Middleware and pages trust the JWT's role claim**, which depends on the Custom Access Token hook being enabled
   in the Supabase dashboard (SECURITY.md §3) — no query can see that setting.
5. **Telemetry can be lost, never misfiled:** events queued before the role is known are dropped if the page
   unloads first (R3-F5 trades that for "an admin sends nothing").
