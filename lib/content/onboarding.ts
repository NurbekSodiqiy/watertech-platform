export interface OnboardingItem {
  /** Stable kebab-case slug, unique across `onboardingDays` and
   * `onboardingSummaryChecklist` combined — telemetry (`checklist_toggle`)
   * and the checklist's localStorage state key items by this id, so it must
   * never be renamed without a migration note. */
  id: string;
  text: string;
  emphasis?: string;
}

export interface OnboardingDay {
  day: number;
  title: string;
  objective: string;
  items: OnboardingItem[];
}

export const onboardingDays: OnboardingDay[] = [
  {
    day: 1,
    title: "Biz haqimizda va mahsulot",
    objective: "Kompaniyaning \"DNK\"sini tushunish va o'z o'rnini anglash.",
    items: [
      { id: "d1-company-info", text: "Kompaniya haqida ma'lumot" },
      { id: "d1-market-position", text: "Watertech'ning bozordagi o'rni: biz kimmiz va nima qilamiz?" },
      { id: "d1-value-proposition", text: "Asosiy 3 ta mahsulotimizning qiymat taklifi (Value Proposition)." },
      { id: "d1-competitor-diff", text: "Eng asosiy raqobatchimiz va bizning undan farqimiz." },
      { id: "d1-team-lunch", text: "Jamoa bilan tushlik." },
      { id: "d1-catalog-intro", text: "Mahsulot katalogi bilan tanishuv" },
      { id: "d1-operator-interview", text: "Kompaniyaning operatorlari bilan suhbat. Ularning muvaffaqiyat sirlari, eng katta xatolari va amaliy maslahatlari." },
    ],
  },
  {
    day: 2,
    title: "Mahsulotni o'rganishga sho'ng'ish",
    objective: "Mahsulotni shunday o'rganishki, uni mijozga ishonch bilan sota olsin.",
    items: [
      { id: "d2-engineer-session", emphasis: "\"Injener bilan suhbat\"", text: "Yetakchi texnik mutaxassis bilan amaliy sessiya." },
      { id: "d2-live-demo", text: "Mahsulotlarning ishlash prinsipini jonli ko'rish (demo-stendda)." },
      { id: "d2-common-issues", text: "Mijozlar duch keladigan eng keng tarqalgan 5 ta texnik muammo va ularning yechimi." },
      { id: "d2-key-parameters", text: "Call operator bilishi shart bo'lgan eng muhim texnik parametrlar." },
      {
        id: "d2-competitor-comparison",
        emphasis: "14:00 - 17:00: \"Raqobatchini \"yanchib tashlash\"\".",
        text: "Raqobatchilarning mahsulotlari bilan biznikini yonma-yon taqqoslash. Mijozning e'tirozlariga tayyorlanish (\"Sizlarniki qimmat\", \"Raqobatchingizda bu funksiya bor\").",
      },
    ],
  },
  {
    day: 3,
    title: "Mijoz va CRM",
    objective: "Ideal mijoz kimligini anglash va u bilan ishlash qurollarini o'zlashtirish.",
    items: [
      { id: "d3-ideal-client-profile", emphasis: "\"Ideal mijoz portreti\".", text: "CRM tizimini tahlil qilish." },
      { id: "d3-crm-videos", text: "CRM videodarsliklarini ko'rib chiqish" },
      { id: "d3-top-clients-history", text: "Eng daromadli 5 ta mijozning tarixini o'rganish: ular qanday kelgan, nima sotib olgan, qanday muammosi hal bo'lgan?" },
      { id: "d3-lunch", text: "12:00 - 13:00: Tushlik." },
      {
        id: "d3-live-call",
        emphasis: "14:00 - 17:00: \"Jonli efir\".",
        text: "Tajribali operatorning mijoz bilan bo'layotgan jonli suhbatini (telefon yoki uchrashuv) kuzatish. Suhbatdan so'ng 30 daqiqalik \"tahlil\" sessiyasi: nima yaxshi bo'ldi, nimani boshqacha qilish mumkin edi?",
      },
    ],
  },
  {
    day: 4,
    title: "Savdo Qurollari va Amaliyot",
    objective: "Bilimlarni amaliy ko'nikmaga aylantirish.",
    items: [
      {
        id: "d4-sales-toolkit",
        emphasis: "\"Menejerning \"chemodani\"\".",
        text: "Savdo jarayonida ishlatiladigan barcha andoza va materiallarni o'rganish: tijorat taklifi (KP), shartnoma, taqdimot sladi, marketing materiallari.",
      },
      { id: "d4-lunch", text: "Tushlik." },
      { id: "d4-standards-intro", text: "Standartlar bilan tanishish" },
      { id: "d4-roleplay", emphasis: "\"Jang maydonida repetitsiya\".", text: "Savdo Direktori bilan \"role-play\" (rolli o'yin)." },
      { id: "d4-call-simulation", text: "Potensial mijoz bilan ilk qo'ng'iroq va uchrashuv simulyatsiyasi." },
      { id: "d4-feedback", text: "Konstruktiv fikr-mulohazalar olish." },
    ],
  },
];

export const TOTAL_ONBOARDING_ITEMS = onboardingDays.reduce((n, d) => n + d.items.length, 0);

/** The 4-line "quick summary" checklist shown above the day-by-day program
 * in components/OnboardingChecklist.tsx — the only onboarding items with
 * checkable state. Moved here (was hard-coded in the component) so it has
 * stable ids like everything else in this file. */
export const onboardingSummaryChecklist: OnboardingItem[] = [
  { id: "summary-d1", text: "1-kun: Kompaniya missiyasi va qadriyatlarini o'qish." },
  { id: "summary-d2", text: "2-kun: Jamoa bilan tanishish (Kontaktlar bo'limi)." },
  { id: "summary-d3", text: "3-kun: Mahsulot turlarini yodlash (Katalog)." },
  { id: "summary-d4", text: "4-kun: Skriptlarni o'rganish va imtihon topshirish." },
];
