"use client";

import { useState } from "react";
import { Lightbulb, CheckSquare, Square, ChevronDown, Calendar } from "lucide-react";
import { useTranslations } from "next-intl";
import { CountUp } from "@/components/motion/CountUp";
import { OnboardingNode } from "@/components/onboarding/OnboardingNode";
import { OnboardingRail } from "@/components/onboarding/OnboardingRail";
import type { FittingKind } from "@/components/story/fittings";
import { useTrack } from "@/hooks/useTrack";
import { useUserState } from "@/hooks/useUserState";
import { onboardingKeyDef } from "@/lib/user-state/keys";
import { onboardingSummaryChecklist, type LocalizedOnboardingDay, type LocalizedOnboardingItem } from "@/lib/content/onboarding";

/** Module level so the definition — and with it the setter and the hydration
 * effect inside useUserState — stays identical across renders. The item ids
 * are only needed to import the oldest storage format, which was keyed by
 * each item's index in this same array (see lib/user-state/legacy.ts). Only
 * the ids are read from the raw array; every visible string comes in through
 * the localized props below. */
const ONBOARDING_STATE = onboardingKeyDef(onboardingSummaryChecklist.map((item) => item.id));

/** One fitting per day, in day order. */
const DAY_FITTINGS: FittingKind[] = ["coupling", "elbow", "tee", "valve"];

/** The only checkable items are the summary checklist, one per day (`summary-d<day>`). */
const summaryIdForDay = (day: number): string => `summary-d${day}`;

interface OnboardingChecklistProps {
  /** Localized day-by-day program (getOnboardingDays). */
  days: LocalizedOnboardingDay[];
  /** Localized quick-summary checklist (getOnboardingSummaryChecklist). */
  summary: LocalizedOnboardingItem[];
}

export function OnboardingChecklist({ days, summary }: OnboardingChecklistProps) {
  const t = useTranslations("pages.company.onboarding");
  // Synced per user, not per browser: progress follows the operator to another
  // device, and their manager can see it on /dashboard/quality. The old
  // `onboarding_checklist_v2` localStorage value is imported once on first run.
  const [checkedItems, setCheckedItems, status] = useUserState(
    ONBOARDING_STATE.key,
    ONBOARDING_STATE.schema,
    ONBOARDING_STATE.defaultValue,
    ONBOARDING_STATE
  );
  const [openDay, setOpenDay] = useState<number | null>(1);

  const track = useTrack();
  const toggleCheck = (id: string) => {
    const checked = !checkedItems[id];
    setCheckedItems({ ...checkedItems, [id]: checked });
    track("checklist_toggle", { entityType: "onboarding_item", entityId: id, meta: { checked } });
  };

  const toggleDay = (day: number) => {
    setOpenDay(openDay === day ? null : day);
  };

  // Counted over the current summary items only, so stale keys in storage
  // (legacy or renamed ids) cannot push the count past the total.
  const total = summary.length;
  const checkedCount = summary.filter((item) => checkedItems[item.id]).length;
  const progress = total === 0 ? 0 : checkedCount / total;

  const renderDay = (dayData: LocalizedOnboardingDay, index: number) => {
    const isOpen = openDay === dayData.day;
    return (
      <div key={dayData.day} className="relative">
        <OnboardingNode
          kind={DAY_FITTINGS[index % DAY_FITTINGS.length]}
          seated={!!checkedItems[summaryIdForDay(dayData.day)]}
        />
        <div className="overflow-hidden rounded-2xl border border-border shadow-soft">
          <button
            onClick={() => toggleDay(dayData.day)}
            className="flex w-full items-stretch text-left"
          >
            <div className="flex shrink-0 items-center justify-center bg-surface px-5 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Calendar size={20} />
              </div>
            </div>
            <div className="flex flex-1 items-center justify-between gap-4 bg-accent px-5 py-5 transition-colors hover:bg-accent-hover">
              <h2 className="text-[16px] font-bold text-on-accent">
                {t("dayHeading", { day: dayData.day, title: dayData.title })}
              </h2>
              <ChevronDown
                size={20}
                className={`shrink-0 text-on-accent transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              />
            </div>
          </button>

          {isOpen && (
            <div className="border-t border-border bg-surface-alt p-6">
              <p className="mb-4 text-[15px] text-primary-dark">
                <strong>{t("objective")}</strong> {dayData.objective}
              </p>
              <ul className="space-y-2.5">
                {dayData.items.map((item) => (
                  <li key={item.id} className="flex gap-2.5 text-[14.5px] leading-relaxed text-text-secondary">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span>
                      {item.emphasis && <strong>{item.emphasis} </strong>}
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  const leadingDays = days.slice(0, -1);
  const lastDay = days[days.length - 1];

  return (
    <div className="space-y-6 rounded-2xl border border-border bg-surface p-6 shadow-soft">

      {/* Intro Message */}
      <div className="flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 p-4 text-accent">
        <Lightbulb className="mt-0.5 shrink-0" size={20} />
        <p className="text-[15px] leading-relaxed">
          <strong>{t("welcomeTitle")}</strong> {t("welcomeBody", { days: days.length })}
        </p>
      </div>

      {/* Checklist */}
      <section>
        <div className="mb-4 flex items-baseline gap-3">
          <h2 className="text-[18px] font-bold text-primary-dark">
            {t("checklistHeading", { days: days.length })}
          </h2>
          <p className="text-[15px] font-semibold text-accent">
            <CountUp value={checkedCount} /> / {total}
          </p>
        </div>
        {status !== "loading" ? (
          <div className="space-y-2">
            {summary.map((item) => {
              const isChecked = !!checkedItems[item.id];
              return (
                <button
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                    isChecked
                      ? "border-status-ok bg-status-ok/5 text-text-secondary"
                      : "border-border bg-surface-alt hover:border-accent hover:bg-accent/5"
                  }`}
                >
                  <span className={`shrink-0 ${isChecked ? "text-status-ok" : "text-text-secondary/50"}`}>
                    {isChecked ? <CheckSquare size={20} /> : <Square size={20} />}
                  </span>
                  <span className={`text-[15px] ${isChecked ? "line-through opacity-70" : "font-medium text-primary-dark"}`}>
                    {item.text}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="h-[200px] animate-pulse rounded-xl bg-surface-alt" />
        )}
      </section>

      <hr className="border-border" />

      {/* Call operator 4-day program — merged in from the former /company/onboarding/call-operator page */}
      {/* From md up the days hang off a completion rail: the pipe runs from the
          first fitting's centre to the last one's. Rows before the last live in
          the wrapper the rail is sized against (its pb-4 is the gap to the last
          row; 40px = the last fitting's centre below that row's top). */}
      <section className="md:pl-16">
        {leadingDays.length > 0 && (
          <div className="relative flex flex-col gap-4 pb-4">
            {/* The svg is a replaced element and would not stretch between top and
                bottom on its own, so this box sizes it. */}
            <div className="pointer-events-none absolute -left-[50px] -bottom-10 top-10 hidden w-3 md:block">
              <OnboardingRail progress={progress} className="h-full w-full" />
            </div>
            {leadingDays.map(renderDay)}
          </div>
        )}
        {lastDay && renderDay(lastDay, leadingDays.length)}
      </section>

    </div>
  );
}
