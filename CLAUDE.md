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
- Backend: **Supabase** (Postgres + Auth + RLS). Browser client via `@supabase/ssr`.
- Animation: **framer-motion only** (GSAP is being removed — never add it back).
- Search: `fuse.js` (client-side index, lazy).
- UI language: **Uzbek (Latin)**. Product names may be Russian. Code, comments, commit messages: English.

Commands:
```
npm run dev          # local dev (never judge performance in dev mode)
npm run build        # production build — MUST pass before a task is "done"
npm run start        # serve the production build
npm run lint         # eslint (next/core-web-vitals + next/typescript)
npm run typecheck    # tsc --noEmit   (add if missing: "typecheck": "tsc --noEmit")
```

## 2. Folder map — where things go

```
app/
  layout.tsx                 root: fonts, ThemeScript, providers only — no UI chrome
  (app)/                     operator app; layout.tsx mounts <AppShell>
    <section>/page.tsx       one route = one page.tsx; sections mirror lib/site-config.ts
    <section>/loading.tsx    section-specific skeleton (products, sales-process, dashboard)
  (admin)/admin/             manager CMS (own layout, never imports AppShell)  [planned]
  dashboard/                 manager telemetry (own layout)
  login/                     public
  api/<name>/route.ts        Route Handlers — auth check + zod validation inside, always
  auth/callback/route.ts     OAuth exchange
components/
  layout/                    AppShell, Sidebar, TopBar, PageTransition, CommandPalette, Logo
  ui/                        generic primitives: CopyButton, EmptyState, Breadcrumbs, badges, skeletons
  scripts/                   sales-script domain: SalesScriptsTab, ScriptTurns, CallModeOverlay, ObjectionChipRow…
  content/                   DocPageTemplate, PageRenderer, SectionLanding, DatabaseTemplate, BattleCardTemplate
  home/                      DailyTimeline, HomeGreeting
  products/                  CertificateGallery/Grid, product lightbox
  providers/                 SessionProvider, ClientNameContext, CertificateLightboxContext, ThemeScript, TelemetryProvider
  admin/                     CMS forms/editors  [planned]
lib/
  content/                   types.ts + data files + loader.ts (typed getters). Pages call getters, never arrays directly.
  supabase/                  client.ts (browser) · server.ts (RSC/route) · admin.ts (service role, SERVER ONLY)
  auth/                      claims helpers (role from JWT), route guards
  telemetry/                 client.ts (queue), types.ts, aggregate.ts (server)
  search/                    index.ts (lazy Fuse), normalize.ts
  security/                  rate-limit.ts, csp.ts
  env.ts                     zod-validated process.env — the ONLY place that reads process.env
  site-config.ts             navigation tree (siteTree), breadcrumbs
  types.ts                   cross-cutting UI types (NavNode, PageMeta)
hooks/                       useTrack, useNow, useMounted, useSessionUser…
supabase/
  migrations/*.sql           every schema change is a numbered migration file
  seed/                      seed scripts (content TS files are the seed source)
tests/                       vitest unit tests mirror lib/ paths; e2e/ for Playwright
public/products/             catalog images (never rename files — referenced by lib/content/products.ts)
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
- Do not call `cookies()` / `headers()` in `app/(app)/layout.tsx` or any shared operator layout — it
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

Every UI change must render correctly in **both themes** — check both before finishing.

Structural layout files (`AppShell`, `Sidebar`, `TopBar`, `PageTransition`) may be edited **only when
the task explicitly names the file**, and only structurally (sticky/scroll/loading/perf) — tokens,
spacing scale and the visual language stay identical.

Tailwind discipline: class order = layout → box → typography → color → state (`flex … rounded-2xl …
text-[13px] … bg-surface … hover:bg-primary/5`). Conditional classes via template literals with
explicit strings (Tailwind must see full class names — never build class names from fragments).

## 7. Supabase, auth & security rules

- `SUPABASE_SERVICE_ROLE_KEY` is server-only. `lib/supabase/admin.ts` is imported only from
  Route Handlers / Server Actions that need to bypass RLS, and the reason is written in a comment.
- Route Handlers and Server Actions: (1) verify session with `getClaims()`, (2) check role from
  `claims.app_metadata.role`, (3) validate body with zod, (4) cap sizes, (5) return typed JSON errors
  (`{ error: string }`) with proper status — in that order, always.
- Never trust client-supplied identity (email, role) in any payload.
- Every new table: RLS enabled, policies written in the migration, `updated_at`/`updated_by` columns.
- No `dangerouslySetInnerHTML` with content that can come from the database. Render structured data.
- Any new `<script>` needs the CSP nonce (`headers().get("x-nonce")` in the server component that renders it).
- Secrets and env: read only via `lib/env.ts`; never log env values; never commit `.env*`.

## 8. Content layer rules

- Content lives behind typed getters in `lib/content/loader.ts` (`getScripts()`, `getObjections()`,
  `getFaqs()`, `getCompetitors()`, `getPackageGroups()`, `getProducts()`). Pages and server components
  call getters; client components receive data via props. Never import the raw arrays into UI.
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
2. Create `app/(app)/<path>/page.tsx` as a **Server Component** using `DocPageTemplate` / `PageHeader`.
3. Data via `lib/content/loader.ts` getter. Interactive bits → small client island in `components/<domain>/`.
4. Add `export const metadata` (title in Uzbek).
5. Run `npm run typecheck && npm run lint && npm run build`. Open in light + dark. Console: 0 warnings.

## 11. Definition of Done (every task)

- [ ] `npm run typecheck`, `npm run lint`, `npm run build` all pass locally.
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