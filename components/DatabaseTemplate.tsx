"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/routing";
import { useRouter } from "@/i18n/routing";
import { ArrowUpDown, ChevronRight, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { EmptyState } from "./EmptyState";
import { CopyButton } from "./CopyButton";
import type { EmptyStateKey } from "@/lib/empty-states";

/** Content for the "there is no data at all" case — resolved by the Server
 * Component caller (getTranslations) from lib/empty-states.ts and passed
 * down as plain, serializable data. `stateKey` (a string) rather than the
 * icon itself: a Server Component can't pass a component reference as a
 * named prop across the RSC boundary (only `children` gets that special
 * treatment), so EmptyState resolves the icon client-side from this key
 * instead. The "filter matched nothing" case below is generic and
 * translated internally instead, since every table needs it regardless of
 * caller. */
export interface DbEmptyState {
  stateKey: EmptyStateKey;
  title: string;
  reason?: string;
  cta?: { kind: "open-search" | "link"; label: string; href?: string };
}

export interface DbColumn<T> {
  key: keyof T & string;
  label: string;
  sortable?: boolean;
  /** Declarative cell renderer — kept data-only so columns stay serializable
   * when passed from a Server Component into this Client Component.
   * "longtext" is for prose-length cell values (a full sentence or more)
   * that need to actually be read at a glance — larger, higher-contrast
   * text plus a copy-to-clipboard button, instead of the compact table
   * styling meant for short values like prices or stock status. */
  type?: "text" | "stock" | "link" | "longtext";
}

export interface DbFilter {
  key: string;
  label: string;
  options: string[];
}

export function DatabaseTemplate<T extends { id: string }>({
  columns,
  rows,
  filters = [],
  linkBase,
  linkKey,
  emptyState,
}: {
  columns: DbColumn<T>[];
  rows: T[];
  filters?: DbFilter[];
  linkBase?: string;
  linkKey?: keyof T & string;
  /** Shown instead of the generic filter-empty state when `rows` itself is
   * empty (no content published yet, not just filtered down to nothing). */
  emptyState?: DbEmptyState;
}) {
  const router = useRouter();
  const tFilterEmpty = useTranslations("emptyState.filterNoMatch");
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: keyof T & string; dir: 1 | -1 } | null>(null);
  const linkKeyField = linkKey ?? ("id" as keyof T & string);

  const filtered = useMemo(() => {
    let out = rows.filter((row) =>
      query
        ? Object.values(row).some((v) =>
            String(v).toLowerCase().includes(query.toLowerCase())
          )
        : true
    );
    for (const [key, value] of Object.entries(activeFilters)) {
      if (value) out = out.filter((row) => String(row[key as keyof T]) === value);
    }
    if (sort) {
      out = [...out].sort((a, b) => {
        const av = String(a[sort.key]);
        const bv = String(b[sort.key]);
        return av.localeCompare(bv) * sort.dir;
      });
    }
    return out;
  }, [rows, query, activeFilters, sort]);

  function toggleSort(key: keyof T & string) {
    setSort((prev) =>
      prev?.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: 1 }
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Qatorlarni filtrlash…"
            className="w-full rounded-lg border border-border bg-surface-alt py-2 pl-8 pr-3 text-[13px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light"
          />
        </div>
        {filters.map((f) => (
          <select
            key={f.key}
            value={activeFilters[f.key] ?? ""}
            onChange={(e) =>
              setActiveFilters((prev) => ({ ...prev, [f.key]: e.target.value }))
            }
            className="rounded-lg border border-border bg-surface-alt px-2.5 py-2 text-[13px] text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary-light"
          >
            <option value="">{f.label}: Barchasi</option>
            {f.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ))}
      </div>

      {rows.length === 0 && emptyState ? (
        <EmptyState
          stateKey={emptyState.stateKey}
          title={emptyState.title}
          reason={emptyState.reason}
          action={
            emptyState.cta?.kind === "open-search"
              ? {
                  label: emptyState.cta.label,
                  icon: Search,
                  onClick: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true })),
                }
              : emptyState.cta
                ? { label: emptyState.cta.label, href: emptyState.cta.href }
                : undefined
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          variant="compact"
          title={tFilterEmpty("title")}
          reason={tFilterEmpty("reason")}
          action={{
            label: tFilterEmpty("cta"),
            onClick: () => {
              setQuery("");
              setActiveFilters({});
            },
          }}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-soft">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-border bg-surface-alt/60">
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-2.5 font-semibold text-primary-dark">
                    {col.sortable ? (
                      <button
                        onClick={() => toggleSort(col.key)}
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        {col.label}
                        <ArrowUpDown size={11} className="opacity-60" />
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
                {linkBase && <th className="w-8 px-2 py-2.5" aria-hidden="true" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  onClick={linkBase ? () => router.push(`${linkBase}/${row[linkKeyField]}`) : undefined}
                  className={`border-b border-border last:border-0 hover:bg-primary/5 ${linkBase ? "cursor-pointer" : ""}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={col.type === "longtext" ? "px-4 py-3 align-top" : "px-4 py-2.5 text-text-secondary"}>
                      {col.type === "longtext" ? (
                        <div className="flex items-start gap-2">
                          <p className="flex-1 whitespace-pre-wrap text-[14px] leading-relaxed text-primary-dark">
                            {String(row[col.key] ?? "—")}
                          </p>
                          <CopyButton value={String(row[col.key] ?? "")} />
                        </div>
                      ) : col.type === "stock" ? (
                        <span className={row[col.key] ? "font-medium text-status-ok" : "font-medium text-status-outdated"}>
                          {row[col.key] ? "Mavjud" : "Mavjud emas"}
                        </span>
                      ) : col.type === "link" ? (
                        row[col.key] ? (
                          <a href={String(row[col.key])} className="text-primary hover:underline">
                            {String(row[col.key])}
                          </a>
                        ) : (
                          <span className="text-text-secondary/50">—</span>
                        )
                      ) : linkBase && col === columns[0] ? (
                        <Link
                          href={`${linkBase}/${row[linkKeyField]}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-primary hover:underline"
                        >
                          {String(row[col.key])}
                        </Link>
                      ) : (
                        String(row[col.key] ?? "—")
                      )}
                    </td>
                  ))}
                  {linkBase && (
                    <td className="px-2 py-2.5 text-right">
                      <ChevronRight size={14} className="ml-auto text-text-secondary opacity-60" />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
