# Performance notes

What operator pages ship to the browser, how it is measured, and the budgets. Numbers come from a
production build only (`npm run build`, served with `npm run start`), never from `npm run dev`.

## How to measure

```
npm run build      # route table: Page JS / First Load JS (gzip)
npm run analyze    # bundle analyzer; on Windows: set ANALYZE=true&& next build
                   # reports land in .next/analyze/{client,nodejs,edge}.html
```

**Reading the route table.** `next build` builds each row from the page entry plus the shared chunks. It does
**not** include the chunks that only the `(app)` layout pulls in (AppShell, SessionProvider and what they import).
A second, measured figure is therefore recorded below: the gzip size of every `<script src>` in the prerendered
HTML of a route (`.next/server/app/uz/**/*.html`, `polyfills` excluded), plus the HTML size itself. That is what a
browser really downloads before the page is interactive. The budgets in CLAUDE.md §4 use the table figure; the
measured figure is tracked so the gap stays visible.

## Baseline 2026-09-21

Commit `88d4272`, Next.js 14.2.35. Shared by all routes: **89.2 kB**.

| Route | Area | Page JS | First Load JS |
|---|---|---:|---:|
| `/` | operator | 7.81 kB | 237 kB |
| `/admin` | manager | 186 B | 100 kB |
| `/admin/changelog` | manager | 160 B | 140 kB |
| `/admin/changelog/[id]` | manager | 2.05 kB | 149 kB |
| `/admin/competitors` | manager | 160 B | 140 kB |
| `/admin/competitors/[id]` | manager | 2.05 kB | 149 kB |
| `/admin/contacts` | manager | 160 B | 140 kB |
| `/admin/contacts/[id]` | manager | 2.05 kB | 149 kB |
| `/admin/faq` | manager | 160 B | 140 kB |
| `/admin/faq/[id]` | manager | 2.05 kB | 149 kB |
| `/admin/notifications` | manager | 6.13 kB | 127 kB |
| `/admin/objections` | manager | 160 B | 140 kB |
| `/admin/objections/[id]` | manager | 2.05 kB | 149 kB |
| `/admin/packages` | manager | 160 B | 140 kB |
| `/admin/packages/[id]` | manager | 2.05 kB | 149 kB |
| `/admin/packages/groups` | manager | 159 B | 140 kB |
| `/admin/packages/groups/[id]` | manager | 2.05 kB | 149 kB |
| `/admin/products` | manager | 160 B | 140 kB |
| `/admin/products/[id]` | manager | 2.05 kB | 149 kB |
| `/admin/scripts` | manager | 160 B | 140 kB |
| `/admin/scripts/[id]` | manager | 9.03 kB | 172 kB |
| `/admin/sops` | manager | 160 B | 140 kB |
| `/admin/sops/[id]` | manager | 4.91 kB | 165 kB |
| `/admin/versions/[table]/[id]` | manager | 5.14 kB | 126 kB |
| `/changelog` | operator | 5.86 kB | 212 kB |
| `/company` | operator | 155 B | 134 kB |
| `/company/about` | operator | 596 B | 163 kB |
| `/company/contacts` | operator | 160 B | 139 kB |
| `/company/factory-tour` | operator | 1.29 kB | 139 kB |
| `/company/internal-rules` | operator | 1.29 kB | 139 kB |
| `/company/mission-values` | operator | 234 B | 163 kB |
| `/company/onboarding` | operator | 10.6 kB | 248 kB |
| `/dashboard` | manager | 4.19 kB | 117 kB |
| `/dashboard/content` | manager | 5.89 kB | 137 kB |
| `/dashboard/quality` | manager | 4.19 kB | 117 kB |
| `/faq` | operator | 2.96 kB | 139 kB |
| `/login` | public | 2.46 kB | 200 kB |
| `/logistics` | operator | 155 B | 134 kB |
| `/logistics/returns-policy` | operator | 924 B | 125 kB |
| `/logistics/sample-shipping` | operator | 924 B | 125 kB |
| `/offline` | public | 3.67 kB | 109 kB |
| `/products` | operator | 10.3 kB | 231 kB |
| `/products/comparisons` | operator | 4.02 kB | 128 kB |
| `/products/roadmap` | operator | 924 B | 125 kB |
| `/products/technical-docs` | operator | 3.67 kB | 143 kB |
| `/sales-process` | operator | 156 B | 134 kB |
| `/sales-process/battle-cards` | operator | 160 B | 139 kB |
| `/sales-process/battle-cards/[slug]` | operator | 5.47 kB | 223 kB |
| `/sales-process/objections` | operator | 160 B | 139 kB |
| `/sales-process/scripts` | operator | 15.2 kB | 248 kB |
| `/sales-process/scripts/[slug]` | operator | 7.61 kB | 142 kB |
| `/standards` | operator | 156 B | 134 kB |
| `/standards/career-path` | operator | 924 B | 125 kB |
| `/standards/communication-standards` | operator | 924 B | 125 kB |
| `/standards/kpi-system` | operator | 486 B | 140 kB |
| `/standards/motivation-bonus` | operator | 486 B | 140 kB |
| `/tools` | operator | 156 B | 134 kB |
| `/tools/amocrm` | operator | 154 B | 134 kB |
| `/tools/amocrm/[slug]` | operator | 924 B | 125 kB |
| `/tools/calculator` | operator | 5.71 kB | 126 kB |
| `/tools/communication-standards` | operator | 924 B | 125 kB |
| `/tools/google-sheets` | operator | 924 B | 125 kB |
| `/tools/repeat-sales-funnel` | operator | 924 B | 125 kB |
| `/tools/sales-funnel` | operator | 924 B | 125 kB |

### Five largest client modules (bundle analyzer, parsed size)

| # | Module | Parsed | Gzip | Where it loads |
|---|---|---:|---:|---|
| 1 | `react-dom` (Next's compiled copy) | 168.7 kB | 52.3 kB | every route (shared chunk) |
| 2 | `react-dom` in `framework-*.js` | 125.7 kB | 40.1 kB | Pages Router framework chunk, referenced by no App Router page |
| 3 | `@sentry-internal/replay` | 119.7 kB | 37.1 kB | separate async chunk, referenced by no page HTML |
| 4 | `@supabase/auth-js` `GoTrueClient` | 67.1 kB | 14.0 kB | **every operator page** (see Open items) |
| 5 | `zod` v3 | 49.1 kB | 10.8 kB | **every operator page** (via `lib/env` and user-state schemas) |

Next in line: `public/sw.js` 53.3 kB (service worker, not page JS), `react-hook-form` 37.9 kB (admin only),
`@supabase/storage-js` + `postgrest-js` 29.3 + 28.1 kB (same chunk as `createBrowserClient`, 53 kB gzip),
`fuse.js` 25.5 kB. `framer-motion` totals 160 kB parsed across chunks, of which the `domMax` feature bundle is async.

### Measured payload (scripts in the HTML, gzip; HTML uncompressed)

49 prerendered `uz` pages excluding `/offline`: scripts **248 / 252 / 281 kB** (min / median / max),
HTML **90 / 110 / 160 kB**. Every operator page, including the ones the table shows at 125-139 kB, loads the
Supabase browser client chunks (`5283`, `44530001`, `1351`), because the `(app)` layout's `SessionProvider`
imports it.

## Changes (S16)

**Client messages scoped per area.** `app/[locale]/layout.tsx` used to pass the whole `messages` object to
`NextIntlClientProvider`, so every page serialized every namespace. It now passes only what client components read
(`ROOT_CLIENT_NAMESPACES` in `lib/i18n/client-messages.ts`; the long-form `pages.*` copy that only Server
Components render stays out: 17.5 of 47.4 kB of `uz.json` remain). `(admin)/admin/layout.tsx` and
`dashboard/layout.tsx` nest a second provider with the root list plus their own (`admin` + `pages.admin`;
`dashboard` + `admin.gate`). A nested `IntlProvider` replaces its parent's messages instead of merging, so the
root list is repeated there. `tests/unit/i18n/client-messages.test.ts` walks the imports from every
`"use client"` file and fails when a `useTranslations` namespace is missing from the list for that area (it
caught `admin.gate` for the dashboard's `QuickActionButton` while this was written).

**Lazy Call Mode.** `ScriptsWorkspace` loaded `CallModeOverlay` statically, which dragged `lib/search` and
`fuse.js` into the scripts route. It is now `next/dynamic` (`ssr: false`) and warmed on idle, like
`CommandPalette` in `AppShell`.

**fuse.js off the home page.** `lib/search/refs.ts` imported `findStageFor` from `lib/search` (which imports
`fuse.js`). The 7-line function moved to `lib/search/find-stage.ts`; `lib/search/index.ts` imports it from there.

**Images.** The first certificate card image is `priority` (LCP candidate of `/products/technical-docs`).

### What was checked and left alone

| Item | Finding |
|---|---|
| framer-motion features | `MotionProvider` uses `LazyMotion strict` with a dynamic `import("@/lib/motion/features")`; no `motion.*` anywhere, all `m.*`. The `domMax` chunk (~50 kB raw) is referenced by 0 HTML files. |
| `components/story/*` | Scene code (`PipelineStory`, `PipelineChapter`, `geometry`) sits in one chunk referenced only by `/company/about` and `/company/mission-values`. `/company/onboarding` imports only `fittings.tsx` (1.5 kB of SVG glyphs). |
| `lucide-react` | Only named per-icon imports (several multi-line); no namespace import, no `icons` map. |
| `CommandPalette`, `CopilotPanel`, `ShortcutsHelp` | already `next/dynamic`, `ssr: false`. |
| Certificate lightbox | Static import from a Server Component page; 4 kB parsed on a route at 143 kB. `ssr: false` is not allowed in a Server Component, so a client wrapper would be needed for ~1.5 kB gzip. Left. |
| `MiniCalculatorButton` | 3.9 kB parsed in the `(app)` layout chunk, inside `TopBar` (a structural file this task does not name). Left. |
| `BatchCalculator`, admin editors | Primary content of their routes, not below the fold: lazy loading would only add a waterfall. Admin routes are at 100-172 kB. |
| `next/image` | Every `<Image>` (`ProductsCatalog` x2, `CertificateGrid`, `CertificateGallery`) has `sizes`. `priority` was on none; now only on the first certificate. Product grid images are not priority. |

## After 2026-09-21

Only rows whose First Load JS changed (every other route is identical to the baseline table):

| Route | Baseline | After |
|---|---:|---:|
| `/` | 237 kB | 226 kB |
| `/company/factory-tour` | 139 kB | 138 kB |
| `/company/internal-rules` | 139 kB | 138 kB |
| `/sales-process/scripts` | 248 kB | 235 kB |

Measured payload, same 49 pages: scripts **249 / 252 / 281 kB**, HTML **58 / 78 / 128 kB**. Every page's HTML is
**~32 kB smaller (uncompressed)** from message scoping; home goes 269 to 259 kB and scripts 280 to 265 kB of script
gzip from the fuse and Call Mode changes. Wire size depends on compression and was not measured.

## After 2026-09-22 (S05, owner namespacing and sign-out purge)

`components/providers/SessionProvider.tsx` now tells the client-side stores whose data they hold, so the `(app)`,
`(admin)` and `dashboard` layouts reach `lib/user-state/store.ts` (and through it `keys/merge/queue/prune/owner`)
from the layout chunk rather than only from the pages that call `useUserState`. Cost: **+1 to +3 kB First Load JS
on every operator route**, `+2 kB` on `/admin/scripts/[id]`.

| Route | Before | After |
|---|---:|---:|
| `/` | 226 kB | 229 kB |
| `/products` | 231 kB | 234 kB |
| `/sales-process/scripts` | 235 kB | 238 kB |
| `/sales-process/battle-cards/[slug]` | 223 kB | 225 kB |
| `/changelog` | 212 kB | 214 kB |
| `/company/onboarding` | 248 kB | 249 kB |
| `/faq`, `/standards/kpi-system`, `/standards/motivation-bonus` | 139-140 kB | 141-142 kB |
| `/admin/scripts/[id]` | 172 kB | 174 kB |
| every other operator route | 125-143 kB | 127-144 kB |

**Why it was not deferred to a dynamic import.** The purge has to stop uploads *synchronously* on the auth event:
`supabase.auth.onAuthStateChange` fires in every tab, and the pending `user_state` queue of the account that is
leaving would otherwise be uploadable under the next account's JWT during the tick an `await import(...)` costs
(the server takes the row's identity from the JWT, never from the payload). A statically linked
`stopUserStateSends()` is what closes that window. No route crossed 180 kB that was not already over it, and the
set of over-budget routes is unchanged at the same six.

## After 2026-09-22 (S06, content registry and typed action errors)

Manager routes only — every operator route is byte-identical to the S05 figures above, because nothing
in this change is reachable from the `(app)` layout and the new `admin.errors` / `admin.validation`
namespaces are added to the admin and dashboard providers, not to `ROOT_CLIENT_NAMESPACES`.

`hooks/useActionError.ts` (the code → copy mapping every admin write now goes through) and
`lib/admin/validation.ts` are imported by DataTable, EntityForm, ScriptEditor, SopEditor, VersionsList,
NotificationsInbox and the dashboard's QuickActionButton, so they land in the shared admin chunk rather
than in each page. That is why several **page** JS figures fall while **First Load** rises by 1-2 kB:

| Route | Before | After |
|---|---:|---:|
| `/admin/<section>` (all ten list pages) | 140 kB | 141 kB |
| `/admin/<section>/[id]` (seven EntityForm editors) | 149 kB | 151 kB |
| `/admin/scripts/[id]` | 174 kB | 175 kB |
| `/admin/sops/[id]` | 165 kB | 167 kB |
| `/admin/notifications` | 127 kB | 129 kB |
| `/admin/versions/[table]/[id]` | 126 kB | 128 kB |
| `/dashboard/content` | 137 kB | 139 kB |
| `/admin`, `/dashboard`, `/dashboard/quality` | 100 / 117 / 117 kB | unchanged |

`/admin/scripts/[id]` stays the largest manager route at 175 kB, still under the 180 kB budget; no route
crossed a budget it was not already over, and the over-budget set is unchanged.

**The RSC payload, not the bundle, is the point of this slice.** `lib/admin/queries.ts` used to `select("*")`
for every list, so each list page serialized whole rows into its RSC payload for a table that renders two
columns. `listRows(table)` now selects `id,status,version,updated_at,updated_by,sort_order` plus the registry
entry's `listColumns`. `/admin/scripts` is the extreme case: its rows carried `stages` and `stages_ru`, the
full stage tree of every script, to render a name. `tests/unit/admin/registry.test.ts` fails if either column
ever reappears in a list projection. Full rows are still one call away (`listFullRows`) for the two callers
that map them through `lib/content/db` — the publish gate's bundle and the script editor's link pickers.

## After 2026-09-23 (S11, uploaded product photos, migration 0018)

Measured against a production build of the commit before S11, same machine, same env:

| Route | Before | After |
|---|---:|---:|
| `/products` | 234 kB | 234 kB |
| `/products/technical-docs` | 143 kB | 144 kB |
| `/company/onboarding` | 249 kB | 250 kB |
| `/admin/<section>/[id]` (the eight EntityForm editors) | 151 kB | 166-167 kB |
| every other route | — | unchanged |

- **`/products`.** `ProductsCatalog` now resolves every photo through `productImageSrc` in
  `lib/content/products.ts` — the module that also holds the 28-product seed array. The first build of this
  change shipped that array to the browser (+2 kB First Load, the product names visible in the page chunk);
  the array is now built inside a `/* @__PURE__ */` IIFE, so a bundle that imports only the helpers drops it.
  `grep -rl rakor-naruzhnoy-rezboy .next/static/chunks` finds nothing. `clientEnv` (for the Storage URL) was
  already on the layout path through `SessionProvider`, so it costs nothing here.
- **`/products/technical-docs`, `/company/onboarding` (+1 kB each).** No new code: the module lists of the
  two page chunks show webpack's split-chunk grouping moving shared modules between them.
- **Admin editors (+15-16 kB in the table, manager only).** The "before" figure measured pages that could not
  render: every `EntityForm` editor passed its zod form schema from the Server Component page into the Client
  Component, and React refuses to serialize a class instance ("Only plain objects … can be passed to Client
  Components"). The editors are dynamic routes, so `next build` never renders them and the failure only showed
  at request time. Each editor now has a `"use client"` wrapper (`components/admin/<X>EditorForm.tsx`) that
  imports its schema and save action, so the pages reference zod's core (chunk `1351`, 11.7 kB gzip) and
  `lib/admin/schemas.ts`. Most of the table's increase is its own blind spot (see "Reading the route table"): the
  admin layout's `SessionProvider` already loads `1351` on every admin page, so the table now counts a chunk the
  browser was downloading anyway. What is really new per editor is about 2-3 kB gzip: the shared schemas module,
  and the `next/dynamic` runtime `EntityForm` uses to load the photo picker (`components/admin/ImageUploadField.tsx`)
  only on `/admin/products/[id]`. Every admin route stays under 180 kB; `/admin/scripts/[id]` (175 kB) is still the
  largest.

The over-budget set is unchanged at the same six operator routes.

## Dashboard queries (S09, migration 0016)

**Before.** Each dashboard tab ran one `select` of raw `telemetry_events` rows for the range plus the equal-length
previous range (up to 186 days), with no order, limit or pagination, and aggregated in the page. PostgREST caps a
response at `max-rows` (1000 by default), so once the window held more than 1000 events every number on the tab was
computed on an arbitrary subset, and nothing said so. The payload grew with activity: 1000 rows of 10 columns is
roughly 300-400 kB of JSON per render, all of it discarded after aggregation.

**After.** The pages call `public.dashboard_*` functions through `supabase.rpc` (`lib/dashboard/telemetry-window.ts`),
in parallel: Faollik makes 5 calls, Sifat 4 (plus the onboarding query), Kontent 1. Each returns aggregates only, so
the payload no longer depends on how busy the range was:

| Function | Rows returned | Measured JSON |
|---|---:|---:|
| `dashboard_kpis` | 1 | ~150 B |
| `dashboard_operator_activity` | one per active operator (~30) | ~4.6 kB |
| `dashboard_hourly` | 24 | ~0.9 kB |
| `dashboard_zero_result_searches` | <= `p_limit` (100) | a few kB at most |
| `dashboard_web_vitals` | one per metric (5) | < 0.5 kB |
| `dashboard_not_helpful` | <= `p_limit` (100) | a few kB at most |
| `dashboard_most_viewed` | <= `p_limit` (10) | ~0.9 kB |

Every ranked list is capped by `p_limit` in SQL, after ranking, so no response can reach `max-rows`.

**Measured latency.** Synthetic `telemetry_events`: 372 000 rows, 2 000 events a day for 186 days across 30
operators and 15 event types, `vacuum analyze`d. Median of 3 warm calls per function, measured in PGlite 0.5.8
(Postgres 18 compiled to WebAssembly, single-threaded, run in Node). It is a pessimistic stand-in: native Postgres on
Supabase is typically several times faster, so treat these as upper bounds and re-measure on staging.

| Function | 7-day range (14 k + 14 k rows) | 93-day range (186 k + 186 k rows) |
|---|---:|---:|
| `dashboard_kpis` (both windows) | 24 ms | 272 ms |
| `dashboard_operator_activity` | 32 ms | 513 ms |
| `dashboard_hourly` | 13 ms | 138 ms |
| `dashboard_zero_result_searches` | 5 ms | 51 ms |
| `dashboard_web_vitals` | 10 ms | 104 ms |
| `dashboard_not_helpful` | 5 ms | 59 ms |
| `dashboard_most_viewed` | 8 ms | 99 ms |

The calls of a tab run in parallel, so a tab's database wait is its slowest call: `dashboard_operator_activity` on
Faollik. The plans use index-only scans on the two covering indexes 0016 adds
(`telemetry_events_ts_cover_idx`, `telemetry_events_type_ts_cover_idx`); the first-seen row of each listed group is
fetched with one primary-key probe (`LATERAL … LIMIT 1`), not a join along the primary key.

**Bundle.** The error state (`components/dashboard/DashboardWidgetError.tsx`, a `WidgetFallback` with
`router.refresh()` as retry) moves `/dashboard` and `/dashboard/quality` from 117 kB to 133 kB in the route table;
`/dashboard/content` stays at 140 kB. The +16 kB is one chunk, next-intl's client runtime (`useTranslations`,
`NextIntlClientProvider`), which `dashboard/layout.tsx` already loads on every dashboard page: the table counts a
page's own entry chunks and not its layout's, so it now lists a chunk the browser was downloading anyway. Checked in
`.next/app-build-manifest.json`: beyond the layout's chunks, each page still loads only its own page chunk and the
one shared chunk it loaded before. Manager routes are outside the 180 kB operator budget either way.

**How to measure on staging.** In the SQL editor, impersonate a manager and time the call:

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"role":"authenticated","app_metadata":{"role":"manager"}}';
explain (analyze, buffers) select * from public.dashboard_operator_activity(now() - interval '7 days', now());
rollback;
```

`EXPLAIN` of a plpgsql function shows only the function scan; for the inner plan, paste the function's query with
literal bounds (the `with op_first as (…)` body) under the same role. In dev, the pages' `console.time` lines
(`[dashboard] Faollik render`, …) time the whole server render.

## Budgets

| Budget | Limit |
|---|---|
| Operator route First Load JS (`next build` table) | <= 180 kB |
| Client message payload | only allow-listed namespaces (`lib/i18n/client-messages.ts`), enforced by vitest |
| Modules mounted only after an interaction | `next/dynamic` when >= ~4 kB parsed or when they pull a dependency into first load |
| Dashboard data | aggregates only: no dashboard code path selects rows from `telemetry_events`; a new widget is a new SQL function with a case in `supabase/tests/dashboard-parity.sql` |
| Dashboard ranked lists | capped by `p_limit` (<= 1000, PostgREST's `max-rows`); the pages send 100 / 100 / 10 |
| Dashboard function latency (staging, native Postgres) | <= 300 ms per call at the default 7-day range; <= 2 s at the 93-day maximum — far inside the `authenticated` role's statement timeout (8 s on Supabase), which would turn an overrun into the widget's error state |

### Routes over 180 kB: none after S14 (baseline: 6 of 36 operator routes)

| Route | Baseline | After S16 | After S05 | After S14 |
|---|---:|---:|---:|---:|
| `/company/onboarding` | 248 kB | 248 kB | 249 kB | 180 kB |
| `/sales-process/scripts` | 248 kB | 235 kB | 238 kB | 170 kB |
| `/products` | 231 kB | 231 kB | 234 kB | 166 kB |
| `/` | 237 kB | 226 kB | 229 kB | 160 kB |
| `/sales-process/battle-cards/[slug]` | 223 kB | 223 kB | 225 kB | 156 kB |
| `/changelog` | 212 kB | 212 kB | 214 kB | 145 kB |

`/company/onboarding` reads 180 kB in the route table, which is rounded: it meets the `<= 180 kB` limit with no
headroom, so the next client import on that page needs a look at the table first.

**Why they were over.** All six import the per-user state store (`useUserState`: pins, favourites, onboarding
progress, scripts position, changelog read receipts), and `lib/user-state/store.ts` imported `lib/supabase/client`
statically, which put the Supabase browser client (~67-80 kB gzip) into every page's first-load JS. S14 removed
that (see below).

## After 2026-09-23 (S14, lazy Supabase client)

`lib/supabase/client-lazy.ts` exports `getSupabaseClient()`: one memoized `import("@/lib/supabase/client")`, one
shared client, and a failed chunk load is not cached (the next call retries). `SessionProvider`,
`lib/user-state/store.ts` and `lib/auth/sign-out.ts` use it instead of the static import; `lib/auth/purge.ts` only
reached the client through the store. Behaviour that had to survive, and how:

- **Owner guard (S05).** Every place that used the client already re-checked `owner` after its awaits. The client
  load is one more await, so `syncFromServer`, `pruneDaily` and the `send()` loop each re-check `owner` / `stopped`
  straight after `getSupabaseClient()` and before the request goes out. Nothing queued under one account can be
  uploaded because the chunk arrived late.
- **Purge.** `stopUserStateSends()` is synchronous and unchanged; `signOutAndPurge` still purges before it asks for
  the client, and revokes the session with it afterwards.
- **Singleton.** The store's module-level client is replaced by the loader's single promise.
- **SessionProvider.** The auth subscription now starts when the chunk arrives. `active` is checked after the load
  so an unmount in between leaves no listener, and the subscription is registered before `getSession()` so an auth
  event during the first read is not missed. Until then the provider is `loading`, as it already was on first paint.

`/login` (200 kB, public) still imports the client statically through `GoogleSignInButton`: it needs it to start
OAuth and is not an operator route.

Also in S14 (no bundle effect): the palette input is now a `combobox` (`CommandPalette`), the TopBar search is an
icon-only button below `sm`, the nav badge text and lock icon colours changed. See `docs/AUDIT.md` #9-#14.

## Open items

1. ~~Supabase browser client imported statically~~ - done in S14, see above. `/login` still imports it, by design.
2. `MiniCalculatorButton` and the certificate lightbox could be split (~1.5 kB gzip each) if a later task names `TopBar`.
3. LCP was not measured in a browser (operator routes need a Google OAuth session); the `priority` choice is by layout.
