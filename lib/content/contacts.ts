import type { Contact } from "./types";

// Seed source only (`npm run seed:content`) — the app reads contacts through
// getContacts() in lib/content/loader.ts.
//
// Every name, phone and handle below is still a placeholder, carried over from
// the old lib/mock-data/contacts.ts. The phones are the reserved "+998 00 000
// 00 0N" shape so they pass contactPhoneSchema without being anybody's real
// number; the seed script therefore inserts these rows as drafts. A manager
// replaces them with real people in the admin panel and publishes.
export const contacts: Contact[] = [
  { id: "sales-head", name: "[Ism — joy egallovchi]", role: "Savdo bo'limi boshlig'i", topic: "Eskalatsiyalar, chegirmani tasdiqlash", phone: "+998 00 000 00 00", messenger: "@placeholder" },
  { id: "logistics", name: "[Ism — joy egallovchi]", role: "Logistika koordinatori", topic: "Yetkazib berish va ombor bo'yicha savollar", phone: "+998 00 000 00 01", messenger: "@placeholder" },
  { id: "tech-support", name: "[Ism — joy egallovchi]", role: "Texnik yordam rahbari", topic: "Mahsulot xususiyatlari, kafolat da'volari", phone: "+998 00 000 00 02", messenger: "@placeholder" },
  { id: "finance", name: "[Ism — joy egallovchi]", role: "Moliya", topic: "Hisob-fakturalar, to'lov shartlari", phone: "+998 00 000 00 03", messenger: "@placeholder" },
  { id: "sales-support", name: "[Ism — joy egallovchi]", role: "Savdoni qo'llab-quvvatlash", topic: "O'quv va bilimlar bazasi bo'yicha so'rovlar", phone: "+998 00 000 00 04", messenger: "@placeholder" },
];
