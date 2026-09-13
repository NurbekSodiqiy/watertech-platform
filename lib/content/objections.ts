import type { Objection } from "./types";

// Canonical objection text — used identically wherever an objection is
// referenced (both scripts' "E'tiroz ustida ishlash" stage and the
// /sales-process/objections database), so the wording can no longer drift
// between a script's accordion and the objections page the way it used to.
export const objections: Objection[] = [
  {
    id: "obj-qimmat",
    label: "Narxi qimmat",
    keywords: ["narx", "qimmat", "chegirma", "arzon", "boshqalar arzon"],
    clientSays: "Narxi qimmat",
    realMeaning: "Boshqa takliflar bilan solishtiryapti, qiymatni ko'rmayapti",
    response:
      "Tushunarli. Haqiqatan ham, sizga shunday tuyulayotgan bo'lishi mumkin. Lekin biz faqat narxni emas, balki xavfsizlikni sotyapmiz. Hozirgi arzon quvurlar tufayli bir yilda necha marta qaytarish yoki shikoyatlar bilan pul yo'qotishingiz mumkin? Bizning narximiz — bu sizning obro'ingizga berilgan sug'urta.",
    followUp:
      "Sovuq qo'ng'iroqda ishlatilgan variant: \"Sizga bir narsa qiziq — mahsulot narxi muhummi yoki sifati?\" deb so'rab keyin javobni davom ettirish",
    scriptIds: ["lead-orqali-tushgan", "sovuq-qongiroq"],
  },
  {
    id: "obj-fitting",
    label: "Fitinglar mos kelmaydi",
    keywords: ["fiting", "mos kelmaydi", "kalibrovka", "tushmaydi", "sifatsiz"],
    clientSays: "Fitinglar bir-biriga tushmaydi",
    realMeaning: "Oldingi tajribasida sifatsiz mahsulotdan xafa bo'lgan",
    response:
      "Bu juda muhim savol. Bizning fitinglarimiz Yevropa standartlarida (Germaniya texnologiyasida) aniq kalibrovka qilingan. Bu esa ustalar uchun tezkor va xatosiz o'rnatishni ta'minlaydi. Biz buning uchun maxsus kafolat beramiz.",
    followUp: "\"Menejerimizning sinov to'plamini tekshirib ko'ring\" — namuna yuborishni taklif qiling",
    scriptIds: ["lead-orqali-tushgan", "sovuq-qongiroq"],
  },
  {
    id: "obj-think",
    label: "O'ylab ko'raman",
    keywords: ["o'ylab ko'raman", "keyinroq", "vaqt kerak", "keyin o'ylayman"],
    clientSays: "Mayli, rahmat, hozir o'ylab ko'ray...",
    realMeaning: "Aniq to'xtatuvchi sabab bor, lekin aytishni istamayapti",
    response:
      "Albatta, o'ylab ko'rish kerak. Lekin vaqtingizni tejash uchun to'g'ridan-to'g'ri aniqlashtiray: Sizni hozir eng ko'p to'xtatib turgan narsa — narxmi, yoki nasiya shartlari haqidagi savollaringizmi?",
    followUp: "\"Sizga qanday ma'lumotni to'liq va to'g'ri yetkazib bera olmadim?\" — sababni aniq toping",
    scriptIds: ["lead-orqali-tushgan", "sovuq-qongiroq"],
  },
  {
    id: "obj-risk",
    label: "Risk qila olmayman",
    keywords: ["risk", "yangi mahsulot", "ishonch", "sotilmay qoladi", "qo'rqaman"],
    clientSays: "Risk qila olmayman",
    realMeaning: "Talab bo'lmay qolishidan yoki sotilmay qolishidan qo'rqyapti",
    response:
      "Ustalar bilan hamkorlik asosida ishlashni yo'lga qo'ymoqdamiz, shu sababli har bir tumanda bizning mahsulotlarimiz bo'lishi kerak — mahsulotga bo'lgan talab yuqori. Mijozlarni jalb qilish masalasini biz hal qilamiz.",
    followUp: "Marketing/mijoz jalb qilish qo'llab-quvvatlovini alohida ta'kidlang",
    scriptIds: ["lead-orqali-tushgan"],
  },
];
