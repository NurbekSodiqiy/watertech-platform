export interface OnboardingItem {
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
      { text: "Kompaniya haqida ma'lumot" },
      { text: "Watertech'ning bozordagi o'rni: biz kimmiz va nima qilamiz?" },
      { text: "Asosiy 3 ta mahsulotimizning qiymat taklifi (Value Proposition)." },
      { text: "Eng asosiy raqobatchimiz va bizning undan farqimiz." },
      { text: "Jamoa bilan tushlik." },
      { text: "Mahsulot katalogi bilan tanishuv" },
      { text: "Kompaniyaning operatorlari bilan suhbat. Ularning muvaffaqiyat sirlari, eng katta xatolari va amaliy maslahatlari." },
    ],
  },
  {
    day: 2,
    title: "Mahsulotni o'rganishga sho'ng'ish",
    objective: "Mahsulotni shunday o'rganishki, uni mijozga ishonch bilan sota olsin.",
    items: [
      { emphasis: "\"Injener bilan suhbat\"", text: "Yetakchi texnik mutaxassis bilan amaliy sessiya." },
      { text: "Mahsulotlarning ishlash prinsipini jonli ko'rish (demo-stendda)." },
      { text: "Mijozlar duch keladigan eng keng tarqalgan 5 ta texnik muammo va ularning yechimi." },
      { text: "Call operator bilishi shart bo'lgan eng muhim texnik parametrlar." },
      {
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
      { emphasis: "\"Ideal mijoz portreti\".", text: "CRM tizimini tahlil qilish." },
      { text: "CRM videodarsliklarini ko'rib chiqish" },
      { text: "Eng daromadli 5 ta mijozning tarixini o'rganish: ular qanday kelgan, nima sotib olgan, qanday muammosi hal bo'lgan?" },
      { text: "12:00 - 13:00: Tushlik." },
      {
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
        emphasis: "\"Menejerning \"chemodani\"\".",
        text: "Savdo jarayonida ishlatiladigan barcha andoza va materiallarni o'rganish: tijorat taklifi (KP), shartnoma, taqdimot sladi, marketing materiallari.",
      },
      { text: "Tushlik." },
      { text: "Standartlar bilan tanishish" },
      { emphasis: "\"Jang maydonida repetitsiya\".", text: "Savdo Direktori bilan \"role-play\" (rolli o'yin)." },
      { text: "Potensial mijoz bilan ilk qo'ng'iroq va uchrashuv simulyatsiyasi." },
      { text: "Konstruktiv fikr-mulohazalar olish." },
    ],
  },
];

export const TOTAL_ONBOARDING_ITEMS = onboardingDays.reduce((n, d) => n + d.items.length, 0);
