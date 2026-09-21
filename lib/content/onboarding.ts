export interface OnboardingItem {
  /** Stable kebab-case slug, unique across `onboardingDays` and
   * `onboardingSummaryChecklist` combined — telemetry (`checklist_toggle`)
   * and the checklist's localStorage state key items by this id, so it must
   * never be renamed without a migration note. */
  id: string;
  text: string;
  /** Russian wording of `text`. Required, so a new item cannot ship untranslated. */
  textRu: string;
  emphasis?: string;
  emphasisRu?: string;
}

export interface OnboardingDay {
  day: number;
  title: string;
  titleRu: string;
  objective: string;
  objectiveRu: string;
  items: OnboardingItem[];
}

/** What pages and components receive from `getOnboardingDays` /
 * `getOnboardingSummaryChecklist` (lib/content/loader.ts): one language
 * resolved, the `*Ru` twins gone. */
export interface LocalizedOnboardingItem {
  id: string;
  text: string;
  emphasis?: string;
}

export interface LocalizedOnboardingDay {
  day: number;
  title: string;
  objective: string;
  items: LocalizedOnboardingItem[];
}

export const onboardingDays: OnboardingDay[] = [
  {
    day: 1,
    title: "Biz haqimizda va mahsulot",
    titleRu: "О нас и о продукте",
    objective: "Kompaniyaning \"DNK\"sini tushunish va o'z o'rnini anglash.",
    objectiveRu: "Понять «ДНК» компании и осознать своё место в ней.",
    items: [
      { id: "d1-company-info", text: "Kompaniya haqida ma'lumot", textRu: "Информация о компании" },
      {
        id: "d1-market-position",
        text: "Watertech'ning bozordagi o'rni: biz kimmiz va nima qilamiz?",
        textRu: "Место Watertech на рынке: кто мы и чем занимаемся?",
      },
      {
        id: "d1-value-proposition",
        text: "Asosiy 3 ta mahsulotimizning qiymat taklifi (Value Proposition).",
        textRu: "Ценностное предложение (Value Proposition) наших трёх основных продуктов.",
      },
      {
        id: "d1-competitor-diff",
        text: "Eng asosiy raqobatchimiz va bizning undan farqimiz.",
        textRu: "Наш главный конкурент и наши отличия от него.",
      },
      { id: "d1-team-lunch", text: "Jamoa bilan tushlik.", textRu: "Обед с командой." },
      { id: "d1-catalog-intro", text: "Mahsulot katalogi bilan tanishuv", textRu: "Знакомство с каталогом продукции" },
      {
        id: "d1-operator-interview",
        text: "Kompaniyaning operatorlari bilan suhbat. Ularning muvaffaqiyat sirlari, eng katta xatolari va amaliy maslahatlari.",
        textRu: "Беседа с операторами компании. Их секреты успеха, самые большие ошибки и практические советы.",
      },
    ],
  },
  {
    day: 2,
    title: "Mahsulotni o'rganishga sho'ng'ish",
    titleRu: "Погружение в изучение продукта",
    objective: "Mahsulotni shunday o'rganishki, uni mijozga ishonch bilan sota olsin.",
    objectiveRu: "Изучить продукт настолько, чтобы уверенно продавать его клиенту.",
    items: [
      {
        id: "d2-engineer-session",
        emphasis: "\"Injener bilan suhbat\"",
        emphasisRu: "«Беседа с инженером»",
        text: "Yetakchi texnik mutaxassis bilan amaliy sessiya.",
        textRu: "Практическая сессия с ведущим техническим специалистом.",
      },
      {
        id: "d2-live-demo",
        text: "Mahsulotlarning ishlash prinsipini jonli ko'rish (demo-stendda).",
        textRu: "Увидеть принцип работы продукции вживую (на демонстрационном стенде).",
      },
      {
        id: "d2-common-issues",
        text: "Mijozlar duch keladigan eng keng tarqalgan 5 ta texnik muammo va ularning yechimi.",
        textRu: "Пять самых распространённых технических проблем, с которыми сталкиваются клиенты, и их решения.",
      },
      {
        id: "d2-key-parameters",
        text: "Call operator bilishi shart bo'lgan eng muhim texnik parametrlar.",
        textRu: "Самые важные технические параметры, которые обязан знать колл-оператор.",
      },
      {
        id: "d2-competitor-comparison",
        emphasis: "14:00 - 17:00: \"Raqobatchini \"yanchib tashlash\"\".",
        emphasisRu: "14:00 - 17:00: «Как «разгромить» конкурента».",
        text: "Raqobatchilarning mahsulotlari bilan biznikini yonma-yon taqqoslash. Mijozning e'tirozlariga tayyorlanish (\"Sizlarniki qimmat\", \"Raqobatchingizda bu funksiya bor\").",
        textRu: "Сравнение продукции конкурентов с нашей бок о бок. Подготовка к возражениям клиента («У вас дорого», «У вашего конкурента есть эта функция»).",
      },
    ],
  },
  {
    day: 3,
    title: "Mijoz va CRM",
    titleRu: "Клиент и CRM",
    objective: "Ideal mijoz kimligini anglash va u bilan ishlash qurollarini o'zlashtirish.",
    objectiveRu: "Понять, кто такой идеальный клиент, и освоить инструменты работы с ним.",
    items: [
      {
        id: "d3-ideal-client-profile",
        emphasis: "\"Ideal mijoz portreti\".",
        emphasisRu: "«Портрет идеального клиента».",
        text: "CRM tizimini tahlil qilish.",
        textRu: "Анализ CRM-системы.",
      },
      { id: "d3-crm-videos", text: "CRM videodarsliklarini ko'rib chiqish", textRu: "Просмотр видеоуроков по CRM" },
      {
        id: "d3-top-clients-history",
        text: "Eng daromadli 5 ta mijozning tarixini o'rganish: ular qanday kelgan, nima sotib olgan, qanday muammosi hal bo'lgan?",
        textRu: "Изучение истории пяти самых прибыльных клиентов: как они пришли, что купили, какая их проблема была решена?",
      },
      { id: "d3-lunch", text: "12:00 - 13:00: Tushlik.", textRu: "12:00 - 13:00: Обед." },
      {
        id: "d3-live-call",
        emphasis: "14:00 - 17:00: \"Jonli efir\".",
        emphasisRu: "14:00 - 17:00: «Прямой эфир».",
        text: "Tajribali operatorning mijoz bilan bo'layotgan jonli suhbatini (telefon yoki uchrashuv) kuzatish. Suhbatdan so'ng 30 daqiqalik \"tahlil\" sessiyasi: nima yaxshi bo'ldi, nimani boshqacha qilish mumkin edi?",
        textRu: "Наблюдение за живым разговором опытного оператора с клиентом (по телефону или на встрече). После разговора — 30-минутная сессия «разбора»: что получилось хорошо, что можно было сделать иначе?",
      },
    ],
  },
  {
    day: 4,
    title: "Savdo Qurollari va Amaliyot",
    titleRu: "Инструменты продаж и практика",
    objective: "Bilimlarni amaliy ko'nikmaga aylantirish.",
    objectiveRu: "Превратить знания в практические навыки.",
    items: [
      {
        id: "d4-sales-toolkit",
        emphasis: "\"Menejerning \"chemodani\"\".",
        emphasisRu: "«Чемоданчик» менеджера.",
        text: "Savdo jarayonida ishlatiladigan barcha andoza va materiallarni o'rganish: tijorat taklifi (KP), shartnoma, taqdimot sladi, marketing materiallari.",
        textRu: "Изучение всех шаблонов и материалов, используемых в процессе продаж: коммерческое предложение (КП), договор, слайды презентации, маркетинговые материалы.",
      },
      { id: "d4-lunch", text: "Tushlik.", textRu: "Обед." },
      { id: "d4-standards-intro", text: "Standartlar bilan tanishish", textRu: "Знакомство со стандартами" },
      {
        id: "d4-roleplay",
        emphasis: "\"Jang maydonida repetitsiya\".",
        emphasisRu: "«Репетиция на поле боя».",
        text: "Savdo Direktori bilan \"role-play\" (rolli o'yin).",
        textRu: "«Ролевая игра» (role-play) с директором по продажам.",
      },
      {
        id: "d4-call-simulation",
        text: "Potensial mijoz bilan ilk qo'ng'iroq va uchrashuv simulyatsiyasi.",
        textRu: "Симуляция первого звонка и встречи с потенциальным клиентом.",
      },
      { id: "d4-feedback", text: "Konstruktiv fikr-mulohazalar olish.", textRu: "Получение конструктивной обратной связи." },
    ],
  },
];

export const TOTAL_ONBOARDING_ITEMS = onboardingDays.reduce((n, d) => n + d.items.length, 0);

/** The 4-line "quick summary" checklist shown above the day-by-day program
 * in components/OnboardingChecklist.tsx — the only onboarding items with
 * checkable state. Moved here (was hard-coded in the component) so it has
 * stable ids like everything else in this file. */
export const onboardingSummaryChecklist: OnboardingItem[] = [
  {
    id: "summary-d1",
    text: "1-kun: Kompaniya missiyasi va qadriyatlarini o'qish.",
    textRu: "День 1: Изучить миссию и ценности компании.",
  },
  {
    id: "summary-d2",
    text: "2-kun: Jamoa bilan tanishish (Kontaktlar bo'limi).",
    textRu: "День 2: Познакомиться с командой (раздел «Контакты»).",
  },
  {
    id: "summary-d3",
    text: "3-kun: Mahsulot turlarini yodlash (Katalog).",
    textRu: "День 3: Выучить виды продукции (Каталог).",
  },
  {
    id: "summary-d4",
    text: "4-kun: Skriptlarni o'rganish va imtihon topshirish.",
    textRu: "День 4: Изучить скрипты и сдать экзамен.",
  },
];
