export interface Contact {
  id: string;
  name: string;
  role: string;
  topic: string;
  phone: string;
  messenger: string;
}

export const contacts: Contact[] = [
  { id: "c-1", name: "[Ism — joy egallovchi]", role: "Savdo bo'limi boshlig'i", topic: "Eskalatsiyalar, chegirmani tasdiqlash", phone: "+1 (000) 000-0000", messenger: "@placeholder" },
  { id: "c-2", name: "[Ism — joy egallovchi]", role: "Logistika koordinatori", topic: "Yetkazib berish va ombor bo'yicha savollar", phone: "+1 (000) 000-0001", messenger: "@placeholder" },
  { id: "c-3", name: "[Ism — joy egallovchi]", role: "Texnik yordam rahbari", topic: "Mahsulot xususiyatlari, kafolat da'volari", phone: "+1 (000) 000-0002", messenger: "@placeholder" },
  { id: "c-4", name: "[Ism — joy egallovchi]", role: "Moliya", topic: "Hisob-fakturalar, to'lov shartlari", phone: "+1 (000) 000-0003", messenger: "@placeholder" },
  { id: "c-5", name: "[Ism — joy egallovchi]", role: "Savdoni qo'llab-quvvatlash", topic: "O'quv va bilimlar bazasi bo'yicha so'rovlar", phone: "+1 (000) 000-0004", messenger: "@placeholder" },
];
