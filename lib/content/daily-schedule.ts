export interface DailyScheduleItem {
  id: number;
  start: string;
  end: string;
  task: string;
  /** Key into the lucide icon map DailyTimeline builds — see its `scheduleIcons` Record. */
  icon: string;
  isLunch?: boolean;
}

export const dailySchedule: DailyScheduleItem[] = [
  { id: 1, start: "09:00", end: "09:30", task: "Joriy kun uchun ishlarni rejalashtirish, yangiliklarni tekshirish", icon: "ListTodo" },
  { id: 2, start: "09:30", end: "11:00", task: "Yangi tushgan lidlarga qo'ng'iroq qilish va ularga vazifalarni belgilash", icon: "PhoneCall" },
  { id: 3, start: "11:00", end: "12:00", task: "CRM'da qo'yilgan topshiriqlarni bajarish (qayta aloqa, telegramdan ma'lumotlar yuborish)", icon: "Send" },
  { id: 4, start: "12:00", end: "13:00", task: "Tushlik", icon: "Coffee", isLunch: true },
  { id: 5, start: "13:00", end: "14:00", task: "Yangi tushgan lidlarga qo'ng'iroq qilish va ularga vazifalarni belgilash", icon: "PhoneCall" },
  { id: 6, start: "14:00", end: "15:30", task: "Telefon orqali sotuv bo'yicha qayta aloqa qilish va sotuv etaplari asosida ishlash", icon: "Headset" },
  { id: 7, start: "15:30", end: "17:00", task: "CRM'da mijozlarga vazifalar belgilanganligini tekshirish va kunlik hisobot tayyorlash", icon: "FileText" },
];
