# WaterTech Sales Knowledge Base

Internal sales knowledge base for WaterTech operators (Uzbekistan). See [CLAUDE.md](CLAUDE.md) for the
full architecture, folder map, and coding rules.

## Content pipeline

Content (scripts, objections, FAQs, competitor battle-cards, package tiers, product catalog) is authored
as typed TypeScript arrays in `lib/content/*.ts`, then flows to the app like this:

```
lib/content/*.ts (TS arrays)
  --> npm run seed:content            (supabase/seed/seed-content.ts, *ToRow mappers)
  --> content_* tables in Supabase    (RLS: authenticated read published rows, manager read/write all)
  --> lib/content/loader.ts getters   (unstable_cache, service-role client, filtered to status="published")
  --> Server Components / pages
```

- The TS arrays remain the source of truth for content authored by developers. `npm run seed:content`
  upserts every row (`onConflict: "id"`) — it never deletes rows, so content created later directly in
  Supabase (a future admin UI) survives a re-run.
- `sort_order` is set from each array's position at seed time, so the seeded DB renders pages in the same
  order the static arrays did.
- Every content table has `status` (`draft`/`published`), `version`, and a `content_versions` snapshot
  taken on every update (trigger `snapshot_content_version`) — infrastructure for a future admin CMS.
- Pages call the typed getters in `lib/content/loader.ts` (`getScripts()`, `getObjections()`, `getFaqs()`,
  `getCompetitors()`, `getPackageGroups()`, `getProducts()`, or `getContentBundle()` for all of the first
  five at once). Each getter is wrapped in `unstable_cache` tagged `"content"` plus its own
  `"content:<name>"` tag, `revalidate: 3600`.
- After writing to a `content_*` table (from a Route Handler / Server Action / future admin editor), call
  `revalidateContent()` from `lib/content/revalidate.ts` to clear the cache — `/api/search-index`'s own
  cache is tagged `"content"` too, so one call clears both.
- In development, `getContentBundle()` validates the fetched data against the zod schemas in
  `lib/content/schemas.ts` once per server lifetime, so a bad migration or malformed row surfaces
  immediately instead of reaching a page.

## Build requirements

`npm run build` statically prerenders operator pages, which read content through the loaders above —
**a reachable Supabase project with `SUPABASE_SERVICE_ROLE_KEY` set is required for a full build**, not
just for running the app.

The two `[slug]` routes that call `generateStaticParams` (`sales-process/scripts/[slug]`,
`sales-process/battle-cards/[slug]`) fall back to `[]` (rendering each page on demand instead, via
`dynamicParams = true`) when `SUPABASE_SERVICE_ROLE_KEY` is unset or the read throws — e.g. a fresh clone,
or CI with placeholder credentials. This keeps `npm run build` from failing on missing/unreachable
Supabase credentials for those two routes specifically.

This fallback does **not** cover every page: other content pages (`/sales-process/scripts`, `/faq`,
`/products`, `/sales-process/objections`, `/sales-process/battle-cards`, `/tools/calculator`,
`/dashboard`, …) fetch content directly (not through `generateStaticParams`) and are prerendered at build
time too — if Supabase is unreachable, those page builds fail. `.github/workflows/ci.yml` currently sets
placeholder (non-functional) Supabase env vars, so **CI's `npm run build` step needs a real, reachable
Supabase project's credentials as a secret** to succeed now that content lives in the database — a
placeholder URL is no longer sufficient.
