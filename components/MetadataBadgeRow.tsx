import { useTranslations } from "next-intl";
import type { PageMeta } from "@/lib/types";

// Wording of each status / audience / level is in messages under pageMeta.*.
const statusClasses: Record<PageMeta["status"], string> = {
  "up-to-date": "bg-status-ok/10 text-status-ok border-status-ok/30",
  "in-review": "bg-status-warning/10 text-status-warning border-status-warning/30",
  outdated: "bg-status-outdated/10 text-status-outdated border-status-outdated/30",
};

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-surface-alt px-2.5 py-1 text-[11.5px] text-text-secondary">
      {children}
    </span>
  );
}

export function MetadataBadgeRow({ meta }: { meta: PageMeta }) {
  const t = useTranslations("pageMeta");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Chip>{t("owner", { value: meta.owner })}</Chip>
      <Chip>{t("approvedBy", { value: meta.approvedBy })}</Chip>
      <Chip>{t("updated", { value: meta.updatedDate })}</Chip>
      <Chip>{t("nextReview", { value: meta.nextReviewDate })}</Chip>
      <Chip>{t("audience", { value: t(`audiences.${meta.audience}`) })}</Chip>
      <Chip>{t("level", { value: t(`levels.${meta.level}`) })}</Chip>
      <span
        className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium ${statusClasses[meta.status]}`}
      >
        {t(`statuses.${meta.status}`)}
      </span>
    </div>
  );
}
