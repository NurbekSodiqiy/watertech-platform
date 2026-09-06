export interface SopStep {
  step: number;
  action: string;
  note: string;
}

export interface AmoSop {
  slug: string;
  title: string;
  steps: SopStep[];
}

export const amoSops: AmoSop[] = [
  {
    slug: "lead-creation",
    title: "Lid yaratish",
    steps: [
      { step: 1, action: "[Joy egallovchi qadam — lid qayerda yaratilishi kerak.]", note: "[Izoh — joy egallovchi]" },
      { step: 2, action: "[Joy egallovchi qadam — to'ldirilishi shart bo'lgan maydonlar.]", note: "[Izoh — joy egallovchi]" },
      { step: 3, action: "[Joy egallovchi qadam — teglash tartibi.]", note: "[Izoh — joy egallovchi]" },
    ],
  },
  {
    slug: "stage-transition",
    title: "Bosqichni almashtirish",
    steps: [
      { step: 1, action: "[Joy egallovchi qadam — lidni oldinga siljitish sharti.]", note: "[Izoh — joy egallovchi]" },
      { step: 2, action: "[Joy egallovchi qadam — lidni orqaga qaytarish huquqi kimda.]", note: "[Izoh — joy egallovchi]" },
    ],
  },
  {
    slug: "task-setting",
    title: "Vazifa belgilash",
    steps: [
      { step: 1, action: "[Joy egallovchi qadam — qachon kuzatuv vazifasi kerak bo'ladi.]", note: "[Izoh — joy egallovchi]" },
      { step: 2, action: "[Joy egallovchi qadam — vazifa uchun standart muddat oynasi.]", note: "[Izoh — joy egallovchi]" },
    ],
  },
  {
    slug: "card-standard",
    title: "Karta standarti",
    steps: [
      { step: 1, action: "[Joy egallovchi qadam — kartalarni nomlash tartibi.]", note: "[Izoh — joy egallovchi]" },
      { step: 2, action: "[Joy egallovchi qadam — majburiy ilovalar.]", note: "[Izoh — joy egallovchi]" },
    ],
  },
  {
    slug: "loss-reasons",
    title: "Yo'qotish sabablari",
    steps: [
      { step: 1, action: "[Joy egallovchi qadam — to'g'ri yo'qotish sababini tanlash.]", note: "[Izoh — joy egallovchi]" },
      { step: 2, action: "[Joy egallovchi qadam — yo'qotish bo'yicha majburiy izoh.]", note: "[Izoh — joy egallovchi]" },
    ],
  },
  {
    slug: "reports",
    title: "Hisobotlar",
    steps: [
      { step: 1, action: "[Joy egallovchi qadam — har hafta qaysi hisobotni yuritish kerak.]", note: "[Izoh — joy egallovchi]" },
      { step: 2, action: "[Joy egallovchi qadam — hisobotni kim ko'rib chiqadi.]", note: "[Izoh — joy egallovchi]" },
    ],
  },
];
