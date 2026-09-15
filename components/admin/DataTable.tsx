"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpDown, Pencil, Search, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { formatRelativeUz } from "@/lib/admin/format";
import { useMounted } from "@/hooks/useMounted";
import type { ActionResult } from "@/lib/admin/actions/guard";
import type { StatusValue } from "@/lib/admin/actions/status";

export interface AdminRow {
  id: string;
  status: StatusValue;
  updated_at: string;
  updated_by: string | null;
}

export interface AdminColumn<T> {
  key: keyof T & string;
  label: string;
  sortable?: boolean;
}

/** Dense CRUD table for one admin section — DatabaseTemplate's look
 * (filter input, sortable columns, rounded-2xl bordered table) plus the
 * bookkeeping columns and row actions every content_* table carries
 * (status toggle, edit link, delete with confirmation). The first column is
 * always rendered as the edit link, same convention DatabaseTemplate uses
 * for its `linkBase` column. */
export function DataTable<T extends AdminRow>({
  rows,
  columns,
  editBase,
  emptyTitle,
  onDelete,
  onToggleStatus,
}: {
  rows: T[];
  columns: AdminColumn<T>[];
  editBase: string;
  emptyTitle?: string;
  onDelete: (id: string) => Promise<ActionResult>;
  onToggleStatus: (id: string, next: StatusValue) => Promise<ActionResult>;
}) {
  const router = useRouter();
  const mounted = useMounted();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: keyof T & string; dir: 1 | -1 } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

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

  function toggleSort(key: keyof T & string) {
    setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
  }

  function handleToggleStatus(row: T) {
    const next: StatusValue = row.status === "published" ? "draft" : "published";
    setPendingId(row.id);
    setError(null);
    startTransition(async () => {
      const result = await onToggleStatus(row.id, next);
      setPendingId(null);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    if (!confirmId) return;
    const id = confirmId;
    setPendingId(id);
    setError(null);
    startTransition(async () => {
      const result = await onDelete(id);
      setPendingId(null);
      setConfirmId(null);
      if (!result.ok) setError(result.error);
      else router.refresh();
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
            placeholder="Qatorlarni filtrlash…"
            className="w-full rounded-lg border border-border bg-surface-alt py-2 pl-8 pr-3 text-[13px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light"
          />
        </div>
        <Link
          href={`${editBase}/new`}
          className="shrink-0 rounded-lg bg-primary px-3.5 py-2 text-[13px] font-medium text-surface transition-colors hover:bg-accent-hover"
        >
          + Qo&apos;shish
        </Link>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={emptyTitle ?? "Mos qator topilmadi"}
          description="Filtrlarni tozalab ko'ring yoki yangi yozuv qo'shing."
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
                <th className="px-4 py-2.5 font-semibold text-primary-dark">Holat</th>
                <th className="px-4 py-2.5 font-semibold text-primary-dark">Yangilangan</th>
                <th className="px-4 py-2.5 font-semibold text-primary-dark">Kim tomonidan</th>
                <th className="w-32 px-4 py-2.5 font-semibold text-primary-dark">Amallar</th>
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
                      {row.status === "published" ? "Nashr etilgan" : "Qoralama"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary">
                    {mounted ? formatRelativeUz(row.updated_at) : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary">{row.updated_by ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`${editBase}/${row.id}`}
                        aria-label="Tahrirlash"
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
                        {row.status === "published" ? "Qoralama" : "Nashr"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(row.id)}
                        aria-label="O'chirish"
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
        open={confirmId !== null}
        title="Yozuvni o'chirish"
        description="Bu amalni ortga qaytarib bo'lmaydi. Yozuv butunlay o'chiriladi."
        pending={pending && pendingId === confirmId}
        onConfirm={handleDelete}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}
