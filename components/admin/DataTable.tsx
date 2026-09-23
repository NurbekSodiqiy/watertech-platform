"use client";

import { Suspense, useEffect, useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  GripVertical,
  ListOrdered,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { GateReportDialog } from "@/components/admin/GateReportDialog";
import { Dialog } from "@/components/ui/Dialog";
import type { EmptyStateKey } from "@/lib/empty-states";
import { formatRelative } from "@/lib/admin/format";
import { useMounted } from "@/hooks/useMounted";
import { useOnline } from "@/hooks/useOnline";
import { useToast } from "@/hooks/useToast";
import { useActionError } from "@/hooks/useActionError";
import { reorderRows } from "@/lib/admin/actions/reorder";
import {
  PAGE_SIZES,
  parseTableState,
  serializeTableState,
  type PageSize,
  type StatusTab,
  type TableState,
} from "@/lib/admin/table-state";
import type { ActionResult, ReferenceSummary } from "@/lib/admin/errors";
import type { RemoveOptions } from "@/lib/admin/actions/factory";
import type { StatusValue } from "@/lib/admin/actions/status";
import type { GateResult } from "@/lib/agents/publish-gate/types";
import type { DashboardTableName } from "@/lib/dashboard/content-health";

export interface AdminRow {
  id: string;
  status: StatusValue;
  version: number;
  updated_at: string;
  updated_by: string | null;
}

export interface AdminColumn<T> {
  key: keyof T & string;
  label: string;
  sortable?: boolean;
}

/** A row as a write identifies it: the id, and the version every write is
 * guarded on. */
interface RowRef {
  id: string;
  version: number;
}

export interface DataTableEmptyState {
  stateKey: EmptyStateKey;
  title: string;
  reason?: string;
  ctaLabel: string;
}

type BulkKind = "publish" | "draft" | "delete";

interface BulkRowResult {
  id: string;
  title: string;
  result: ActionResult;
}

export interface DataTableProps<T extends AdminRow> {
  rows: T[];
  columns: AdminColumn<T>[];
  editBase: string;
  table: DashboardTableName;
  /** Shown instead of the generic filter-empty state when `rows` itself is
   * empty (no records created yet, not just filtered down to nothing). */
  emptyState?: DataTableEmptyState;
  onDelete: (id: string, expectedVersion: number, options?: RemoveOptions) => Promise<ActionResult>;
  onToggleStatus: (id: string, next: StatusValue, expectedVersion: number) => Promise<ActionResult>;
}

/** Dense CRUD table for one admin section: status tabs, column-restricted
 * search, pagination, bulk actions, a reorder mode and per-row edit/duplicate/
 * delete — state (tab/query/sort/page) synced to the URL via
 * `history.replaceState` (CLAUDE.md §4: same-route params never go through
 * `router.push`). Wrapped in an internal `<Suspense>` because it reads
 * `useSearchParams()` but is dropped directly into 10 Server Component list
 * pages with no boundary of their own above it. */
export function DataTable<T extends AdminRow>(props: DataTableProps<T>) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl border border-border bg-surface" />}>
      <DataTableInner {...props} />
    </Suspense>
  );
}

function rowTitle<T extends AdminRow>(row: T, columns: AdminColumn<T>[]): string {
  const first = columns[0];
  return first ? String(row[first.key] ?? row.id) : row.id;
}

function DataTableInner<T extends AdminRow>({
  rows,
  columns,
  editBase,
  table,
  emptyState,
  onDelete,
  onToggleStatus,
}: DataTableProps<T>) {
  const router = useRouter();
  const mounted = useMounted();
  const online = useOnline();
  const { toast } = useToast();
  const describeError = useActionError();
  const t = useTranslations("toast");
  const tFilterEmpty = useTranslations("emptyState.filterNoMatch");
  const tTable = useTranslations("admin.table");
  const tCommon = useTranslations("common");
  const tFilter = useTranslations("common.table");
  const tRel = useTranslations("admin.relativeTime");
  const locale = useLocale();
  const searchParams = useSearchParams();

  const initial = useMemo(() => parseTableState(searchParams), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [tab, setTab] = useState<StatusTab>(initial.tab);
  const [query, setQuery] = useState(initial.query);
  const [sort, setSort] = useState<{ key: keyof T & string; dir: 1 | -1 } | null>(
    initial.sortKey ? { key: initial.sortKey as keyof T & string, dir: initial.sortDir } : null
  );
  const [page, setPage] = useState(initial.page);
  const [pageSize, setPageSize] = useState<PageSize>(initial.pageSize);

  useEffect(() => {
    const state: TableState = {
      tab,
      query,
      sortKey: sort?.key ?? null,
      sortDir: sort?.dir ?? 1,
      page,
      pageSize,
    };
    const qs = serializeTableState(state);
    window.history.replaceState(null, "", `${window.location.pathname}${qs}`);
  }, [tab, query, sort, page, pageSize]);

  // The row awaiting delete confirmation, with the version the delete is
  // guarded on — not just its id.
  const [confirmRow, setConfirmRow] = useState<{ id: string; version: number } | null>(null);
  // A delete the reference guard answered: the rows that point at this one
  // (or the children it would cascade to) and the row they are about.
  const [refused, setRefused] = useState<{ row: RowRef; references: ReferenceSummary[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  // A publish the gate blocked, with the row it was for (the dialog links to
  // its editor). Set either from a single-row publish or from the bulk panel.
  const [blocked, setBlocked] = useState<{ id: string; result: GateResult } | null>(null);

  // === Selection + bulk actions =====================================================
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState<BulkKind | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResults, setBulkResults] = useState<BulkRowResult[] | null>(null);

  // === Reorder mode ===================================================================
  const [reordering, setReordering] = useState(false);
  const [reorderOrder, setReorderOrder] = useState<T[]>([]);
  const [reorderSaving, setReorderSaving] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const counts = useMemo(
    () => ({
      all: rows.length,
      published: rows.filter((row) => row.status === "published").length,
      draft: rows.filter((row) => row.status === "draft").length,
    }),
    [rows]
  );

  const searchKeys = useMemo(() => ["id" as keyof T & string, ...columns.map((c) => c.key)], [columns]);

  const filtered = useMemo(() => {
    let out = tab === "all" ? rows : rows.filter((row) => row.status === tab);
    if (query) {
      const needle = query.toLowerCase();
      out = out.filter((row) => searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(needle)));
    }
    if (sort) {
      const { key, dir } = sort;
      out = [...out].sort((a, b) => String(a[key]).localeCompare(String(b[key])) * dir);
    }
    return out;
  }, [rows, tab, query, sort, searchKeys]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const clampedPage = Math.min(page, pageCount);
  useEffect(() => {
    if (clampedPage !== page) setPage(clampedPage);
  }, [clampedPage, page]);

  const paged = useMemo(
    () => filtered.slice((clampedPage - 1) * pageSize, clampedPage * pageSize),
    [filtered, clampedPage, pageSize]
  );

  const pageIds = useMemo(() => new Set(paged.map((row) => row.id)), [paged]);
  const allOnPageSelected = paged.length > 0 && paged.every((row) => selected.has(row.id));

  /** The refused delete as the dialog reads it: every referencing table's
   * titles in one list, and whether the database would cascade (a package
   * group's packages) or the reference simply blocks. */
  const refusal = useMemo(() => {
    const references = refused?.references ?? [];
    return {
      cascade: references.some((reference) => reference.mode === "cascade"),
      titles: references.flatMap((reference) => reference.titles),
      count: references.reduce((total, reference) => total + reference.count, 0),
    };
  }, [refused]);

  function toggleSort(key: keyof T & string) {
    setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
    setPage(1);
  }

  function changeTab(next: StatusTab) {
    setTab(next);
    setPage(1);
  }

  function changeQuery(next: string) {
    setQuery(next);
    setPage(1);
  }

  /** Offline is the one failure that never reaches a Server Action — saying
   * so beats a fetch error the manager has to interpret. */
  function guardOnline(): boolean {
    if (online) return true;
    toast({ kind: "error", title: t("offline") });
    return false;
  }

  function applyStatus(row: RowRef, next: StatusValue) {
    if (!guardOnline()) return;
    setPendingId(row.id);
    setError(null);
    startTransition(async () => {
      const result = await onToggleStatus(row.id, next, row.version);
      setPendingId(null);
      if (!result.ok) {
        const { title, isConflict } = describeError(result);
        setError(title);
        if (result.gate) setBlocked({ id: row.id, result: result.gate });
        toast({
          kind: "error",
          title: isConflict ? t("conflict") : title,
          action: isConflict ? { label: t("refresh"), onClick: () => router.refresh() } : undefined,
        });
        return;
      }
      setRefused(null);
      toast({ kind: "success", title: next === "published" ? t("published") : t("unpublished") });
      router.refresh();
    });
  }

  function handleToggleStatus(row: T) {
    applyStatus(row, row.status === "published" ? "draft" : "published");
  }

  /** One delete attempt. A `reference_in_use` answer is not an error the
   * manager can only read: it carries the rows involved, so it opens the
   * second dialog instead of a toast — "move to draft" for a reference that
   * blocks, "delete anyway" for one the database cascades. */
  function runDelete(row: RowRef, options?: RemoveOptions) {
    if (!guardOnline()) return;
    setPendingId(row.id);
    setError(null);
    startTransition(async () => {
      const result = await onDelete(row.id, row.version, options);
      setPendingId(null);
      setConfirmRow(null);
      if (!result.ok) {
        const { title, isConflict } = describeError(result);
        if (result.code === "reference_in_use" && result.references && result.references.length > 0) {
          setRefused({ row, references: result.references });
          return;
        }
        setError(title);
        setRefused(null);
        toast({
          kind: "error",
          title,
          action: isConflict ? { label: t("refresh"), onClick: () => router.refresh() } : undefined,
        });
        return;
      }
      setRefused(null);
      toast({ kind: "success", title: t("deleted") });
      router.refresh();
    });
  }

  // === Selection ======================================================================

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  }

  // === Bulk actions ====================================================================

  async function runBulk(kind: BulkKind, ids: string[]) {
    setBulkRunning(true);
    setBulkConfirm(null);
    const results: BulkRowResult[] = [];
    // Sequential, not Promise.all: each write is version-guarded and
    // gate-checked server-side, and a per-row result only makes sense read
    // off one write finishing before the next starts.
    for (const id of ids) {
      const row = rows.find((r) => r.id === id);
      if (!row) continue;
      const result: ActionResult =
        kind === "delete"
          ? await onDelete(row.id, row.version)
          : await onToggleStatus(row.id, kind === "publish" ? "published" : "draft", row.version);
      results.push({ id, title: rowTitle(row, columns), result });
    }
    setBulkRunning(false);
    setBulkResults(results);
    setSelected(new Set());
    router.refresh();
  }

  function requestBulk(kind: BulkKind) {
    if (!guardOnline()) return;
    if (selected.size === 0) return;
    if (kind === "delete") {
      setBulkConfirm("delete");
      return;
    }
    void runBulk(kind, [...selected]);
  }

  // === Reorder mode ====================================================================

  function enterReorderMode() {
    setReorderOrder(rows);
    setReorderError(null);
    setReordering(true);
  }

  function cancelReorder() {
    setReordering(false);
    setReorderOrder([]);
    setDragIndex(null);
  }

  function moveReorderRow(index: number, direction: -1 | 1) {
    setReorderOrder((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function dropReorderRow(index: number) {
    setReorderOrder((prev) => {
      if (dragIndex === null || dragIndex === index) return prev;
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDragIndex(null);
  }

  async function saveReorder() {
    if (!guardOnline()) return;
    setReorderError(null);
    setReorderSaving(true);
    const result = await reorderRows(
      table,
      reorderOrder.map((row) => row.id),
      reorderOrder.map((row) => row.version)
    );
    setReorderSaving(false);
    if (!result.ok) {
      const { title, isConflict } = describeError(result);
      setReorderError(title);
      toast({
        kind: "error",
        title: isConflict ? t("conflict") : title,
        action: isConflict ? { label: t("refresh"), onClick: () => router.refresh() } : undefined,
      });
      if (isConflict) {
        // The order the manager saw is stale — discard the local reorder
        // rather than silently keep showing an order the database refused.
        cancelReorder();
        router.refresh();
      }
      return;
    }
    toast({ kind: "success", title: tTable("orderSaved") });
    setReordering(false);
    setReorderOrder([]);
    router.refresh();
  }

  const tabOrder: StatusTab[] = ["all", "published", "draft"];

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-status-outdated/40 bg-status-outdated/10 px-4 py-2.5 text-[13px] text-primary-dark">
          {error}
        </div>
      )}

      {!reordering && (
        <>
          <div role="tablist" aria-label={tTable("statusTabsLabel")} className="flex flex-wrap items-center gap-1.5">
            {tabOrder.map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => changeTab(value)}
                className={`rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                  tab === value
                    ? "bg-primary text-on-accent"
                    : "border border-border bg-surface text-text-secondary hover:bg-surface-alt"
                }`}
              >
                {tTable(`statusTabs.${value}`)} <span className="opacity-80">({counts[value]})</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <input
                value={query}
                onChange={(e) => changeQuery(e.target.value)}
                placeholder={tFilter("filterPlaceholder")}
                className="w-full rounded-lg border border-border bg-surface-alt py-2 pl-8 pr-3 text-[13px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light"
              />
            </div>
            <button
              type="button"
              onClick={enterReorderMode}
              disabled={rows.length < 2}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt disabled:opacity-40"
            >
              <ListOrdered size={14} />
              {tTable("reorderMode")}
            </button>
            <Link
              href={`${editBase}/new`}
              className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-surface transition-colors hover:bg-accent-hover"
            >
              {tTable("add")}
            </Link>
          </div>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-2.5">
              <span className="text-[12.5px] font-medium text-primary-dark">
                {tTable("bulkSelected", { count: selected.size })}
              </span>
              <span className="flex-1" />
              <button
                type="button"
                onClick={() => requestBulk("publish")}
                disabled={bulkRunning}
                className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-primary-dark transition-colors hover:bg-surface-alt disabled:opacity-50"
              >
                {tTable("bulkPublish")}
              </button>
              <button
                type="button"
                onClick={() => requestBulk("draft")}
                disabled={bulkRunning}
                className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[12px] font-medium text-primary-dark transition-colors hover:bg-surface-alt disabled:opacity-50"
              >
                {tTable("bulkDraft")}
              </button>
              <button
                type="button"
                onClick={() => requestBulk("delete")}
                disabled={bulkRunning}
                className="rounded-lg border border-status-outdated/40 bg-surface px-2.5 py-1.5 text-[12px] font-medium text-status-outdated transition-colors hover:bg-status-outdated/10 disabled:opacity-50"
              >
                {tTable("bulkDelete")}
              </button>
            </div>
          )}
        </>
      )}

      {reordering && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-2.5">
          <span className="text-[12.5px] font-medium text-primary-dark">{tTable("reorderHint")}</span>
          {reorderError && <span className="text-[12.5px] text-status-outdated">{reorderError}</span>}
          <span className="flex-1" />
          <button
            type="button"
            onClick={cancelReorder}
            disabled={reorderSaving}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[12.5px] font-medium text-primary-dark transition-colors hover:bg-surface-alt disabled:opacity-50"
          >
            {tTable("cancelOrder")}
          </button>
          <button
            type="button"
            onClick={saveReorder}
            disabled={reorderSaving}
            className="rounded-lg bg-primary px-3 py-1.5 text-[12.5px] font-medium text-surface transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {reorderSaving ? tTable("savingOrder") : tTable("saveOrder")}
          </button>
        </div>
      )}

      {reordering ? (
        <ol className="space-y-1.5">
          {reorderOrder.map((row, index) => (
            <li
              key={row.id}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => dropReorderRow(index)}
              className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 shadow-soft"
            >
              <GripVertical size={14} className="shrink-0 cursor-grab text-text-secondary" aria-hidden="true" />
              <span className="flex-1 truncate text-[13px] text-primary-dark">{rowTitle(row, columns)}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  row.status === "published" ? "bg-status-ok/15 text-status-ok" : "bg-status-warning/15 text-status-warning"
                }`}
              >
                {row.status === "published" ? tTable("published") : tTable("draft")}
              </span>
              <button
                type="button"
                onClick={() => moveReorderRow(index, -1)}
                disabled={index === 0}
                aria-label={tTable("moveUp")}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-alt disabled:opacity-30"
              >
                <ChevronUp size={13} />
              </button>
              <button
                type="button"
                onClick={() => moveReorderRow(index, 1)}
                disabled={index === reorderOrder.length - 1}
                aria-label={tTable("moveDown")}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-alt disabled:opacity-30"
              >
                <ChevronDown size={13} />
              </button>
            </li>
          ))}
        </ol>
      ) : rows.length === 0 && emptyState ? (
        <EmptyState
          stateKey={emptyState.stateKey}
          title={emptyState.title}
          reason={emptyState.reason}
          action={{ label: emptyState.ctaLabel, href: `${editBase}/new` }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          variant="compact"
          title={tFilterEmpty("title")}
          reason={tFilterEmpty("reason")}
          action={{ label: tFilterEmpty("cta"), onClick: () => changeQuery("") }}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-soft">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-border bg-surface-alt/60">
                  <th className="w-9 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAllOnPage}
                      aria-label={tTable("selectAllOnPage")}
                      className="h-3.5 w-3.5 rounded border-border text-accent focus:outline-none focus:ring-2 focus:ring-primary-light"
                    />
                  </th>
                  {columns.map((col) => (
                    <th key={col.key} className="px-4 py-2.5 font-semibold text-primary-dark">
                      {col.sortable ? (
                        <button onClick={() => toggleSort(col.key)} className="flex items-center gap-1 hover:text-primary">
                          {col.label}
                          <ArrowUpDown size={11} className="opacity-60" />
                        </button>
                      ) : (
                        col.label
                      )}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 font-semibold text-primary-dark">{tTable("status")}</th>
                  <th className="px-4 py-2.5 font-semibold text-primary-dark">{tTable("updated")}</th>
                  <th className="px-4 py-2.5 font-semibold text-primary-dark">{tTable("updatedBy")}</th>
                  <th className="w-40 px-4 py-2.5 font-semibold text-primary-dark">{tTable("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((row) => (
                  <tr key={row.id} className="border-b border-border last:border-0 hover:bg-primary/5">
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        aria-label={tTable("selectRow", { title: rowTitle(row, columns) })}
                        className="h-3.5 w-3.5 rounded border-border text-accent focus:outline-none focus:ring-2 focus:ring-primary-light"
                      />
                    </td>
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-2.5 text-text-secondary">
                        {col === columns[0] ? (
                          <Link href={`${editBase}/${row.id}`} className="font-medium text-primary hover:underline">
                            {String(row[col.key] ?? "—")}
                          </Link>
                        ) : (
                          String(row[col.key] ?? "—")
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          row.status === "published"
                            ? "bg-status-ok/15 text-status-ok"
                            : "bg-status-warning/15 text-status-warning"
                        }`}
                      >
                        {row.status === "published" ? tTable("published") : tTable("draft")}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">
                      {mounted ? formatRelative(row.updated_at, tRel, locale) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-text-secondary">{row.updated_by ?? "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`${editBase}/${row.id}`}
                          aria-label={tCommon("edit")}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-alt hover:text-accent"
                        >
                          <Pencil size={13} />
                        </Link>
                        <Link
                          href={`${editBase}/new?from=${encodeURIComponent(row.id)}`}
                          aria-label={tTable("duplicate")}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-alt hover:text-accent"
                        >
                          <Copy size={13} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(row)}
                          disabled={pending && pendingId === row.id}
                          className="rounded-lg border border-border bg-surface px-2 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:bg-surface-alt hover:text-accent disabled:opacity-50"
                        >
                          {row.status === "published" ? tTable("makeDraft") : tTable("publish")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRow({ id: row.id, version: row.version })}
                          aria-label={tTable("delete")}
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary transition-colors hover:bg-status-outdated/10 hover:text-status-outdated"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-text-secondary">
            <label className="flex items-center gap-1.5">
              {tTable("rowsPerPage")}
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value) as PageSize);
                  setPage(1);
                }}
                className="rounded-md border border-border bg-surface-alt px-2 py-1 text-[12.5px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={clampedPage <= 1}
                aria-label={tTable("previousPage")}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-alt disabled:opacity-30"
              >
                <ChevronLeft size={13} />
              </button>
              <span>{tTable("pageOf", { page: clampedPage, total: pageCount })}</span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={clampedPage >= pageCount}
                aria-label={tTable("nextPage")}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-alt disabled:opacity-30"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmRow !== null}
        title={tTable("deleteTitle")}
        description={tTable("deleteDescription")}
        pending={pending && pendingId === confirmRow?.id}
        onConfirm={() => confirmRow && runDelete(confirmRow)}
        onCancel={() => setConfirmRow(null)}
      />

      <ConfirmDialog
        open={refused !== null}
        title={refusal.cascade ? tTable("cascadeTitle") : tTable("blockedTitle")}
        description={
          refusal.cascade
            ? tTable("cascadeDescription", { count: refusal.count })
            : tTable("blockedDescription", { count: refusal.count })
        }
        items={refusal.titles}
        itemsMore={
          refusal.count > refusal.titles.length
            ? tTable("referencesMore", { count: refusal.count - refusal.titles.length })
            : undefined
        }
        confirmLabel={refusal.cascade ? tTable("deleteAnyway") : tTable("setDraft")}
        tone={refusal.cascade ? "danger" : "primary"}
        secondary={
          refusal.cascade && refused
            ? { label: tTable("setDraft"), onClick: () => applyStatus(refused.row, "draft") }
            : undefined
        }
        pending={pending && pendingId === refused?.row.id}
        onConfirm={() => {
          if (!refused) return;
          if (refusal.cascade) runDelete(refused.row, { confirmCascade: true });
          else applyStatus(refused.row, "draft");
        }}
        onCancel={() => setRefused(null)}
      />

      <ConfirmDialog
        open={bulkConfirm !== null}
        title={tTable("bulkDeleteTitle")}
        description={tTable("bulkDeleteDescription", { count: selected.size })}
        pending={bulkRunning}
        onConfirm={() => bulkConfirm && void runBulk(bulkConfirm, [...selected])}
        onCancel={() => setBulkConfirm(null)}
      />

      <BulkResultPanel
        results={bulkResults}
        onClose={() => setBulkResults(null)}
        onViewGate={(id, result) => setBlocked({ id, result })}
        describeError={describeError}
      />

      <GateReportDialog
        result={blocked?.result ?? null}
        editHref={blocked ? `${editBase}/${blocked.id}` : undefined}
        onClose={() => setBlocked(null)}
      />
    </div>
  );
}

/** The sequential bulk run's outcome, one line per row: a plain check for a
 * success, the error title for a failure, referencing titles inline for a
 * `reference_in_use` row (same data ConfirmDialog's single-row refusal
 * reads, just listed rather than gated behind a second confirmation — a
 * mid-batch cascade confirmation per row would be more disruptive than
 * useful), and a link into the existing single-row GateReportDialog for a
 * gate-blocked row. */
function BulkResultPanel({
  results,
  onClose,
  onViewGate,
  describeError,
}: {
  results: BulkRowResult[] | null;
  onClose: () => void;
  onViewGate: (id: string, result: GateResult) => void;
  describeError: ReturnType<typeof useActionError>;
}) {
  const tTable = useTranslations("admin.table");
  const titleId = "bulk-result-title";

  return (
    <Dialog
      open={results !== null}
      onClose={onClose}
      labelledBy={titleId}
      panelClassName="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-surface shadow-soft"
    >
      <div className="flex items-center justify-between border-b border-border p-5">
        <p id={titleId} className="text-[14px] font-semibold text-primary-dark">
          {tTable("bulkResultTitle")}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label={tTable("bulkResultClose")}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-alt"
        >
          <X size={14} />
        </button>
      </div>
      <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-5">
        {(results ?? []).map((row) => {
          const failure = row.result.ok ? null : row.result;
          const gate = failure?.gate;
          return (
            <li key={row.id} className="rounded-xl border border-border bg-surface-alt/60 px-3 py-2">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${row.result.ok ? "bg-status-ok" : "bg-status-outdated"}`}
                  aria-hidden="true"
                />
                <span className="flex-1 truncate text-[12.5px] text-primary-dark">{row.title}</span>
                {gate && (
                  <button
                    type="button"
                    onClick={() => onViewGate(row.id, gate)}
                    className="shrink-0 rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-surface"
                  >
                    {tTable("bulkViewGate")}
                  </button>
                )}
              </div>
              {failure && (
                <p className="mt-1 text-[11.5px] text-status-outdated">{describeError(failure).title}</p>
              )}
              {failure?.references && failure.references.length > 0 && (
                <p className="mt-0.5 truncate text-[11px] text-text-secondary">
                  {failure.references.flatMap((r) => r.titles).join(", ")}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex justify-end border-t border-border p-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border px-3.5 py-2 text-[13px] font-medium text-primary-dark transition-colors hover:bg-surface-alt"
        >
          {tTable("bulkResultClose")}
        </button>
      </div>
    </Dialog>
  );
}
