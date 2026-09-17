import { Link } from "@/i18n/routing";
import { buildRangePresets, type DashboardRange } from "@/lib/dashboard/range";

/** Plain GET links, no client state — each preset sets from/to while
 * preserving the current operator filter and pointing back at whichever
 * dashboard tab it's rendered on. */
export function RangePicker({ range, basePath }: { range: DashboardRange; basePath: string }) {
  const presets = buildRangePresets();

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {presets.map((preset) => {
        const isActive = preset.from === range.from && preset.to === range.to;
        const params = new URLSearchParams({ from: preset.from, to: preset.to });
        if (range.operatorEmail) params.set("op", range.operatorEmail);
        return (
          <Link
            key={preset.key}
            href={`${basePath}?${params.toString()}`}
            className={`rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
              isActive
                ? "border-primary bg-primary/10 text-primary-dark"
                : "border-border bg-surface text-text-secondary hover:bg-surface-alt"
            }`}
          >
            {preset.label}
          </Link>
        );
      })}
    </div>
  );
}
