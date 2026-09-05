import type { PageMeta } from "@/lib/types";

const statusStyles: Record<PageMeta["status"], { label: string; className: string }> = {
  "up-to-date": { label: "Up to date", className: "bg-status-ok/10 text-status-ok border-status-ok/30" },
  "in-review": { label: "In review", className: "bg-status-warning/10 text-status-warning border-status-warning/30" },
  outdated: { label: "Outdated", className: "bg-status-outdated/10 text-status-outdated border-status-outdated/30" },
};

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-surface-alt px-2.5 py-1 text-[11.5px] text-text-secondary">
      {children}
    </span>
  );
}

export function MetadataBadgeRow({ meta }: { meta: PageMeta }) {
  const status = statusStyles[meta.status];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip>Owner: {meta.owner}</Chip>
      <Chip>Approved by: {meta.approvedBy}</Chip>
      <Chip>Updated: {meta.updatedDate}</Chip>
      <Chip>Next review: {meta.nextReviewDate}</Chip>
      <Chip>Audience: {meta.audience}</Chip>
      <Chip>Level: {meta.level}</Chip>
      <span
        className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium ${status.className}`}
      >
        {status.label}
      </span>
    </div>
  );
}
