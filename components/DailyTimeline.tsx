"use client";

import { useEffect, useState } from "react";
import { ListTodo, PhoneCall, Send, Coffee, Headset, FileText, CheckCircle2 } from "lucide-react";

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
  const [dateLabel] = useState(() => {
    const now = new Date();
    return `${now.getDate()}-${UZ_MONTHS_FULL[now.getMonth()]}, ${UZ_WEEKDAYS[now.getDay()]}`;
  });

  return <span className="text-[14px] text-text-secondary">{dateLabel}</span>;
}

type TimelineItem = {
  id: number;
  start: string;
  end: string;
  task: string;
  icon: any;
  isLunch?: boolean;
};

const schedule: TimelineItem[] = [
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

export function DailyTimeline() {
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-lg font-bold text-primary-dark">Kunlik reja</h2>
      <div className="relative space-y-0 pl-4 sm:pl-0">
        <div className="absolute bottom-0 left-8 top-0 hidden w-px bg-border sm:block" />
        <div className="absolute bottom-0 left-4 top-0 w-px bg-border sm:hidden" />
        
        {schedule.map((item, index) => {
          const startMins = getTimeMinutes(item.start);
          const endMins = getTimeMinutes(item.end);
          
          let state: "past" | "current" | "future" = "future";
          if (currentMinutes >= endMins) state = "past";
          else if (currentMinutes >= startMins && currentMinutes < endMins) state = "current";

          const isLast = index === schedule.length - 1;

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
                  <p
                    className={`text-[14px] leading-relaxed ${
                      item.isLunch
                        ? "italic text-text-secondary"
                        : state === "current"
                        ? "font-semibold text-primary-dark"
                        : "font-medium text-text-primary"
                    }`}
                  >
                    {item.task}
                  </p>
                  {state === "current" && (
                    <span className="shrink-0 rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-accent">
                      Hozir
                    </span>
                  )}
                  {state === "past" && !item.isLunch && (
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-status-ok opacity-50" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
