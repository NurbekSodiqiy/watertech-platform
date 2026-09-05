"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Search } from "lucide-react";
import { EmptyState } from "./EmptyState";

export interface DbColumn {
  key: string;
  label: string;
  sortable?: boolean;
  /** Declarative cell renderer — kept data-only so columns stay serializable
   * when passed from a Server Component into this Client Component. */
  type?: "text" | "stock" | "link";
}

export interface DbFilter {
  key: string;
  label: string;
  options: string[];
}

export function DatabaseTemplate({
  columns,
  rows,
  filters = [],
  linkBase,
  linkKey = "slug",
  emptyTitle,
}: {
  columns: DbColumn[];
  rows: Record<string, any>[];
  filters?: DbFilter[];
  linkBase?: string;
  linkKey?: string;
  emptyTitle?: string;
}) {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  const filtered = useMemo(() => {
    let out = rows.filter((row) =>
      query
        ? Object.values(row).some((v) =>
            String(v).toLowerCase().includes(query.toLowerCase())
          )
        : true
    );
    for (const [key, value] of Object.entries(activeFilters)) {
      if (value) out = out.filter((row) => String(row[key]) === value);
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

  function toggleSort(key: string) {
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
            placeholder="Filter rows…"
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
            <option value="">{f.label}: All</option>
            {f.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={emptyTitle ?? "No rows match"}
          description="Try clearing filters, or add new rows once real content is available."
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
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <tr key={row.id ?? row.slug ?? i} className="border-b border-border last:border-0 hover:bg-primary/5">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-2.5 text-text-secondary">
                      {col.type === "stock" ? (
                        <span className={row[col.key] ? "font-medium text-status-ok" : "font-medium text-status-outdated"}>
                          {row[col.key] ? "In stock" : "Out of stock"}
                        </span>
                      ) : col.type === "link" ? (
                        <a href={row[col.key]} className="text-primary hover:underline">
                          {row[col.key]}
                        </a>
                      ) : linkBase && col === columns[0] ? (
                        <Link
                          href={`${linkBase}/${row[linkKey]}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {row[col.key]}
                        </Link>
                      ) : (
                        String(row[col.key] ?? "—")
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
