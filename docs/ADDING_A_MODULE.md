# Adding a content module

Checklist for a new content type (example kind: `guides`, table `content_guides`).
Complements CLAUDE.md §10 "How to add a page". Work top to bottom; each step compiles on its own.

**The short version:** the CMS side of a content module is *one entry in `lib/admin/registry.ts`*.
The create/update/delete/publish actions, the list and edit queries, the publish gate's row loader and
the cache tag all read that entry — there is no per-table copy of any of them to write. What is left
for you is the database, the content mappers, the pages, and the entry itself.

## 1. Database

- [ ] `supabase/migrations/000N_content_guides.sql` (next free number):
  - `create table public.content_guides (...)` — domain columns, then the shared bookkeeping block
    copied from 0002: `status text not null default 'draft' check (status in ('draft','published'))`,
    `sort_order int`, `version int`, `updated_at`, `updated_by text`, `created_at`.
  - Optional Russian twins as nullable `<field>_ru` columns (see 0004).
  - Triggers — reuse the loop pattern from 0002 + 0013, with only the new table in the array:
    ```sql
    do $$ declare t text; begin
      foreach t in array array['content_guides'] loop
        execute format('create trigger trg_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
        execute format('create trigger trg_stamp_content_actor before insert or update on public.%I for each row execute function public.stamp_content_actor()', t);
        execute format('create trigger trg_snapshot_version before update or delete on public.%I for each row execute function public.snapshot_content_version()', t);
      end loop;
    end $$;
    ```
  - `alter table ... enable row level security;` + the four policies from **0014** (one membership-gated
    `_member_select`, and `_manager_insert` / `_manager_update` / `_manager_delete` on
    `(select private.is_manager())`) — not the two-policy 0002 shape, which 0014 replaced.
  - GRANTs (RLS alone is not enough — see 0003): `select, insert, update, delete` to `authenticated`,
    `all` to `service_role`.
  - Add `'content_guides'` to the `allowed` array in `public.reorder_content_rows` (0015) — a
    `create or replace` of that function in your own migration, not an edit to 0015.
- [ ] Apply the migration, then `npm run gen:types` (needs `SUPABASE_PROJECT_ID`). Never hand-edit
      `lib/supabase/database.types.ts` if the CLI is available.

## 2. Content layer (`lib/content/`)

- [ ] `types.ts` — `export interface Guide { ... }` (camelCase, optional `*Ru` fields).
- [ ] `schemas.ts` — `guideSchema` (zod) and add it to `contentBundleSchema` if it joins the bundle.
- [ ] `db.ts`:
  - `export type GuideRow = Tables<"content_guides">;`
  - `rowToGuide(row: GuideRow): Guide` — narrow CHECK-constrained text with `narrowColumn`, JSONB with
    `schema.safeParse`; log and fall back, **never throw**.
  - `guideToRow(guide: Guide)` — blank `*Ru` via `ru()`, JSONB built from object literals. Its return
    type must be exactly the table's content columns (everything except `status`, `sort_order`,
    `version`, `created_at`, `updated_at`, `updated_by`); the registry's `ContentRow<T>` enforces that.
- [ ] `loader.ts`:
  - `getGuidesCached = unstable_cache(fn, ["content:guides"], { tags: ["content", "content:guides"], revalidate: 3600 })`
    reading with `createAdminClient()` and `.eq("status", "published").order("sort_order")`; throw on error.
  - Locale resolution in a `localizeGuide` helper that strips the raw `*Ru` twins.
  - Public getter: `export function getGuides(locale: Locale = "uz") { return safeContent("guides", () => getGuidesCached(locale), []); }`
- [ ] `revalidate.ts` — add `"guides"` to `ContentKind`.
- [ ] Seed data: `lib/content/guides.ts` array (typed `Guide[]`), used only by the seed script.

## 3. Admin CMS — the registry entry

- [ ] `lib/dashboard/content-health.ts` — add `"content_guides"` to `DashboardTableName`, to
      `DASHBOARD_TABLE_KIND`, and a `case` to `adminEditHref`. This is the key type the registry is
      keyed by, so everything below fails to compile until it is there.
- [ ] `lib/admin/schemas.ts` — `guideWriteSchema = guideSchema.extend({ id: idSchema, status: statusSchema, version: versionField })`
      (+ a `guideFormSchema` if the form's inputs differ from the domain shape). Validation messages in
      this file are **keys** from `VALIDATION_KEYS` (`"required"`, `"slug"`, …), never sentences — see §6.
- [ ] `lib/admin/registry.ts` — one `defineEntry` call, and one line in `GATE_TARGETS`:

      ```ts
      content_guides: defineEntry({
        table: "content_guides",
        kind: "guides",                       // ContentKind, the cache tag cleared after a write
        adminPath: "/admin/guides",           // must match adminEditHref; a test asserts it
        writeSchema: guideWriteSchema,
        toRow: guideToRow,
        listColumns: ["title", "category"],   // what the list view shows; keep big JSONB out
        titleColumn: "title",
        // listOrder       — only when `sort_order` is not the right order (see content_changelog)
        // staleColumn     — only when "old" is not "nobody edited it": the daily scan measures
        //                   `updated_at` unless the entry names another column (see content_changelog,
        //                   which is measured by `published_on`)
        // sortScopeColumn — only when rows are ordered inside a parent (see content_packages)
        // referenceCheck  — ids this row points at, with no DB-level foreign key
        // referencedBy    — rows that point at THIS one, for the delete guard: mode "block"
        //                   (the delete is refused and the dialog offers "move to draft") or
        //                   mode "cascade" (the database deletes them too, so the manager
        //                   confirms once, by name and count)
      }),
      ```

      `GATE_TARGETS` needs `content_guides: (row) => ({ table: "content_guides", row })`. It is the one
      place that pairs a table with its row type; the comment there says why it cannot be generic.
- [ ] `lib/admin/actions/guides.ts` (`"use server"`) — three thin wrappers, no bodies of their own:

      ```ts
      const guides = actionsFor(CONTENT_REGISTRY.content_guides);
      export async function upsertGuide(input: unknown) { return guides.save(input); }
      export async function deleteGuide(id: string, expectedVersion: number, options?: RemoveOptions) {
        return guides.remove(id, expectedVersion, options);
      }
      export async function setGuideStatus(id: string, status: StatusValue, expectedVersion: number) {
        return guides.setStatus(id, status, expectedVersion);
      }
      ```

      A Server Action reference has to be an exported async function, which is the only reason this file
      exists. Everything it does — `requireManagerSession()`, zod parse, reference check, publish gate,
      insert-or-version-guarded-update, `revalidateContent` — lives in `lib/admin/actions/factory.ts`.
- [ ] `lib/admin/queries.ts` — two one-line wrappers over the generic reads:
      `listGuideRows() → listRows("content_guides")` and `getGuideRow(id) → getRow("content_guides", id)`
      plus `withStatus`. Add a `toAdminGuide` narrowing helper only if the table has CHECK-constrained
      columns beyond `status`. Add `"content_guides"` to `OverviewTable` for the overview card.
- [ ] `lib/admin/actions/versions.ts`, `/admin/trash` and the daily content scan
      (`lib/agents/stale-scan.ts`) need nothing — all three read the registry. The trash list resolves a
      deleted row's title through the entry's `titleColumn`, a restore re-inserts it through the entry's
      own create path as a draft, and the scan sweeps every table in `CONTENT_REGISTRY`, so the new one
      joins the nightly stale / missing-RU sweep as soon as its entry exists.
- [ ] Pages under `app/[locale]/(admin)/admin/guides/`:
  - `page.tsx` — `DataTable<AdminListRow<"content_guides">>` list; pass `deleteGuide` and `setGuideStatus`
    straight through.
  - `[id]/page.tsx` — edit form (`id === "new"` creates), link to `/admin/versions/content_guides/<id>`.
    The page renders `components/admin/GuideEditorForm.tsx`, never `EntityForm` directly: a zod schema is
    a class instance, and React refuses to pass one from a Server Component into a Client Component. The
    wrapper is `"use client"`, imports `guideFormSchema` and `upsertGuide` itself, and takes only
    `defaultValues` and `fields` from the page — copy `FaqEditorForm.tsx`. `next build` does not catch a
    mistake here (editor pages are dynamic and never prerendered); it fails when the page is opened.
  - Add the table to `TABLE_INFO` in `admin/versions/[table]/[id]/page.tsx`.

## 4. Operator app

- [ ] Follow CLAUDE.md §10: `siteTree` node, Server Component page calling `getGuides(locale)`,
      interactive bits as client islands in `components/<domain>/`.
- [ ] `lib/content/loader.ts` — the getter comes in two, over one internal `readGuides(locale, mode)`:
      `getGuides()` for pages (a failed read throws, so a broken build never ships an empty page and ISR
      keeps the last good one) and `getGuidesOrEmpty()` for Route Handlers, the Copilot retriever and
      request-time manager renders (a failed read degrades to `[]`). Pick the one that matches what the
      caller renders — see `ContentReadMode` in `lib/content/safe.ts` and docs/TESTING.md.
- [ ] Any client widget on the page that can crash independently → wrap at the usage site in
      `<WidgetBoundary>` (Server Component) or `<ErrorBoundary fallback={(reset) => …}>` (Client Component).
- [ ] Telemetry: new event types go through `TelemetryEventType` + `useTrack()` (CLAUDE.md §9).

## 5. Search

- [ ] If guides should be searchable: add them to `ContentBundle` / `getContentBundle`, then map them to
      `SearchDoc`s in `lib/search` `buildSearchDocs`. The `/api/search-index` cache is tagged
      `content`, so `revalidateContent("guides")` already refreshes it.

## 6. Errors and copy

- [ ] Nothing in `lib/admin/**` returns a sentence. An action answers with an `AdminErrorCode`
      (`lib/admin/errors.ts`) and the client renders `admin.errors.<code>` through
      `hooks/useActionError.ts`. A database error goes to `console.error` via `logDbError` and no further.
- [ ] A new validation message is a new key in `VALIDATION_KEYS` (`lib/admin/validation.ts`) **and** in
      `admin.validation.*` in both `messages/uz.json` and `messages/ru.json`.
      `tests/unit/admin/messages.test.ts` fails otherwise.
- [ ] A new `AdminErrorCode` needs the same two message entries plus its case in that test's `ERROR_CODES`.

## 7. Seed

- [ ] `supabase/seed/seed-content.ts`: `const guideRows = guides.map((g, i) => ({ ...guideToRow(g), sort_order: i }))`
      and an `upsertTable(admin, "content_guides", guideRows)` call (parents before FK children).
- [ ] `npm run seed:content` against a dev project.

## 8. Tests

- [ ] `tests/unit/content/` — `rowToGuide` round-trips `guideToRow`; invalid JSONB/enum falls back
      without throwing.
- [ ] `guideSchema` accepts every seed entry (`guides.forEach((g) => guideSchema.parse(g))`).
- [ ] `tests/unit/admin/registry.test.ts` covers the new entry automatically (completeness, real column
      names, `adminEditHref` agreement) — run it and make sure it passes rather than adding a copy.
- [ ] Add a factory case to `tests/unit/admin/factory.test.ts` only for behaviour that is specific to this
      table (a `sortScopeColumn`, a `referenceCheck`); the shared paths are already covered. A new
      `referencedBy` belongs in `tests/unit/admin/references.test.ts` instead.

## 9. Done

- [ ] `npm run typecheck && npm run lint && npm run build` pass; `npm test` passes.
- [ ] Light + dark, 375px + 1440px checked on the new operator and admin pages.
