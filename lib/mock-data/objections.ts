export interface Objection {
  id: string;
  objection: string;
  realMeaning: string;
  response: string;
  followUp: string;
  sourceScripts: string;
}

export const objections: Objection[] = [
  {
    id: "obj-1",
    objection: "\"Narxi qimmat\"",
    realMeaning: "Boshqa takliflar bilan solishtiryapti, qiymatni ko'rmayapti",
    response:
      "Tushunarli. Haqiqatan ham, sizga shunday tuyulayotgan bo'lishi mumkin. Lekin biz faqat narxni emas, balki xavfsizlikni sotyapmiz. Hozirgi arzon quvurlar tufayli bir yilda necha marta qaytarish yoki shikoyatlar bilan pul yo'qotishingiz mumkin? Bizning narximiz — bu sizning obro'ingizga berilgan sug'urta.",
    followUp:
      "Ustalar uchun variant: \"Sizga bir narsa qiziq — mahsulot narxi muhummi yoki sifati?\" deb so'rab keyin javobni davom ettirish",
    sourceScripts: "Target lid, Sovuq qo'ng'iroq, Ustalar",
  },
  {
    id: "obj-2",
    objection: "\"Fitinglar bir-biriga tushmaydi / mos kelmaydi\"",
    realMeaning: "Oldingi tajribasida sifatsiz mahsulotdan xafa bo'lgan",
    response:
      "Bu juda muhim savol. Bizning fitinglarimiz Yevropa standartlarida (Germaniya texnologiyasida) aniq kalibrovka qilingan. Bu esa ustalar uchun tezkor va xatosiz o'rnatishni ta'minlaydi. Biz buning uchun maxsus kafolat beramiz.",
    followUp: "\"Menejerimizning sinov to'plamini tekshirib ko'ring\" — namuna yuborishni taklif qiling",
    sourceScripts: "Target lid, Sovuq qo'ng'iroq",
  },
  {
    id: "obj-3",
    objection: "\"Mayli, rahmat, hozir o'ylab ko'ray\" / \"Keyinroq telefon qilaman\"",
    realMeaning: "Aniq to'xtatuvchi sabab bor, lekin aytishni istamayapti",
    response:
      "Albatta, o'ylab ko'rish kerak. Lekin vaqtingizni tejash uchun to'g'ridan-to'g'ri aniqlashtiray: Sizni hozir eng ko'p to'xtatib turgan narsa — narxmi, yoki nasiya shartlari haqidagi savollaringizmi?",
    followUp: "\"Sizga qanday ma'lumotni to'liq va to'g'ri yetkazib bera olmadim?\" — sababni aniq toping",
    sourceScripts: "Target lid, Sovuq qo'ng'iroq",
  },
  {
    id: "obj-4",
    objection: "\"Risk qila olmayman\" (yangi mahsulotga o'tishdan cho'chiyapti)",
    realMeaning: "Talab bo'lmay qolishidan yoki sotilmay qolishidan qo'rqyapti",
    response:
      "Ustalar bilan hamkorlik asosida ishlashni yo'lga qo'ymoqdamiz, shu sababli har bir tumanda bizning mahsulotlarimiz bo'lishi kerak — mahsulotga bo'lgan talab yuqori. Mijozlarni jalb qilish masalasini biz hal qilamiz.",
    followUp: "Marketing/mijoz jalb qilish qo'llab-quvvatlovini alohida ta'kidlang",
    sourceScripts: "Target lid",
  },
];
