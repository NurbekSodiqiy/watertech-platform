import type { PageMeta } from "@/lib/types";

const statusStyles: Record<PageMeta["status"], { label: string; className: string }> = {
  "up-to-date": { label: "Dolzarb", className: "bg-status-ok/10 text-status-ok border-status-ok/30" },
  "in-review": { label: "Tekshiruvda", className: "bg-status-warning/10 text-status-warning border-status-warning/30" },
  outdated: { label: "Eskirgan", className: "bg-status-outdated/10 text-status-outdated border-status-outdated/30" },
};

const audienceLabels: Record<PageMeta["audience"], string> = {
  Operator: "Operator",
  Manager: "Menejer",
  Head: "Rahbar",
};

const levelLabels: Record<PageMeta["level"], string> = {
  Basic: "Boshlang'ich",
  Intermediate: "O'rta",
  Expert: "Ekspert",
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
      <Chip>Egasi: {meta.owner}</Chip>
      <Chip>Tasdiqlagan: {meta.approvedBy}</Chip>
      <Chip>Yangilangan: {meta.updatedDate}</Chip>
      <Chip>Keyingi tekshiruv: {meta.nextReviewDate}</Chip>
      <Chip>Auditoriya: {audienceLabels[meta.audience]}</Chip>
      <Chip>Daraja: {levelLabels[meta.level]}</Chip>
      <span
        className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium ${status.className}`}
      >
        {status.label}
      </span>
    </div>
  );
}
