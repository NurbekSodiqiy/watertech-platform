import { BarGrow } from "@/components/admin/charts/BarGrow";
import { BarGrowGroup } from "@/components/admin/charts/BarGrowGroup";

export interface ProgressBarProps {
  /** 0-100. */
  percent: number;
  /** Accessible name — what is progressing ("Onboarding"). */
  label: string;
}

/** A thin bar for one share of a whole (a checklist's progress) — the chart
 * primitives' single-value sibling. The number it stands for is printed next to
 * it by the caller, as text: colour never carries it. Grows once like every
 * other bar (BarGrow), and is the finished bar with JS off or reduced motion. */
export function ProgressBar({ percent, label }: ProgressBarProps) {
  const value = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <BarGrowGroup>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        className="h-1.5 overflow-hidden rounded-full bg-chart-track"
      >
        <BarGrow axis="x" className="h-full rounded-full bg-chart-green" style={{ width: `${value}%` }} />
      </div>
    </BarGrowGroup>
  );
}
