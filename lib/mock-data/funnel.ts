export interface FunnelStage {
  stage: string;
  entryCondition: string;
  exitCondition: string;
  actions: string;
  crmFields: string;
  linkedScript: string;
  linkedTemplate: string;
}

export const funnelStages: FunnelStage[] = [
  {
    stage: "1. Yangi lid",
    entryCondition: "[Joy egallovchi — lid yuborilgan yoki biriktirilgan.]",
    exitCondition: "[Joy egallovchi — birinchi aloqa amalga oshirilgan.]",
    actions: "[Joy egallovchi — SLA oynasi ichida qo'ng'iroq qilish.]",
    crmFields: "Manba, aloqa ma'lumotlari",
    linkedScript: "Birinchi qo'ng'iroq — Aniqlash",
    linkedTemplate: "—",
  },
  {
    stage: "2. Saralangan",
    entryCondition: "[Joy egallovchi — aniqlash qo'ng'irog'i yakunlangan.]",
    exitCondition: "[Joy egallovchi — ehtiyoj va byudjet tasdiqlangan.]",
    actions: "[Joy egallovchi — saralash izohlarini qayd etish.]",
    crmFields: "Segment, byudjet oralig'i, muddat",
    linkedScript: "Birinchi qo'ng'iroq — Aniqlash",
    linkedTemplate: "—",
  },
  {
    stage: "3. Taklif yuborildi",
    entryCondition: "[Joy egallovchi — saralangan va narx ichki kelishilgan.]",
    exitCondition: "[Joy egallovchi — taklif yetkazilgan va ochilgan.]",
    actions: "[Joy egallovchi — taklif yuborish, kuzatuvni rejalashtirish.]",
    crmFields: "Taklif qiymati, mahsulot turkumlari",
    linkedScript: "—",
    linkedTemplate: "Taklif shabloni",
  },
  {
    stage: "4. Muzokara",
    entryCondition: "[Joy egallovchi — taklif mijoz tomonidan ko'rib chiqilgan.]",
    exitCondition: "[Joy egallovchi — shartlar kelishilgan.]",
    actions: "[Joy egallovchi — e'tirozlar bilan ishlash, shartlarni moslashtirish.]",
    crmFields: "Chegirma %, qayd etilgan e'tirozlar",
    linkedScript: "—",
    linkedTemplate: "—",
  },
  {
    stage: "5. Yakunlandi — Yutildi / Yutqazildi",
    entryCondition: "[Joy egallovchi — yakuniy qaror qabul qilingan.]",
    exitCondition: "[Joy egallovchi — shartnoma imzolangan yoki lid arxivlangan.]",
    actions: "[Joy egallovchi — natija va sababni qayd etish.]",
    crmFields: "Natija, yo'qotish sababi (agar yutqazilgan bo'lsa)",
    linkedScript: "—",
    linkedTemplate: "Shartnoma shartlari",
  },
];
