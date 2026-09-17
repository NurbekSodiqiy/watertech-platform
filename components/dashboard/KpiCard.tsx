import { Link } from "@/i18n/routing";

export interface KpiCardProps {
  title: string;
  value: string;
  deltaPercent: number | null;
  href?: string;
}

/** Fixed height so KpiGrid's skeleton (dashboard/loading.tsx) matches
 * pixel-for-pixel, same convention S19's SkeletonCard parity relies on. */
export function KpiCard({ title, value, deltaPercent, href }: KpiCardProps) {
  const deltaLabel = deltaPercent === null ? "—" : `${deltaPercent > 0 ? "+" : ""}${deltaPercent}%`;
  const deltaClass =
    deltaPercent === null || deltaPercent === 0
      ? "text-text-secondary"
      : deltaPercent > 0
        ? "text-status-ok"
        : "text-status-outdated";

  const body = (
    <div className="flex h-[104px] flex-col justify-between rounded-2xl border border-border bg-surface p-4 shadow-soft">
      <p className="text-[12.5px] font-medium text-text-secondary">{title}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-[24px] font-bold leading-none text-primary-dark">{value}</p>
        <span className={`text-[12.5px] font-semibold ${deltaClass}`}>{deltaLabel}</span>
      </div>
    </div>
  );

  if (!href) return body;
  return (
    <Link href={href} className="block transition-opacity hover:opacity-90">
      {body}
    </Link>
  );
}
