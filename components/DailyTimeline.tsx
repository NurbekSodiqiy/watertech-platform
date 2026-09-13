"use client";

import { useEffect, useState } from "react";
import { ListTodo, PhoneCall, Send, Coffee, Headset, FileText, CheckCircle2, CheckSquare, Square, type LucideIcon } from "lucide-react";
import { useTrack } from "@/hooks/useTrack";
import { useNow } from "@/hooks/useNow";

const UZ_WEEKDAYS = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
const UZ_MONTHS_FULL = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

// Computed client-side (like the timeline's own currentMinutes below) so the
// date always reflects the viewer's own clock/timezone instead of whatever
// the server happened to render at — the page that hosts this no longer
// needs to force per-request dynamic rendering just for this label.
export function DailyDateLabel() {
  const now = useNow();

  if (!now) {
    return (
      <span className="text-[14px] text-text-secondary">
        <span className="invisible" aria-hidden="true">13-Sentabr, Yakshanba</span>
      </span>
    );
  }

  const dateLabel = `${now.getDate()}-${UZ_MONTHS_FULL[now.getMonth()]}, ${UZ_WEEKDAYS[now.getDay()]}`;
  return <span className="text-[14px] text-text-secondary">{dateLabel}</span>;
}

type TimelineItem = {
  id: number;
  start: string;
  end: string;
  task: string;
  icon: LucideIcon;
  isLunch?: boolean;
};

export const schedule: TimelineItem[] = [
  { id: 1, start: "09:00", end: "09:30", task: "Joriy kun uchun ishlarni rejalashtirish, yangiliklarni tekshirish", icon: ListTodo },
  { id: 2, start: "09:30", end: "11:00", task: "Yangi tushgan lidlarga qo'ng'iroq qilish va ularga vazifalarni belgilash", icon: PhoneCall },
  { id: 3, start: "11:00", end: "12:00", task: "CRM'da qo'yilgan topshiriqlarni bajarish (qayta aloqa, telegramdan ma'lumotlar yuborish)", icon: Send },
  { id: 4, start: "12:00", end: "13:00", task: "Tushlik", icon: Coffee, isLunch: true },
  { id: 5, start: "13:00", end: "14:00", task: "Yangi tushgan lidlarga qo'ng'iroq qilish va ularga vazifalarni belgilash", icon: PhoneCall },
  { id: 6, start: "14:00", end: "15:30", task: "Telefon orqali sotuv bo'yicha qayta aloqa qilish va sotuv etaplari asosida ishlash", icon: Headset },
  { id: 7, start: "15:30", end: "17:00", task: "CRM'da mijozlarga vazifalar belgilanganligini tekshirish va kunlik hisobot tayyorlash", icon: FileText },
];

function getTimeMinutes(timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

// Local calendar date (not UTC) so the key rolls over at the viewer's own
// midnight — checked items from a prior day are simply under a different
// key, never explicitly cleared.
export function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

// Exported so CallModeOverlay's progress indicator can read the same
// per-day checklist state straight out of localStorage — the simplest way
// to share a "done today" number across two components with no existing
// state channel between them, instead of adding a new provider/store.
export const CHECKLIST_KEY_PREFIX = "watertech-daily-checklist-";
const CALL_COUNT_KEY_PREFIX = "watertech-daily-callcount-";

export function DailyTimeline() {
  const now = useNow(60_000);
  const currentMinutes = now ? now.getHours() * 60 + now.getMinutes() : null;
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [callCounts, setCallCounts] = useState<Record<number, string>>({});
  const track = useTrack();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHECKLIST_KEY_PREFIX + getTodayKey());
      if (saved) setCheckedItems(JSON.parse(saved));
      const savedCounts = localStorage.getItem(CALL_COUNT_KEY_PREFIX + getTodayKey());
      if (savedCounts) setCallCounts(JSON.parse(savedCounts));
    } catch {
      // localStorage unavailable/corrupt — start unchecked/empty
    }
  }, []);

  function toggleCheck(id: number) {
    const next = { ...checkedItems, [id]: !checkedItems[id] };
    setCheckedItems(next);
    try {
      localStorage.setItem(CHECKLIST_KEY_PREFIX + getTodayKey(), JSON.stringify(next));
    } catch {
      // localStorage unavailable — state just won't persist across reloads
    }
    track("checklist_toggle", { entityType: "daily_task", entityId: String(id), meta: { checked: next[id] } });
  }

  function setCallCount(id: number, value: string) {
    const next = { ...callCounts, [id]: value };
    setCallCounts(next);
    try {
      localStorage.setItem(CALL_COUNT_KEY_PREFIX + getTodayKey(), JSON.stringify(next));
    } catch {
      // localStorage unavailable — state just won't persist across reloads
    }
    track("call_count_log", { entityType: "daily_task", entityId: String(id), meta: { count: value } });
  }

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-lg font-bold text-primary-dark">Kunlik reja</h2>
      <div className="relative space-y-0 pl-4 sm:pl-0">
        <div className="absolute bottom-0 left-8 top-0 hidden w-px bg-border sm:block" />
        <div className="absolute bottom-0 left-4 top-0 w-px bg-border sm:hidden" />
        
        {schedule.map((item) => {
          const startMins = getTimeMinutes(item.start);
          const endMins = getTimeMinutes(item.end);
          
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
                  <item.icon size={16} />
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
                      aria-label={checkedItems[item.id] ? "Bajarilmagan deb belgilash" : "Bajarildi deb belgilash"}
                      className={`mt-0.5 shrink-0 ${checkedItems[item.id] ? "text-status-ok" : "text-text-secondary/50 hover:text-primary"}`}
                    >
                      {checkedItems[item.id] ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                    <p
                      className={`text-[14px] leading-relaxed ${
                        checkedItems[item.id]
                          ? "text-text-secondary line-through opacity-70"
                          : item.isLunch
                          ? "italic text-text-secondary"
                          : state === "current"
                          ? "font-semibold text-primary-dark"
                          : "font-medium text-text-primary"
                      }`}
                    >
                      {item.task}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <label
                      htmlFor={`call-count-${item.id}`}
                      className="hidden text-[11px] font-medium text-text-secondary whitespace-nowrap sm:inline"
                    >
                      Qo&apos;ng&apos;iroqlar:
                    </label>
                    <input
                      id={`call-count-${item.id}`}
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={callCounts[item.id] ?? ""}
                      onChange={(e) => setCallCount(item.id, e.target.value)}
                      placeholder="0"
                      aria-label="Qo'ng'iroqlar soni"
                      className="w-14 rounded-lg border border-border bg-surface-alt px-2 py-1 text-[13px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light"
                    />
                    {state === "current" && (
                      <span className="shrink-0 rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-accent">
                        Hozir
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
