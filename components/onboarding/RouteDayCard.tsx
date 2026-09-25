"use client";

import { useId } from "react";
import { CheckSquare, ChevronDown, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import type { LocalizedOnboardingDay } from "@/lib/content/onboarding";

interface RouteDayCardProps {
  day: LocalizedOnboardingDay;
  /** The day's line of the summary checklist; null when the day has none, so
   * it has no checkbox. */
  summary: string | null;
  open: boolean;
  onToggleOpen: () => void;
  done: boolean;
  /** False until the reader's progress has loaded: a tick before that would
   * be applied to the empty default, so the checkbox waits. */
  ready: boolean;
  onToggleDone: () => void;
}

/**
 * One day of the onboarding program: the accent header opens and closes it
 * (objective + items with their emphasis), the footer ticks the whole day
 * off. The checkbox is a native input — it flips in the same frame as the
 * click and never waits for the route's animation.
 */
export function RouteDayCard({ day, summary, open, onToggleOpen, done, ready, onToggleDone }: RouteDayCardProps) {
  const t = useTranslations("pages.company.onboarding");
  const id = useId();
  const headingId = `${id}-heading`;
  const panelId = `${id}-panel`;
  const summaryId = `${id}-summary`;
  const doneId = `${id}-done`;

  return (
    // `day-<n>` is the hero's "next day" anchor. The scroll margin clears the
    // 56px TopBar and, below md, the status line above the card.
    <article
      id={`day-${day.day}`}
      aria-labelledby={headingId}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-surface shadow-soft"
    >
      <h2 id={headingId} className="text-[16px] font-bold">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggleOpen}
          className="flex w-full items-center justify-between gap-4 bg-accent px-5 py-4 text-left leading-6 text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        >
          <span>{t("dayHeading", { day: day.day, title: day.title })}</span>
          <ChevronDown
            size={20}
            aria-hidden="true"
            className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </h2>

      {open && (
        <div id={panelId} className="border-t border-border bg-surface-alt p-5 md:p-6">
          <p className="mb-4 text-[15px] text-primary-dark">
            <strong>{t("objective")}</strong> {day.objective}
          </p>
          <ul className="space-y-2.5">
            {day.items.map((item) => (
              <li key={item.id} className="flex gap-2.5 text-[14px] leading-relaxed text-text-secondary">
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

      {summary !== null && (
        <label
          className={`relative flex items-start gap-3 border-t px-5 py-3.5 transition-colors ${
            done ? "border-status-ok/40 bg-status-ok/5" : "border-border"
          } ${ready && !done ? "hover:bg-accent/5" : ""}`}
        >
          {/* The real checkbox, invisible, over the whole row: the row is its
              hit area and it keeps native keyboard and screen-reader behaviour. */}
          <input
            type="checkbox"
            className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-default"
            checked={done}
            disabled={!ready}
            onChange={onToggleDone}
            // Named by the short line only; the summary is its description.
            aria-labelledby={doneId}
            aria-describedby={summaryId}
          />
          <span
            aria-hidden="true"
            className={`mt-0.5 shrink-0 rounded-lg peer-focus-visible:ring-2 peer-focus-visible:ring-primary ${
              done ? "text-status-ok" : "text-text-secondary/50"
            } ${ready ? "" : "opacity-50"}`}
          >
            {done ? <CheckSquare size={20} /> : <Square size={20} />}
          </span>
          <span className="min-w-0">
            <span id={doneId} className="block text-[15px] font-semibold leading-6 text-primary-dark">
              {t("route.dayDone")}
              <span className="sr-only"> ({t("route.dayNumber", { day: day.day })})</span>
            </span>
            <span
              id={summaryId}
              className={`block text-[13px] leading-relaxed text-text-secondary ${done ? "line-through opacity-70" : ""}`}
            >
              {summary}
            </span>
          </span>
        </label>
      )}
    </article>
  );
}
