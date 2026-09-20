import type { Sop } from "./types";

// Seed source only (`npm run seed:content`) — the app reads SOPs through
// getSops()/getSop() in lib/content/loader.ts. A step's `title` is the
// instruction and its `body` the note under it (the old mock's `action` and
// `note`); the step number is the array position.
//
// The step copy is still placeholder text carried over from the old
// lib/mock-data/amocrm.ts — a manager replaces it in the admin panel.
const SUMMARY = "Qisqa standart tartib-qoida";

export const sops: Sop[] = [
  {
    id: "lead-creation",
    title: "Lid yaratish",
    summary: SUMMARY,
    steps: [
      { title: "[Joy egallovchi qadam — lid qayerda yaratilishi kerak.]", body: "[Izoh — joy egallovchi]" },
      { title: "[Joy egallovchi qadam — to'ldirilishi shart bo'lgan maydonlar.]", body: "[Izoh — joy egallovchi]" },
      { title: "[Joy egallovchi qadam — teglash tartibi.]", body: "[Izoh — joy egallovchi]" },
    ],
  },
  {
    id: "stage-transition",
    title: "Bosqichni almashtirish",
    summary: SUMMARY,
    steps: [
      { title: "[Joy egallovchi qadam — lidni oldinga siljitish sharti.]", body: "[Izoh — joy egallovchi]" },
      { title: "[Joy egallovchi qadam — lidni orqaga qaytarish huquqi kimda.]", body: "[Izoh — joy egallovchi]" },
    ],
  },
  {
    id: "task-setting",
    title: "Vazifa belgilash",
    summary: SUMMARY,
    steps: [
      { title: "[Joy egallovchi qadam — qachon kuzatuv vazifasi kerak bo'ladi.]", body: "[Izoh — joy egallovchi]" },
      { title: "[Joy egallovchi qadam — vazifa uchun standart muddat oynasi.]", body: "[Izoh — joy egallovchi]" },
    ],
  },
  {
    id: "card-standard",
    title: "Karta standarti",
    summary: SUMMARY,
    steps: [
      { title: "[Joy egallovchi qadam — kartalarni nomlash tartibi.]", body: "[Izoh — joy egallovchi]" },
      { title: "[Joy egallovchi qadam — majburiy ilovalar.]", body: "[Izoh — joy egallovchi]" },
    ],
  },
  {
    id: "loss-reasons",
    title: "Yo'qotish sabablari",
    summary: SUMMARY,
    steps: [
      { title: "[Joy egallovchi qadam — to'g'ri yo'qotish sababini tanlash.]", body: "[Izoh — joy egallovchi]" },
      { title: "[Joy egallovchi qadam — yo'qotish bo'yicha majburiy izoh.]", body: "[Izoh — joy egallovchi]" },
    ],
  },
  {
    id: "reports",
    title: "Hisobotlar",
    summary: SUMMARY,
    steps: [
      { title: "[Joy egallovchi qadam — har hafta qaysi hisobotni yuritish kerak.]", body: "[Izoh — joy egallovchi]" },
      { title: "[Joy egallovchi qadam — hisobotni kim ko'rib chiqadi.]", body: "[Izoh — joy egallovchi]" },
    ],
  },
];
