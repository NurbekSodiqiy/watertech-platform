"use client";

import { useMemo, useState } from "react";
import { Link } from "@/i18n/routing";
import { Search, ChevronDown, ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Competitor } from "@/lib/content/types";
import { CompetitorDetailPanel } from "@/components/CompetitorDetailPanel";

/** Lets the operator look up a competitor by name without leaving the
 * objection view — e.g. the client says "Alfa is cheaper" mid-call. Reuses
 * the same `competitors` data and CompetitorDetailPanel already used by the
 * separate "Raqobatchilar" tab; this is a second entry point into the same
 * real data, not a new content source. */
export function ObjectionCompetitorSearch({ competitors }: { competitors: Competitor[] }) {
  const t = useTranslations("scripts");
  const tCommon = useTranslations("common");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Competitor | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return competitors.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 5);
  }, [competitors, query]);

  return (
    <div className="mb-4 rounded-xl border border-border bg-surface-alt p-3">
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          placeholder={t("objectionSearchPlaceholder")}
          className="w-full rounded-lg border border-border bg-surface py-2 pl-8 pr-3 text-[13px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light"
        />
      </div>

      {matches.length > 0 && !selected && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {matches.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1 text-[12px] font-medium text-primary-dark transition-colors hover:border-primary/40"
            >
              {c.name}
              <ChevronDown size={12} className="text-text-secondary" />
            </button>
          ))}
        </div>
      )}

      {query.trim() && matches.length === 0 && (
        <p className="mt-2 px-1 text-[12.5px] text-text-secondary">{t("objectionSearchNotFound")}</p>
      )}

      {selected && (
        <div className="mt-3 rounded-lg border border-border">
          <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-2">
            <span className="text-[12px] font-semibold text-primary-dark">{selected.name}</span>
            <div className="flex items-center gap-2">
              <Link
                href={`/sales-process/battle-cards/${selected.id}`}
                className="flex items-center gap-1 text-[12px] font-medium text-primary hover:text-primary-hover"
              >
                {t("fullCard")}
                <ArrowUpRight size={12} />
              </Link>
              <button
                onClick={() => setSelected(null)}
                className="text-[12px] font-medium text-text-secondary hover:text-primary-dark"
              >
                {tCommon("close")}
              </button>
            </div>
          </div>
          <CompetitorDetailPanel competitor={selected} />
        </div>
      )}
    </div>
  );
}
