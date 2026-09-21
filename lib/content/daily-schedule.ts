// The task wording is not stored here: it lives in messages under
// `dailyTimeline.tasks.<id>` (uz + ru), so there is one copy per language.
export interface DailyScheduleItem {
  id: number;
  start: string;
  end: string;
  /** Key into the lucide icon map DailyTimeline builds — see its `scheduleIcons` Record. */
  icon: string;
  isLunch?: boolean;
}

export const dailySchedule: DailyScheduleItem[] = [
  { id: 1, start: "09:00", end: "09:30", icon: "ListTodo" },
  { id: 2, start: "09:30", end: "11:00", icon: "PhoneCall" },
  { id: 3, start: "11:00", end: "12:00", icon: "Send" },
  { id: 4, start: "12:00", end: "13:00", icon: "Coffee", isLunch: true },
  { id: 5, start: "13:00", end: "14:00", icon: "PhoneCall" },
  { id: 6, start: "14:00", end: "15:30", icon: "Headset" },
  { id: 7, start: "15:30", end: "17:00", icon: "FileText" },
];
