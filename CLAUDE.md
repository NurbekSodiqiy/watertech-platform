# CLAUDE.md — WaterTech Sales Knowledge Base

> This file is the single source of truth for any AI coding agent working in this repo.
> It supersedes `AGENTS.md` (delete that file or replace its contents with `@CLAUDE.md`).
> Read it fully before the first edit of every session. When a task conflicts with a rule
> here, **stop and flag the conflict** — do not improvise.

## 1. What this project is

Internal sales knowledge base for WaterTech operators (Uzbekistan). Operators read call scripts,
objection handling, product catalog, FAQ, competitor battle-cards; managers see a telemetry
dashboard. ~30 users, Google OAuth, allow-list based roles (`operator` | `manager`).

- Framework: **Next.js 14.2 App Router**, React 18, TypeScript `strict`, Tailwind 3.4.
- i18n: **next-intl 3.26** — `uz` (default) and `ru`, routed via `app/[locale]/…`. See §13.
- Backend: **Supabase** (Postgres + Auth + RLS). Browser client via `@supabase/ssr`.
- Animation: **framer-motion only** (GSAP is being removed — never add it back). See §14.
- Search: `fuse.js` (client-side index, lazy).
- PWA: **Serwist** (`app/sw.ts`). Error monitoring: **Sentry** (`sentry.*.config.ts`, `instrumentation.ts`).
- UI language: **Uzbek (Latin) and Russian** via next-intl, see §13. Product names may be Russian.
  Code, comments, commit messages: English.

Commands:
```
npm run dev          # local dev (never judge performance in dev mode)
npm run build        # production build — MUST pass before a task is "done"
npm run start        # serve the production build
npm run lint         # eslint (next/core-web-vitals + next/typescript)
npm run typecheck    # tsc --noEmit
npm run test         # vitest unit tests
npm run e2e          # Playwright end-to-end tests
npm run gen:types    # regenerate Supabase types (scripts/gen-types.sh)
npm run seed:content # seed Supabase content tables from lib/content/*.ts (supabase/seed/seed-content.ts)
```

## 2. Folder map — where things go

> **Target layout** — new files go into the folders below; existing flat files in `components/` move
> only in a task that explicitly says "reorganize" (then `git mv` and update every import). Most of
> `components/` is currently flat; the sub-folders that already exist (`layout/`, `ui/`, `scripts/`,
> `content/`, `products/`, `providers/`, `admin/`, `copilot/`, `dashboard/`, `tools/`) are real —
> everything else listed here is where new domain folders should land, not a claim that they exist yet.

```
app/
  layout.tsx                       root: fonts, ThemeScript, providers only — no UI chrome
  sw.ts                            Serwist service worker
  [locale]/                        next-intl locale segment (uz | ru) — see §13
    layout.tsx                     locale layout: unstable_setRequestLocale, NextIntlClientProvider
    (app)/                         operator app; layout.tsx mounts <AppShell>
      <section>/page.tsx           one route = one page.tsx; sections mirror lib/site-config.ts
      <section>/loading.tsx        section-specific skeleton (products, sales-process, dashboard)
    (admin)/admin/                 manager CMS (own layout, never imports AppShell)
    dashboard/                     manager telemetry (own layout)
    login/                         public
    offline/                      Serwist offline fallback
  api/
    <name>/route.ts                Route Handlers — auth check + zod validation inside, always
    copilot/                       operator copilot endpoint(s)
    cron/content-scan/             scheduled stale-content scanner
    search-index/                  search index endpoint
    events/                        telemetry event ingestion
  auth/callback/route.ts           OAuth exchange
components/
  layout/                          AppShell, Sidebar, TopBar, PageTransition, CommandPalette, Logo
  ui/                               generic primitives: CopyButton, EmptyState, Breadcrumbs, badges, skeletons
  scripts/                         sales-script domain: SalesScriptsTab, ScriptTurns, CallModeOverlay, ObjectionChipRow…
  content/                        DocPageTemplate, PageRenderer, SectionLanding, DatabaseTemplate, BattleCardTemplate
  home/                            DailyTimeline, HomeGreeting
  products/                       CertificateGallery/Grid, product lightbox
  providers/                       SessionProvider, ClientNameContext, CertificateLightboxContext, ThemeScript, TelemetryProvider
  admin/                           CMS forms/editors
  copilot/                        operator copilot UI
  dashboard/                       manager control-center widgets/KPIs
  motion/                          motion primitives — see §14
  story/                           scroll-storytelling scenes — see §14
lib/
  content/                        types.ts + seed data files + loader.ts (typed getters, incl. getContacts/getSops). Pages call getters, never arrays directly. No mock-data folder: every content kind lives in Supabase. safe.ts decides what a failed read does (§8).
  supabase/                        client.ts (browser) · client-lazy.ts (loads client.ts on demand, PERF.md S14) · server.ts (RSC/route) · admin.ts (service role, SERVER ONLY)
  auth/                            claims.ts (role from JWT), server-session.ts, sign-out.ts + purge.ts (shared-device purge, §7), ban.ts (Supabase Auth ban)
  user-state/                      per-user state store (pins, onboarding, read receipts); owner.ts namespaces every storage key per account
  telemetry/                       client.ts (queue), types.ts, aggregate.ts (server)
  search/                          index.ts (lazy Fuse), normalize.ts
  security/                        rate-limit.ts, durable-rate-limit.ts, csp.ts, middleware-matcher.ts (tested copy of the matcher literal, §7)
  admin/                           CMS domain logic. registry.ts is the single description of the
                                   10 content tables (schema, row mapper, list columns, admin path,
                                   cache tag); errors.ts the AdminErrorCode/ActionResult contract;
                                   validation.ts the zod error map + message keys; queries.ts the
                                   generic listRows/listFullRows/getRow; actions/factory.ts the
                                   create/update/remove/setStatus builder and actions/deps.ts what
                                   binds it to a real request. actions/*.ts are thin "use server"
                                   wrappers only — never a second copy of a write body. The three
                                   non-CRUD writes are dependency-injected the same way:
                                   actions/restore.ts (history + trash), actions/user-access.ts
                                   (allow-list), actions/product-image.ts (catalog photos).
  copilot/                         copilot prompt/response logic
  agents/                         copilot agent orchestration
  notifications/                  publish-gate / stale-content notifications inbox
  dashboard/                       KPI aggregation for the manager dashboard
  pwa/                             sw-routes.ts (runtime-cache rules + the sign-out purge list), sw-messages.ts
  motion/                          tokens.ts — durations, easings, spring presets; see §14
  i18n/                            small i18n helpers (e.g. strip-locale.ts) — routing lives in i18n/routing.ts, not here
  env.ts                           zod-validated process.env — the ONLY place that reads process.env
  site-config.ts                   navigation tree (siteTree), breadcrumbs
  types.ts                         cross-cutting UI types (NavNode, PageMeta)
i18n/
  routing.ts                       next-intl locales, default locale, Link/redirect/usePathname/useRouter — see §13
  request.ts                       next-intl request config (messages loading)
messages/
  uz.json, ru.json                 UI strings, one key set shared across both files — see §13
hooks/                             useTrack, useNow, useMounted, useSessionUser…
supabase/
  migrations/*.sql                 every schema change is a numbered migration file — apply order in docs/MIGRATIONS.md
  seed/                            seed scripts (content TS files are the seed source); guard.ts refuses production (§7)
  tests/*.sql                      SQL checks: rls, dashboard-parity, retention, storage, copilot (staging only,
                                   they write rolled-back fixtures); migration-status.sql (read-only, any project)
tests/
  unit/                            vitest unit tests mirror lib/ paths
  e2e/                             Playwright end-to-end tests
  fixtures/, stubs/                shared test fixtures and stubs
docs/
  ADDING_A_MODULE.md               how to add a new content/domain module
  TESTING.md                       how to run/extend the unit, e2e and SQL suites
  SECURITY.md                      the auth model and the owner's dashboard checklist
  MIGRATIONS.md                    apply order, per-migration runbooks, rollbacks
  PERF.md                          bundle budgets, measuring method, history
  AUDIT.md                         audit findings (Audit-2, S17): fixed, open, residual risk
public/products/                   catalog images (never rename files — referenced by lib/content/products.ts)
sentry.client.config.ts, sentry.server.config.ts, sentry.edge.config.ts
instrumentation.ts                 Sentry/Next instrumentation hook
```

Rules for placement:
- A **new** file goes into the mapped folder above. Existing flat files in `components/` may only be
  moved in a task that explicitly says "reorganize"; then use `git mv` and update every import.
- One component per file, named export, file name = component name (`PascalCase.tsx`). Hooks `useX.ts`.
  Non-component modules `kebab-case.ts`.
- No barrel `index.ts` re-export files (they defeat tree-shaking and confuse RSC boundaries).
- Never import from `app/**` into `components/**` or `lib/**` (pages are leaves). Shared code moves down.

## 3. Server vs Client Components — the boundary rules

Default is **Server Component**. Add `"use client"` only when the file needs:
state/effects, event handlers, browser APIs, `usePathname/useSearchParams/useRouter`, framer-motion,
context providers/consumers.

- Put `"use client"` on the **smallest leaf** that needs it, not on the page. A page composes server
  markup and passes data as props into small client islands.
- A Client Component must never import `@/lib/supabase/server`, `@/lib/supabase/admin`, `next/headers`,
  `fs`, or `lib/telemetry/aggregate.ts`.
- A Server Component must never import framer-motion, hooks, or anything from `components/providers`.
- Do not call `cookies()` / `headers()` in `app/[locale]/(app)/layout.tsx` or any shared operator layout — it
  forces every operator page dynamic and kills the router cache. Auth is enforced in `middleware.ts`;
  user display data comes from `SessionProvider` (client, from cookie session, no network).
- Heavy or rarely-used client modules (CommandPalette, Lightbox, CallModeOverlay, admin editors)
  load via `next/dynamic` with `{ ssr: false }` where they have no SSR value.
- `useSearchParams()` must be wrapped in `<Suspense>` (already done on the scripts page).

Hydration safety (hard rules):
- **Never call `new Date()`, `Math.random()`, `window`, `localStorage`, `navigator` during render** —
  including `useState(() => …)` initializers. Use `useNow()` / `useMounted()` / `useEffect`.
  Statically prerendered pages otherwise ship build-time values and hydrate with a mismatch.
- `suppressHydrationWarning` is allowed only on the `<html>` element (theme) and on a single text node
  whose content is intentionally time-dependent — never on containers.
- Read `localStorage` only inside `useEffect`; render a same-size placeholder before mount to avoid CLS.

## 4. Navigation & performance rules (this is a "60 fps, Apple-smooth" product)

- Changing **search params on the same route** → `window.history.pushState/replaceState` (Next ≥14.1
  keeps `useSearchParams` in sync). **Never** `router.push` for that — it triggers a server RSC fetch.
- Do not add exit animations to route transitions. Page transitions are enter-only (opacity/translateY,
  ≤150 ms). Never store `children` in state to "hold" a page.
- Animate only `transform` and `opacity`. No layout-affecting properties (width/height/top) in loops;
  the one exception is the sidebar width toggle (already exists).
- Respect `useReducedMotion()` in every animated component.
- No synchronous work > 2 ms per user event on the main thread: batch `localStorage` writes,
  `JSON.stringify` of large queues goes behind `requestIdleCallback`/debounce.
- Lists > 50 items: `React.memo` rows and stable keys (never array index as key for stateful rows).
- Images: `next/image` with explicit `sizes`; `priority` only on the LCP image of a page.
- Middleware must stay **network-free** on the hot path: JWT verified locally via `getClaims()`, role read
  from the JWT claim, no DB queries. If a task needs data in middleware, stop and ask.
- Keep operator pages statically prerenderable (no `dynamic = "force-dynamic"`, no `cookies()` in pages).
  Data that must be live goes through cached loaders (`unstable_cache` + tags) or client fetch.

### Performance budgets

Measured on a production build only (`npm run build`; `npm run analyze` for the bundle report — on Windows
`set ANALYZE=true&& next build`). Baselines, the measuring method and the exception list live in `docs/PERF.md`.

- **Operator routes: First Load JS ≤ 180 kB** (the `next build` route table). A route above it needs a written
  reason in `docs/PERF.md`; do not raise the number to make a route pass.
- **Client messages:** layouts give `NextIntlClientProvider` only the namespaces in `lib/i18n/client-messages.ts`
  (`pickMessages`). A new `useTranslations("x")` in a client component means adding `x` to that list — the vitest
  test in `tests/unit/i18n/client-messages.test.ts` fails otherwise. Never pass the full `getMessages()` result.
- **Lazy by default:** anything ≥ ~4 kB parsed that is only mounted after an interaction (dialogs, overlays,
  calculators, editors that are not the page's main content) loads via `next/dynamic` and, where the user will
  need it quickly, warms on idle with `scheduleIdle` (see `AppShell`, `ScriptsWorkspace`).
- **Keep heavy libraries out of shared paths:** a client module reachable from a layout or a page's first render must
  not statically import `fuse.js` (`lib/search/index.ts`) or `components/story/*`; import the small pure helper
  (`lib/search/find-stage.ts`, `lib/search/refs.ts`) instead. `lucide-react`: named per-icon imports only.
- Re-run the build and compare the route table with `docs/PERF.md` before merging a change that adds a dependency
  or a client-side import to a layout.

## 5. TypeScript rules

- `strict` stays on. No `any`, no `as unknown as`, no `!` non-null assertions except on
  `process.env` inside `lib/env.ts`. Use narrowing or zod.
- Every content/domain shape lives in `lib/content/types.ts` as an `interface`; every external input
  (API body, form, search params, env) is validated with **zod** and its type is `z.infer<>`.
- Props: inline type for ≤3 props, otherwise a named `XProps` interface above the component.
- Discriminated unions over boolean flags (`{ kind: "objection", … } | { kind: "faq" }`).
- Exported functions have explicit return types when they are part of a `lib/` public surface.
- Never duplicate a constant that exists as data elsewhere (e.g. counts, schedules). Derive it or import it.

## 6. Styling — DESIGN LOCK (never break, regardless of task)

The visual system is locked. You fill existing containers with content; you do not invent visuals.

Colors (light / dark) — the ONLY palette; they are CSS variables in `app/globals.css`, exposed as
Tailwind tokens in `tailwind.config.ts`:
```
--bg  #EDF3F9 / #121C30     --surface  #FFFFFF / #1B2740    --surface-alt  #F8FBFE / #202E4B
--border #DCE6F0 / #2A3B58  --text-primary #1E3A5F / #EFF4FA --text-secondary #5B7086 / #9FB2CC
--accent #3D5A80 / #7FA8D9  --accent-hover #2E4763 / #9DBEE6 --accent-soft, --status-ok/warning/outdated
--on-accent                 text/icon colour on a solid accent fill (never `text-white` on `bg-accent` —
                             it fails contrast in dark mode)
```
Use semantic classes only: `bg-background bg-surface bg-surface-alt border-border text-primary-dark
text-text-secondary bg-primary text-primary bg-accent text-accent text-status-ok …`.

Forbidden anywhere:
- Hardcoded hex/rgb, Tailwind default palette (`bg-blue-500`, `text-gray-700`, `bg-white`, `bg-black/40`
  → use `bg-primary-dark/40`), inline `style={{ color }}` (inline `style` for computed sizes/positions is fine).
- New CSS classes in `globals.css` or `<style>` tags in components, unless the task is explicitly about
  the design system.
- New card styles, radii, shadows, font sizes outside the existing scale
  (`text-[11px] [12px] [12.5px] [13px] [13.5px] [14px] [15px] [18px] [20px] [24px] [28px] [32px]`,
  radii `rounded-lg xl 2xl`, shadows `shadow-soft softer sm lg`).
- Changing the light/dark mechanism (`ThemeScript` + `class="dark"` + `watertech-theme` key).

Exception: files under `components/story/**` and `components/motion/**` may introduce new visual
language (SVG line art, scroll scenes) as long as they use only the palette tokens above — no new
hardcoded colors. A task that explicitly names the design system may add CSS variables to
`app/globals.css`.

Every UI change must render correctly in **both themes** — check both before finishing.

Structural layout files (`AppShell`, `Sidebar`, `TopBar`, `PageTransition`) may be edited **only when
the task explicitly names the file**, and only structurally (sticky/scroll/loading/perf) — tokens,
spacing scale and the visual language stay identical.

Tailwind discipline: class order = layout → box → typography → color → state (`flex … rounded-2xl …
text-[13px] … bg-surface … hover:bg-primary/5`). Conditional classes via template literals with
explicit strings (Tailwind must see full class names — never build class names from fragments).

## 7. Supabase, auth & security rules

The auth model and the owner's dashboard steps are in [docs/SECURITY.md](docs/SECURITY.md); the
migration apply order and runbooks in [docs/MIGRATIONS.md](docs/MIGRATIONS.md); what the last audit
found, fixed and left open in [docs/AUDIT.md](docs/AUDIT.md).

- **Auth model — four layers, each refusing on its own.** (1) The Custom Access Token hook (0014) issues
  a token only for an active `allowed_users` row and stamps `app_metadata.role` (`operator` | `manager`);
  it is inert until enabled in the Supabase dashboard. (2) `middleware.ts` reads that role off the
  locally verified JWT and confines each role to its own area. (3) RLS decides rows, through
  `private.is_member()` / `private.is_manager()` only — never inline `auth.jwt() -> 'app_metadata'` in a
  new policy. (4) Server code re-checks: `getServerSession()` in Route Handlers,
  `requireManagerSession()` first in every admin Server Action. A new data-returning SQL function is
  SECURITY INVOKER and refuses a non-manager itself (`WT403`), or is granted to `service_role` only.
- **Middleware matcher.** It may exclude only real static files: the three `public/` folders
  (`certificates/`, `icons/`, `products/`) by file extension, and `sw.js`, `manifest.webmanifest`,
  `favicon.ico` exactly (anchored with `$`), besides `api/`, `auth/callback`, `monitoring`, `_next/*`.
  Never an unscoped extension or an unanchored prefix — that let any `/<route>/<slug>.json` skip the auth
  gate (Audit-2 F1). A new `public/` folder changes `middleware.ts`, `lib/security/middleware-matcher.ts`
  and `tests/unit/security/middleware-matcher.test.ts` together; the parity test enforces the first two.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. `lib/supabase/admin.ts` is imported only from
  Route Handlers / Server Actions that need to bypass RLS, and the reason is written in a comment.
- Route Handlers and Server Actions: (1) verify session with `getClaims()`, (2) check role from
  `claims.app_metadata.role`, (3) validate body with zod, (4) cap sizes, (5) return typed JSON errors
  (`{ error: string }`) with proper status — in that order, always.
- Never trust client-supplied identity (email, role) in any payload.
- Admin Server Actions return an `AdminErrorCode`, never a sentence and never a database message
  (`lib/admin/errors.ts`: `ActionResult = { ok: true } | { ok: false; code; gate?; field?; details?;
  references? }`). The codes: `unauthorized`, `validation`, `id_taken`, `version_conflict`,
  `gate_blocked`, `not_found`, `reference_in_use`, `email_taken`, `last_manager`, `self_change`,
  `auth_sync_failed`, `unknown`. A Postgres error is read once, logged with `logDbError`, and collapsed
  into a code — its message, hint and constraint names stay on the server. Database-raised states map
  by SQLSTATE, never by message: `23505` → `id_taken` / `email_taken`, `23503` → `reference_in_use`,
  `23514` / `WT400` → `validation`, `WT403` / `42501` → `unauthorized`, `WT409` → `version_conflict`, `WT460` →
  `last_manager`, `WT461` → `self_change`. The client turns the code into copy through
  `hooks/useActionError.ts` and `admin.errors.<code>`; a new code needs both message files (§13) —
  `tests/unit/admin/messages.test.ts` fails otherwise.
- Every argument of a Server Action is browser input, whatever its TS type: parse it with zod (an id with
  `idSchema`, a version as a non-negative integer) before it reaches the publish gate or a query.
- **Publish gate.** Every path that can make a row `published` runs `lib/agents/publish-gate` first and
  writes nothing when it blocks: create/update when saved as published (on the candidate), `setStatus`
  and so bulk publish (on the stored row), a version restore onto a published row (on the merged
  candidate), the dashboard's quick publish. A restore from the trash always comes back as a draft.
- A content write goes through `contentActions()` (`lib/admin/actions/factory.ts`) and its registry
  entry, with the RLS-scoped session client — never the service role. Creating uses `.insert()` so a
  taken id fails as `id_taken` instead of overwriting a live row; updating and deleting are guarded on
  the row's `version`. Do not hand-write a new upsert/delete body for a content table.
- Every new table: RLS enabled, policies written in the migration, `updated_at`/`updated_by` columns,
  and explicit `GRANT`s (RLS alone grants nothing here — 0003). Every schema change is a **new** numbered
  file, never an edit to one that ran anywhere; after any policy or grant change,
  `supabase/tests/rls-checks.sql` runs on **staging** (never production — it writes rolled-back
  fixtures). `supabase/tests/migration-status.sql` is read-only and says which files a project has had.
- **Shared devices.** Operators share PCs, so sign-out is a purge (`lib/auth/sign-out.ts` →
  `lib/auth/purge.ts`): uploads and telemetry stop synchronously, the leaving owner's localStorage keys,
  all of sessionStorage and the telemetry buffer go, the service worker deletes its user caches, the
  session is revoked, and a hard navigation replaces the page; another tab's sign-out or account switch
  runs the same purge (`SessionProvider`). So: any new persisted client state uses an owner-namespaced
  key (`lib/user-state/owner.ts`) or is added to `purgeableStorageKeys`; any new service-worker runtime
  cache is listed in `PURGED_CACHE_NAMES` or `KEPT_CACHE_NAMES` (`lib/pwa/sw-routes.ts`, exact names);
  a session-bound GET is `NetworkOnly`. UI preferences (theme, sidebar) are the only un-namespaced keys.
- No `dangerouslySetInnerHTML` with content that can come from the database. Render structured data.
- Any new `<script>` needs the CSP nonce (`headers().get("x-nonce")` in the server component that renders it).
- Secrets and env: read only via `lib/env.ts`; never log env values; never commit `.env*`.
  One exception, and only this one: `supabase/seed/seed-content.ts` and `supabase/seed/guard.ts` read
  `SEED_TARGET`, `PROD_PROJECT_REFS` and `NEXT_PUBLIC_SUPABASE_URL` from `process.env` directly. The
  seed is a developer CLI, not app runtime — it never ships in a bundle, and those variables only
  describe the machine running the command. Nothing under `app/`, `components/` or `lib/` may copy it.
- **Seed rules** (`npm run seed:content`, `supabase/seed/guard.ts`): it runs only with
  `SEED_TARGET=staging`, never against a ref listed in `PROD_PROJECT_REFS` (required for a hosted
  project) and never against an unrecognised host; it is insert-only (existing rows, `status` included,
  stay as managers saved them) unless `--force`; run `--dry-run` first. Production content is entered
  through `/admin`. Never run the seed, a SQL check file or anything else that writes against production.

## 8. Content layer rules

- Content lives behind typed getters in `lib/content/loader.ts` (`getScripts()`, `getObjections()`,
  `getFaqs()`, `getCompetitors()`, `getPackageGroups()`, `getProducts()`). Pages and server components
  call getters; client components receive data via props. Never import the raw arrays into UI.
- **A failed content read** (`lib/content/safe.ts`) depends on who reads. Pages use the throwing
  getters (`"page"` mode): `ContentUnavailableError` fails `next build` and keeps the last good ISR page
  instead of publishing an empty knowledge base. Route Handlers, the Copilot retriever and the manager
  dashboard use the `…OrEmpty` getters (`"degrade"` mode: log `[content:<kind>]`, return empty).
  `CONTENT_BUILD_MODE=allow-empty` exists for CI's placeholder project only — never in Vercel, production
  or `.env.local`; an unreadable value means `strict`.
- The loaders read with the service role, which RLS does not restrict, so each one filters
  `status = 'published'` itself; a new getter must too. Drafts reach the admin only, through the
  RLS-scoped session client (`lib/admin/queries.ts`).
- Business numbers (discount %, advance %) are numeric fields, never parsed from prose.
- IDs are stable slugs (`obj-qimmat`, `lead-orqali-tushgan`); telemetry references them — never rename
  an id without a migration note.
- Uzbek copy must keep the apostrophe convention used in the file you edit (`o'`, `g'` with `'`).

## 9. Telemetry rules

- Fire events only through `useTrack()` (client) — never call `fetch("/api/events")` directly.
- New event types: add to `TelemetryEventType` union, document the `meta` shape in `types.ts`, and
  extend `aggregate.ts` if the dashboard should show it. Keep `meta` ≤ 500 bytes.

## 10. How to add a page (checklist)

1. Add the node to `lib/site-config.ts` `siteTree` (title, path, contentType, description).
2. Create `app/[locale]/(app)/<path>/page.tsx` as a **Server Component** using `DocPageTemplate` / `PageHeader`.
3. Data via `lib/content/loader.ts` getter. Interactive bits → small client island in `components/<domain>/`.
4. Add `export const metadata` and page copy strings via next-intl (both `messages/uz.json` and
   `messages/ru.json` — see §13).
5. Run `npm run typecheck && npm run lint && npm run test && npm run build`. Open in light + dark. Console: 0 warnings.

## 11. Definition of Done (every task)

- [ ] `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` all pass locally.
- [ ] No hydration warnings, no React key warnings, no console errors on the touched pages.
- [ ] Both themes verified. Mobile (375px) and desktop (1440px) verified for UI changes.
- [ ] No new dependency unless the task explicitly allows it; if allowed, pin a version and explain why.
- [ ] Touched files only — no drive-by reformatting, renaming, or "while I'm here" refactors.
- [ ] Summary at the end: files changed, why, how to verify, anything left open.

## 12. Working style for the agent

- Read the files the task names, plus their direct imports. Do not read the whole repo.
- Prefer editing over rewriting; preserve existing comments that still hold.
- If a rule here blocks the task, or a needed detail is missing, **stop and ask one precise question**.
  Do not guess at design decisions, data models, or auth semantics.
- Commit message style: `type(scope): summary` (`perf(middleware): verify JWT locally via getClaims`).

## 13. i18n rules

- Every user-visible string goes through **next-intl**. Server Components call
  `unstable_setRequestLocale(locale)` (already done in `app/[locale]/layout.tsx`) then
  `getTranslations()`. Client Components use `useTranslations()`.
- A new key is added to **both** `messages/uz.json` and `messages/ru.json` in the same commit. Key
  parity between the two files is a hard rule — never add a key to one and not the other.
- Long-form page copy lives under the `pages.<section>.<page>` namespace; shared chrome (nav, header,
  buttons, common labels) lives under the existing shared namespaces — don't invent a new top-level
  namespace for copy that belongs in an existing one.
- Navigation uses `Link` / `useRouter` / `usePathname` from `@/i18n/routing` (see `i18n/routing.ts`),
  never `next/link` or `next/navigation` directly, anywhere in operator UI.
- `aria-label`, `title`, `placeholder`, and toast text are user-visible strings — they go through
  next-intl too, not hardcoded.
- Content-layer data (products, scripts, objections, etc.) uses the existing `*_ru` column pattern
  (see `supabase/migrations/0004_content_ru_columns.sql` and the locale-fallback logic in
  `lib/content/loader.ts`). Do not invent a second localization pattern for content data — that's
  next-intl's job only for UI copy, not for database content rows.

## 14. Motion system

- **framer-motion only.** GSAP, Lenis, locomotive-scroll, and any smooth-scroll or scroll-jacking
  library are forbidden. Never call `preventDefault()` on a wheel/touch event, and never animate the
  window's scroll position programmatically.
- Tokens (durations, easings, spring presets) live in `lib/motion/tokens.ts`. Components import the
  tokens; no inline magic numbers for `duration` / `ease`.
- Motion primitives live in `components/motion/`. Scroll-storytelling scenes live in
  `components/story/`.
- Scroll-linked animation uses motion values only: `useScroll` → `useTransform`/`useSpring`. Never a
  scroll event listener that calls `setState` per frame.
- Allowed animated properties: `transform`, `opacity`, and for SVG line art `pathLength` /
  `stroke-dashoffset`. No filters, no blur, no box-shadow animation, no animating layout properties.
- Reduced motion: render the final state statically — call `useReducedMotion()` and skip the animated
  path entirely. Content must never depend on an animation to become visible or readable; with JS
  disabled, all content is present in normal DOM order.
- Budget: at most one orchestrated scroll scene per page. Everything else is motion that answers a
  user action (open, expand, copy, select) — no generic fade-up on every section.
- Operator work pages (scripts, objections, FAQ, products, calculator, call mode) never get scroll
  scenes — only ≤200 ms response motion. Scroll storytelling is reserved for `/company/*` and
  empty/onboarding states.