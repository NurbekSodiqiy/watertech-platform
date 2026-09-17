# Adding a content module

Checklist for a new content type (example kind: `guides`, table `content_guides`).
Complements CLAUDE.md §10 "How to add a page". Work top to bottom; each step compiles on its own.

## 1. Database

- [ ] `supabase/migrations/000N_content_guides.sql` (next free number):
  - `create table public.content_guides (...)` — domain columns, then the shared bookkeeping block
    copied from 0002: `status text not null default 'published' check (status in ('draft','published'))`,
    `sort_order int`, `version int`, `updated_at`, `updated_by text`, `created_at`.
  - Optional Russian twins as nullable `<field>_ru` columns (see 0004).
  - Triggers — reuse the loop pattern from 0002, with only the new table in the array:
    ```sql
    do $$ declare t text; begin
      foreach t in array array['content_guides'] loop
        execute format('create trigger trg_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
        execute format('create trigger trg_snapshot_version before update on public.%I for each row execute function public.snapshot_content_version()', t);
      end loop;
    end $$;
    ```
  - `alter table ... enable row level security;` + the five policies (authenticated select published,
    manager select all / insert / update / delete) copied from 0002.
  - GRANTs (RLS alone is not enough — see 0003): `select, insert, update, delete` to `authenticated`,
    `all` to `service_role`.
- [ ] Apply the migration, then `npm run gen:types` (needs `SUPABASE_PROJECT_ID`). Never hand-edit
      `lib/supabase/database.types.ts` if the CLI is available.

## 2. Content layer (`lib/content/`)

- [ ] `types.ts` — `export interface Guide { ... }` (camelCase, optional `*Ru` fields).
- [ ] `schemas.ts` — `guideSchema` (zod) and add it to `contentBundleSchema` if it joins the bundle.
- [ ] `db.ts`:
  - `export type GuideRow = Tables<"content_guides">;`
  - `rowToGuide(row: GuideRow): Guide` — narrow CHECK-constrained text with `narrowColumn`, JSONB with
    `schema.safeParse`; log and fall back, **never throw**.
  - `guideToRow(guide: Guide)` — blank `*Ru` via `ru()`, JSONB built from object literals.
- [ ] `loader.ts`:
  - `getGuidesCached = unstable_cache(fn, ["content:guides"], { tags: ["content", "content:guides"], revalidate: 3600 })`
    reading with `createAdminClient()` and `.eq("status", "published").order("sort_order")`; throw on error.
  - Locale resolution in a `localizeGuide` helper that strips the raw `*Ru` twins.
  - Public getter: `export function getGuides(locale: Locale = "uz") { return safeContent("guides", () => getGuidesCached(locale), []); }`
- [ ] `revalidate.ts` — add `"guides"` to `ContentKind`.
- [ ] Seed data: `lib/content/guides.ts` array (typed `Guide[]`), used only by the seed script.

## 3. Admin CMS

- [ ] `lib/admin/schemas.ts` — `guideWriteSchema = guideSchema.extend({ id: idSchema, status: statusSchema })`
      (+ a form schema if inputs differ from the domain shape).
- [ ] `lib/admin/actions/guides.ts` (`"use server"`): `upsertGuide`, `deleteGuide`, `setGuideStatus` —
      `requireManagerSession()` → zod parse → write with `updated_by: session.email` →
      `revalidateContent("guides")` → `actionErrorResult(e)` in `catch`.
- [ ] `lib/admin/actions/versions.ts`: add `content_guides: "guides"` to `RESTORABLE_TABLES`.
- [ ] `lib/admin/queries.ts`:
  - `export type AdminGuideRow = WithStatus<GuideRow>;` (narrow any extra CHECK columns too).
  - `listGuideRows()`, `getGuideRow(id)` with the session client (never cached).
  - Add `"content_guides"` to `CountableTable` and a `countRowsByStatus` card in `admin/page.tsx`.
- [ ] Pages under `app/[locale]/(admin)/admin/guides/`:
  - `page.tsx` — `DataTable<AdminGuideRow>` list.
  - `[id]/page.tsx` — edit form (`id === "new"` creates), link to `/admin/versions/content_guides/<id>`.
  - Add the table to `TABLE_INFO` in `admin/versions/[table]/[id]/page.tsx`.

## 4. Operator app

- [ ] Follow CLAUDE.md §10: `siteTree` node, Server Component page calling `getGuides(locale)`,
      interactive bits as client islands in `components/<domain>/`.
- [ ] Any client widget on the page that can crash independently → wrap at the usage site in
      `<WidgetBoundary>` (Server Component) or `<ErrorBoundary fallback={(reset) => …}>` (Client Component).
- [ ] Telemetry: new event types go through `TelemetryEventType` + `useTrack()` (CLAUDE.md §9).

## 5. Search

- [ ] If guides should be searchable: add them to `ContentBundle` / `getContentBundle`, then map them to
      `SearchDoc`s in `lib/search` `buildSearchDocs`. The `/api/search-index` cache is tagged
      `content`, so `revalidateContent("guides")` already refreshes it.

## 6. Seed

- [ ] `supabase/seed/seed-content.ts`: `const guideRows = guides.map((g, i) => ({ ...guideToRow(g), sort_order: i }))`
      and an `upsertTable(admin, "content_guides", guideRows)` call (parents before FK children).
- [ ] `npm run seed:content` against a dev project.

## 7. Tests

- [ ] `tests/unit/content/` — `rowToGuide` round-trips `guideToRow`; invalid JSONB/enum falls back
      without throwing.
- [ ] `guideSchema` accepts every seed entry (`guides.forEach((g) => guideSchema.parse(g))`).
- [ ] Admin write schema rejects a bad id / status.

## 8. Done

- [ ] `npm run typecheck && npm run lint && npm run build` pass; `npm test` passes.
- [ ] Light + dark, 375px + 1440px checked on the new operator and admin pages.
