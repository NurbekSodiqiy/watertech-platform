"use client";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useContentRefs } from "@/hooks/useContentRefs";
import { useUserState } from "@/hooks/useUserState";
import { refKey } from "@/lib/search/refs";
import { scriptsPositionKey } from "@/lib/user-state/keys";

/** Picks the operator's last script and stage back up (`scripts.position`,
 * written by ScriptsWorkspace). Hidden when there is none — or when that
 * script no longer exists. */
export function ContinueCard() {
  const t = useTranslations("pages.home.continue");
  const [position, , status] = useUserState(
    scriptsPositionKey.key,
    scriptsPositionKey.schema,
    scriptsPositionKey.defaultValue,
    scriptsPositionKey
  );
  const { index, failed } = useContentRefs(status !== "loading" && position !== null);

  if (status === "loading") return <SkeletonCard className="h-24" />;
  if (!position || failed) return null;
  if (!index) return <SkeletonCard className="h-24" />;

  const script = index.byKey.get(refKey({ kind: "script", id: position.scriptId }));
  if (!script) return null;
  const stage = position.stageId ? script.stages?.find((s) => s.id === position.stageId) : undefined;
  const href = stage
    ? `/sales-process/scripts?script=${encodeURIComponent(script.id)}&stage=${encodeURIComponent(stage.id)}`
    : script.href;

  return (
    <Link
      href={href}
      className="flex h-24 items-center gap-4 rounded-2xl border border-border bg-surface px-5 shadow-soft hover:bg-primary/5"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{t("heading")}</span>
        <span className="mt-0.5 block truncate text-[18px] font-semibold text-primary-dark">{script.title}</span>
        <span className="block truncate text-[13px] text-text-secondary">{stage ? stage.label : t("noStage")}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-accent">
        {t("cta")}
        <ArrowRight size={16} aria-hidden="true" />
      </span>
    </Link>
  );
}
