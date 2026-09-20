"use client";

import { useMemo } from "react";
import { ListTodo, PhoneCall, Send, Coffee, Headset, FileText, CheckCircle2, CheckSquare, Square, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTrack } from "@/hooks/useTrack";
import { useNow } from "@/hooks/useNow";
import { useUserState } from "@/hooks/useUserState";
import { dailyKeyForDay, dateKey } from "@/lib/user-state/keys";
import { dailySchedule } from "@/lib/content/daily-schedule";

// Indexed by Date#getDay() / Date#getMonth(); the words live in messages.
const WEEKDAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const MONTH_KEYS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
] as const;

// Computed client-side (like the timeline's own currentMinutes below) so the
// date always reflects the viewer's own clock/timezone instead of whatever
// the server happened to render at — the page that hosts this no longer
// needs to force per-request dynamic rendering just for this label.
export function DailyDateLabel() {
  const now = useNow();
  const t = useTranslations("dailyTimeline");

  if (!now) {
    return (
      <span className="text-[14px] text-text-secondary">
        <span className="invisible" aria-hidden="true">
          {t("dateLabel", { day: "13", month: t("months.september"), weekday: t("weekdays.sunday") })}
        </span>
      </span>
    );
  }

  const dateLabel = t("dateLabel", {
    day: String(now.getDate()),
    month: t(`months.${MONTH_KEYS[now.getMonth()]}`),
    weekday: t(`weekdays.${WEEKDAY_KEYS[now.getDay()]}`),
  });
  return <span className="text-[14px] text-text-secondary">{dateLabel}</span>;
}

const scheduleIcons: Record<string, LucideIcon> = {
  ListTodo,
  PhoneCall,
  Send,
  Coffee,
  Headset,
  FileText,
};

function getTimeMinutes(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

export function DailyTimeline() {
  const now = useNow(60_000);
  const currentMinutes = now ? now.getHours() * 60 + now.getMinutes() : null;
  const track = useTrack();
  const t = useTranslations("dailyTimeline");

  // One user_state row per calendar day, in the viewer's own timezone, so the
  // day rolls over at their midnight and yesterday's ticks are simply under a
  // different key — never explicitly cleared (rows older than two weeks are
  // pruned on write, see lib/user-state/prune.ts). The day is unknown until
  // useNow() resolves after mount, since `new Date()` must not run during
  // render; the key is null until then and the hook reports the default.
  const day = now ? dateKey(now) : null;
  const dailyState = useMemo(() => dailyKeyForDay(day ?? "1970-01-01"), [day]);
  const [daily, setDaily] = useUserState(
    day ? dailyState.key : null,
    dailyState.schema,
    dailyState.defaultValue,
    dailyState
  );

  function toggleCheck(id: number) {
    const checked = !daily.checked[id];
    setDaily({ ...daily, checked: { ...daily.checked, [id]: checked } });
    track("checklist_toggle", { entityType: "daily_task", entityId: String(id), meta: { checked } });
  }

  function setCallCount(id: number, value: string) {
    setDaily({ ...daily, calls: { ...daily.calls, [id]: value } });
    track("call_count_log", { entityType: "daily_task", entityId: String(id), meta: { count: value } });
  }

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-lg font-bold text-primary-dark">{t("heading")}</h2>
      <div className="relative space-y-0 pl-4 sm:pl-0">
        <div className="absolute bottom-0 left-8 top-0 hidden w-px bg-border sm:block" />
        <div className="absolute bottom-0 left-4 top-0 w-px bg-border sm:hidden" />
        
        {dailySchedule.map((item) => {
          const startMins = getTimeMinutes(item.start);
          const endMins = getTimeMinutes(item.end);
          const Icon = scheduleIcons[item.icon];

          let state: "past" | "current" | "future" = "future";
          if (currentMinutes !== null) {
            if (currentMinutes >= endMins) state = "past";
            else if (currentMinutes >= startMins && currentMinutes < endMins) state = "current";
          }

          return (
            <div key={item.id} className="relative flex items-start gap-4 pb-6 sm:gap-6">
              {/* Desktop time label */}
              <div className="hidden w-24 shrink-0 pt-1 text-right text-[13px] font-semibold text-text-secondary sm:block">
                {item.start} &ndash; {item.end}
              </div>

              {/* Icon / Node */}
              <div className="relative z-10 mt-1 flex shrink-0 items-center justify-center">
                {state === "current" ? (
                  <div className="absolute -inset-1.5 animate-pulse rounded-full bg-accent/20" />
                ) : null}
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                    item.isLunch
                      ? "border-border bg-surface-alt text-text-secondary"
                      : state === "current"
                      ? "border-accent bg-accent text-surface"
                      : state === "past"
                      ? "border-border bg-surface text-text-secondary opacity-60"
                      : "border-border bg-surface text-text-primary"
                  }`}
                >
                  <Icon size={16} />
                </div>
              </div>

              {/* Content */}
              <div
                className={`flex-1 rounded-2xl border p-4 shadow-sm ${
                  item.isLunch
                    ? "border-dashed border-border bg-transparent opacity-80"
                    : state === "current"
                    ? "border-accent/30 bg-accent/5 ring-1 ring-accent/20"
                    : state === "past"
                    ? "border-border bg-surface-alt/50 opacity-60"
                    : "border-border bg-surface"
                }`}
              >
                {/* Mobile time label */}
                <div className="mb-1 text-[12px] font-semibold text-text-secondary sm:hidden">
                  {item.start} &ndash; {item.end}
                </div>
                
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCheck(item.id)}
                      aria-label={daily.checked[item.id] ? t("markUndone") : t("markDone")}
                      className={`mt-0.5 shrink-0 ${daily.checked[item.id] ? "text-status-ok" : "text-text-secondary/50 hover:text-primary"}`}
                    >
                      {daily.checked[item.id] ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                    <p
                      className={`text-[14px] leading-relaxed ${
                        daily.checked[item.id]
                          ? "text-text-secondary line-through opacity-70"
                          : item.isLunch
                          ? "italic text-text-secondary"
                          : state === "current"
                          ? "font-semibold text-primary-dark"
                          : "font-medium text-text-primary"
                      }`}
                    >
                      {t(`tasks.${item.id}`)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <label
                      htmlFor={`call-count-${item.id}`}
                      className="hidden text-[11px] font-medium text-text-secondary whitespace-nowrap sm:inline"
                    >
                      {t("callsLabel")}
                    </label>
                    <input
                      id={`call-count-${item.id}`}
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={daily.calls[item.id] ?? ""}
                      onChange={(e) => setCallCount(item.id, e.target.value)}
                      placeholder="0"
                      aria-label={t("callsAriaLabel")}
                      className="w-14 rounded-lg border border-border bg-surface-alt px-2 py-1 text-[13px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light"
                    />
                    {state === "current" && (
                      <span className="shrink-0 rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-accent">
                        {t("current")}
                      </span>
                    )}
                    {state === "past" && !item.isLunch && (
                      <CheckCircle2 size={16} className="shrink-0 text-status-ok opacity-50" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
