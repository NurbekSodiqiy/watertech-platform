"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Script, Stage } from "@/lib/content/types";

/** Shown wherever an objection's response is displayed via a Stage's
 * objectionIds — not hardcoded to any one script. "Yakunga o'tish" jumps to
 * the last stage in the active script (its closing stage, by convention the
 * final element of Script["stages"]), skipping the stages in between. */
export function ObjectionNavButtons({
  script,
  currentStage,
  onSelectStage,
}: {
  script: Script;
  currentStage: Stage;
  onSelectStage: (stage: Stage) => void;
}) {
  const t = useTranslations("scripts");
  const closingStage = script.stages[script.stages.length - 1];
  const showForward = closingStage.id !== currentStage.id;

  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
      <button
        onClick={() => onSelectStage(currentStage)}
        className="flex items-center gap-1 text-[13px] font-medium text-primary hover:text-primary-hover"
      >
        <ChevronLeft size={14} />
        {t("backToStage", { label: currentStage.label })}
      </button>
      {showForward && (
        <button
          onClick={() => onSelectStage(closingStage)}
          className="flex items-center gap-1 text-[13px] font-medium text-primary hover:text-primary-hover"
        >
          {t("jumpToClosing")}
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}
