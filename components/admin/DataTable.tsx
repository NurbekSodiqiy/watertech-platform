"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import { ArrowUpDown, Pencil, Search, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { GateReportDialog } from "@/components/admin/GateReportDialog";
import type { EmptyStateKey } from "@/lib/empty-states";
import { formatRelative } from "@/lib/admin/format";
import { useMounted } from "@/hooks/useMounted";
import { useOnline } from "@/hooks/useOnline";
import { useToast } from "@/hooks/useToast";
import { useActionError } from "@/hooks/useActionError";
import type { ActionResult, ReferenceSummary } from "@/lib/admin/errors";
import type { RemoveOptions } from "@/lib/admin/actions/factory";
import type { StatusValue } from "@/lib/admin/actions/status";
import type { GateResult } from "@/lib/agents/publish-gate/types";

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

/** Dense CRUD table for one admin section — DatabaseTemplate's look
 * (filter input, sortable columns, rounded-2xl bordered table) plus the
 * bookkeeping columns and row actions every content_* table carries
 * (status toggle, edit link, delete with confirmation). The first column is
 * always rendered as the edit link, same convention DatabaseTemplate uses
 * for its `linkBase` column. */
/** `stateKey` rather than the icon itself — see the matching comment on
 * DatabaseTemplate's DbEmptyState for why (Server Components can't pass a
 * component reference as a named prop across the RSC boundary). */
export interface DataTableEmptyState {
  stateKey: EmptyStateKey;
  title: string;
  reason?: string;
  ctaLabel: string;
}

export function DataTable<T extends AdminRow>({
  rows,
  columns,
  editBase,
  emptyState,
  onDelete,
  onToggleStatus,
}: {
  rows: T[];
  columns: AdminColumn<T>[];
  editBase: string;
  /** Shown instead of the generic filter-empty state when `rows` itself is
   * empty (no records created yet, not just filtered down to nothing). */
  emptyState?: DataTableEmptyState;
  /** Version-guarded like every other write — the row the manager saw is the
   * row that gets deleted, or nothing is. Answers `reference_in_use` when
   * other rows point at this one; `options.confirmCascade` is the second
   * confirmation for a delete the database cascades (a package group). */
  onDelete: (id: string, expectedVersion: number, options?: RemoveOptions) => Promise<ActionResult>;
  onToggleStatus: (id: string, next: StatusValue, expectedVersion: number) => Promise<ActionResult>;
}) {
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
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: keyof T & string; dir: 1 | -1 } | null>(null);
  // The row awaiting delete confirmation, with the version the delete is
  // guarded on — not just its id.
  const [confirmRow, setConfirmRow] = useState<{ id: string; version: number } | null>(null);
  // A delete the reference guard answered: the rows that point at this one
  // (or the children it would cascade to) and the row they are about.
  const [refused, setRefused] = useState<{ row: RowRef; references: ReferenceSummary[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);
  // A publish the gate blocked, with the row it was for (the dialog links to its editor).
  const [blocked, setBlocked] = useState<{ id: string; result: GateResult } | null>(null);

  const filtered = useMemo(() => {
    let out = rows.filter((row) =>
      query ? Object.values(row).some((v) => String(v).toLowerCase().includes(query.toLowerCase())) : true
    );
    if (sort) {
      const { key, dir } = sort;
      out = [...out].sort((a, b) => String(a[key]).localeCompare(String(b[key])) * dir);
    }
    return out;
  }, [rows, query, sort]);

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

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-status-outdated/40 bg-status-outdated/10 px-4 py-2.5 text-[13px] text-primary-dark">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tFilter("filterPlaceholder")}
            className="w-full rounded-lg border border-border bg-surface-alt py-2 pl-8 pr-3 text-[13px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light"
          />
        </div>
        <Link
          href={`${editBase}/new`}
          className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-surface transition-colors hover:bg-accent-hover"
        >
          {tTable("add")}
        </Link>
      </div>

      {rows.length === 0 && emptyState ? (
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
          action={{ label: tFilterEmpty("cta"), onClick: () => setQuery("") }}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-soft">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-border bg-surface-alt/60">
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
                <th className="w-32 px-4 py-2.5 font-semibold text-primary-dark">{tTable("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-0 hover:bg-primary/5">
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

      <GateReportDialog
        result={blocked?.result ?? null}
        editHref={blocked ? `${editBase}/${blocked.id}` : undefined}
        onClose={() => setBlocked(null)}
      />
    </div>
  );
}
