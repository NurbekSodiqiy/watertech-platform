import type { ReactNode } from "react";
import { BarGrow } from "@/components/admin/charts/BarGrow";
import { BarGrowGroup } from "@/components/admin/charts/BarGrowGroup";
import { barPercent, seriesMax } from "@/lib/admin/charts";

export interface ColumnPoint {
  /** Stable React key (the day, the hour). */
  key: string;
  /** Under the axis — short: "24", "09". */
  label: string;
  value: number;
  /** Printed above the bar, already formatted. */
  display: string;
  /** Full description for the tooltip and screen readers ("24-sentabr: 45 daq");
   * `label: display` when left out. */
  title?: string;
}

export interface ColumnBarsProps {
  points: readonly ColumnPoint[];
  tone: "green" | "blue";
  /** Accessible name of the series. */
  label: string;
  /** Bar area height: "sm" for a row of small multiples, "md" for a panel. */
  size?: "sm" | "md";
  /** Own horizontal scroll container (default). Pass false when the caller
   * already scrolls several series together, so their columns line up. */
  scroll?: boolean;
  /** Rendered instead of the series when there are no points. */
  empty?: ReactNode;
}

const FILL: Record<ColumnBarsProps["tone"], string> = {
  green: "bg-chart-green",
  blue: "bg-chart-blue",
};

const AREA: Record<NonNullable<ColumnBarsProps["size"]>, string> = {
  sm: "h-10",
  md: "h-28",
};

/** Narrowest column: fits a 4-digit value at text-[11px]. 7 days fill the
 * width; 31 days or 24 hours at 375px scroll sideways instead of squeezing. */
const MIN_COLUMN = "1.75rem";

/** A vertical series — one column per day or hour, the value printed just
 * above its bar and the label under the axis. A zero is a 2px stub on the
 * axis, so "nothing that day" still reads as a measured day. */
export function ColumnBars({ points, tone, label, size = "md", scroll = true, empty = null }: ColumnBarsProps) {
  if (points.length === 0) return <>{empty}</>;
  const max = seriesMax(points.map((point) => point.value));

  const series = (
    <ol
      aria-label={label}
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${points.length}, minmax(${MIN_COLUMN}, 1fr))` }}
    >
      {points.map((point) => {
        const percent = barPercent(point.value, max);
        const description = point.title ?? `${point.label}: ${point.display}`;
        return (
          // `relative`: the sr-only span is absolutely positioned — without a
          // positioned column it escapes the scroll container and widens the page.
          <li key={point.key} title={description} className="relative flex min-w-0 flex-col items-stretch">
            <span className="sr-only">{description}</span>
            <div aria-hidden="true" className="pt-4">
              <div className={`relative border-b border-border ${AREA[size]}`}>
                <span
                  className="absolute inset-x-0 whitespace-nowrap text-center text-[11px] font-semibold leading-none tabular-nums text-primary-dark"
                  style={{ bottom: percent > 0 ? `calc(${percent}% + 3px)` : "5px" }}
                >
                  {point.display}
                </span>
                <div className="absolute inset-0 flex items-end justify-center">
                  {percent > 0 ? (
                    <BarGrow
                      axis="y"
                      className={`w-full max-w-[1.25rem] rounded-t-lg ${FILL[tone]}`}
                      style={{ height: `${percent}%` }}
                    />
                  ) : (
                    <div className="h-[2px] w-full max-w-[1.25rem] rounded-full bg-text-secondary/30" />
                  )}
                </div>
              </div>
            </div>
            <span
              aria-hidden="true"
              className="mt-1 whitespace-nowrap text-center text-[11px] leading-none tabular-nums text-text-secondary"
            >
              {point.label}
            </span>
          </li>
        );
      })}
    </ol>
  );

  if (!scroll) return <BarGrowGroup className="min-w-0">{series}</BarGrowGroup>;
  return (
    // Focusable so a keyboard user can scroll it (axe: scrollable-region-focusable).
    <BarGrowGroup className="min-w-0">
      <div
        role="region"
        aria-label={label}
        tabIndex={0}
        className="overflow-x-auto rounded-lg pb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {series}
      </div>
    </BarGrowGroup>
  );
}
