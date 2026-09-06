export interface ChangelogEntry {
  id: string;
  date: string;
  whatChanged: string;
  linkedPage: string;
  approvedBy: string;
  readCount: string;
}

export const changelogEntries: ChangelogEntry[] = [
  { id: "cl-1", date: "2026-09-02", whatChanged: "[Joy egallovchi — chegirma darajalari yangilandi.]", linkedPage: "/products/discount-policy", approvedBy: "Savdo bo'limi boshlig'i", readCount: "12 / 18" },
  { id: "cl-2", date: "2026-08-28", whatChanged: "[Joy egallovchi — yangi raqobat kartasi qo'shildi.]", linkedPage: "/sales-process/battle-cards", approvedBy: "M. Ivanova", readCount: "16 / 18" },
  { id: "cl-3", date: "2026-08-20", whatChanged: "[Joy egallovchi — yetkazib berish shartlari qayta ko'rib chiqildi.]", linkedPage: "/logistics/delivery-terms", approvedBy: "Operatsiyalar rahbari", readCount: "18 / 18" },
  { id: "cl-4", date: "2026-08-11", whatChanged: "[Joy egallovchi — yangi moslashuv moduli chop etildi.]", linkedPage: "/academy/modules", approvedBy: "A. Kessler", readCount: "9 / 18" },
  { id: "cl-5", date: "2026-08-03", whatChanged: "[Joy egallovchi — kafolat siyosati yangilandi.]", linkedPage: "/products/warranty-service", approvedBy: "Savdo bo'limi boshlig'i", readCount: "18 / 18" },
];
