"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpDown, ChevronRight, Search } from "lucide-react";
import { EmptyState } from "./EmptyState";

export interface DbColumn<T> {
  key: keyof T & string;
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

export function DatabaseTemplate<T extends { id: string }>({
  columns,
  rows,
  filters = [],
  linkBase,
  linkKey,
  emptyTitle,
}: {
  columns: DbColumn<T>[];
  rows: T[];
  filters?: DbFilter[];
  linkBase?: string;
  linkKey?: keyof T & string;
  emptyTitle?: string;
}) {
  const router = useRouter();
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

      {filtered.length === 0 ? (
        <EmptyState
          title={emptyTitle ?? "Mos qator topilmadi"}
          description="Filtrlarni tozalab ko'ring yoki haqiqiy ma'lumot qo'shilgach qatorlar paydo bo'ladi."
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
                    <td key={col.key} className="px-4 py-2.5 text-text-secondary">
                      {col.type === "stock" ? (
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
