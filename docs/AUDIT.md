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

### Open

| # | Severity | File | Rule | Finding | Proposed fix | Why not fixed here |
|---|---|---|---|---|---|---|
| 9 | P1 | [components/Sidebar.tsx:22-32](../components/Sidebar.tsx#L22-L32) | WCAG 1.4.3 | `NavCountBadge` renders 11px text in `text-status-ok` / `text-status-warning` on a 15% tint of the same colour. Composited over `--surface` in the **light** theme that is **2.92:1** (ok) and **2.00:1** (warning) — AA needs 4.5:1 for text this size. Light is the default theme. Dark is fine (5.04 / 6.07). axe reports this as `incomplete`, not a violation, because it cannot composite a semi-transparent fill. | Keep the tinted fill, put the number in `text-primary-dark` (≈10:1 in light, ≈12:1 in dark). No palette change needed. | `Sidebar.tsx` is a structural file; this task may touch it only for a11y attributes and focus management. |
| 10 | P1 | [components/TopBar.tsx:38-50](../components/TopBar.tsx#L38-L50) | §6 mobile | At 375px the search field is a `min-w-0 flex-1` child competing with four `shrink-0` control groups, so it shrinks to **0px wide**. The knowledge-base search — the one thing an operator needs mid-call — has no visible affordance on a phone. Finding 4 frees 8px, which is not enough to matter. | Below `sm`, render the search as an icon-only button (same `onOpenSearch`) and give the text field `sm:` and up. | Structural file, layout change. |
| 11 | P2 | [lib/content-type-icon.tsx](../lib/content-type-icon.tsx) via [components/Sidebar.tsx:145](../components/Sidebar.tsx#L145) | WCAG 1.4.11 | `LockIcon` in `text-status-warning` on `--surface` is **2.25:1** in the light theme; a meaningful graphic needs 3:1. The lock is the only indicator that a nav item is restricted. | `text-status-outdated` (3.71:1) or pair the icon with the existing `StatusLockBadge` text. | Call sites are in structural files; also touches the locked palette's intent. |
| 12 | P2 | [components/CommandPalette.tsx:284-296](../components/CommandPalette.tsx#L284-L296) | WCAG 4.1.2 | The palette is an arrow-navigable list of results, but the input is not a `combobox`: no `role`, `aria-expanded`, `aria-controls` or `aria-activedescendant`, and the list has no `listbox`/`option` roles. Sighted keyboard use is fine; a screen reader is never told the highlight moved. | Add the combobox/listbox roles and drive `aria-activedescendant` from the existing highlight index. | Bigger than a P1 fix; no automated rule catches it, so it is not a regression risk. |
| 13 | P2 | [components/FaqTab.tsx:91](../components/FaqTab.tsx#L91) | §6 | `text-5xl` for the decorative quote glyph is outside the project's font-size scale (`text-[11px]` … `text-[32px]`). | `text-[32px]`, or move the glyph to a `::before`-free span with an explicit size. | Cosmetic; changing it shifts the card's visual balance and belongs in a design-system task. |
| 14 | P3 | [components/TelemetryProvider.tsx:10](../components/TelemetryProvider.tsx#L10) | CLAUDE.md preamble | The comment cites `AGENTS.md`, which CLAUDE.md supersedes. | Point at `CLAUDE.md §6`. | Comment-only; batch with the next edit to that file. |
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
| Performance budgets | §4 | No route's First Load JS changed. The six operator routes over 180 kB are the same six already documented with a written reason in `docs/PERF.md` — none newly over. |
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
