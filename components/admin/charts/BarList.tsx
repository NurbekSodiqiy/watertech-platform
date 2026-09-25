import type { ReactNode } from "react";
import { Link } from "@/i18n/routing";
import { BarGrow } from "@/components/admin/charts/BarGrow";
import { BarGrowGroup } from "@/components/admin/charts/BarGrowGroup";
import { barPercent, seriesMax } from "@/lib/admin/charts";

export interface BarListRow {
  /** Stable React key (an email, a content id). */
  key: string;
  label: string;
  sublabel?: string;
  /** What the bar length is computed from. */
  value: number;
  /** What is printed at the bar's end, already formatted. */
  display: string;
  href?: string;
}

export interface BarListProps {
  rows: readonly BarListRow[];
  tone: "green" | "blue";
  /** Accessible name of the list. */
  label: string;
  /** Rendered instead of the list when there are no rows. */
  empty: ReactNode;
}

const FILL: Record<BarListProps["tone"], string> = {
  green: "bg-chart-green",
  blue: "bg-chart-blue",
};

/** Ranked horizontal bars. Rows are drawn in the order given — sort before.
 * An all-zero list still shows its rows, with empty tracks and a printed "0". */
export function BarList({ rows, tone, label, empty }: BarListProps) {
  if (rows.length === 0) return <>{empty}</>;
  const max = seriesMax(rows.map((row) => row.value));

  return (
    <BarGrowGroup>
      <ul aria-label={label} className="space-y-3">
        {rows.map((row) => (
          <li key={row.key} className="space-y-1.5">
            <div className="flex min-w-0 items-baseline gap-2">
              {row.href ? (
                <Link
                  href={row.href}
                  className="truncate rounded text-[13px] font-medium text-primary-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {row.label}
                </Link>
              ) : (
                <span className="truncate text-[13px] font-medium text-primary-dark">{row.label}</span>
              )}
              {row.sublabel && <span className="truncate text-[12px] text-text-secondary">{row.sublabel}</span>}
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-chart-track">
                <BarGrow
                  axis="x"
                  className={`h-full rounded-full ${FILL[tone]}`}
                  style={{ width: `${barPercent(row.value, max)}%` }}
                />
              </div>
              {/* Fixed width, so every row's track has the same length and bars compare fairly. */}
              <span className="w-[6.5rem] shrink-0 whitespace-nowrap text-right text-[12.5px] font-semibold tabular-nums text-primary-dark">
                {row.display}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </BarGrowGroup>
  );
}
