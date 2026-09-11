import type { Faq } from "./types";

// Real Q&A text, ported verbatim from what used to live inline in
// app/sales-process/scripts/page.tsx (the only place it was ever shown) —
// this is now the single source /faq and that page both read from.
export const faqs: Faq[] = [
  {
    id: "product-1",
    category: "Mahsulot haqida",
    question: "Polipropilen quvurlarning kafolat muddati qancha?",
    answer: "WaterTech mahsulotlari uchun 10 yil muddat kafolat beriladi, foydalanish muddati 50 yil",
  },
  {
    id: "product-2",
    category: "Mahsulot haqida",
    question: "Qaysi standartlarga javob beradi?",
    answer: "WaterTech mahsulotlari ISO va GOST sertifikatlariga ega.",
  },
  {
    id: "product-3",
    category: "Mahsulot haqida",
    question: "Montaj qilish qiyin emasmi?",
    answer: "Mahsulotlar tarkibi sifatli xomashyolardan (asl polipropilen) tashkil topgan, shu sababli foydalanishda ya'ni montaj jarayonlarni mijozga qiyinchilik tug'dirmaydi",
  },
  {
    id: "product-4",
    category: "Mahsulot haqida",
    question: "Issiq suvga bardosh beradimi?",
    answer: "Issiq suv uchun mo'ljallangan quvurlarimiz 80 gradus issiqlik darajasi uchun mo'ljallangan",
  },
  {
    id: "delivery-1",
    category: "Yetkazish",
    question: "Toshkentga yetkazib berish qancha vaqt oladi?",
    answer: "24 soat ichida yetkazib beramiz",
  },
  {
    id: "delivery-2",
    category: "Yetkazish",
    question: "Minimal buyurtma hajmi bormi?",
    answer: "Minimal buyurtma hajmi 15 mln",
  },
  {
    id: "delivery-3",
    category: "Yetkazish",
    question: "Yetkazish narxi qanday hisoblanadi?",
    answer: "Yangi mijozlar uchun yetkazish xizmati kompaniya tomonidan qoplanadi",
  },
  {
    id: "delivery-4",
    category: "Yetkazish",
    question: "Viloyatlarga yetkazib beramizmi?",
    answer: "12 ta viloyatga kelishuv asosida yetkazib beramiz.",
  },
  {
    id: "payment-1",
    category: "To'lov",
    question: "Qanday to'lov usullari mavjud?",
    answer: "Istalgan to'lov usuli mavjud (naqd, click, perechisleniya)",
  },
  {
    id: "payment-2",
    category: "To'lov",
    question: "Nasiyaga olish mumkinmi?",
    answer: "Yuridik shartnoma va oldindan 50% to'lov asosida xarid qilish mumkin",
  },
  {
    id: "payment-3",
    category: "To'lov",
    question: "Chegirmalar qachon beriladi?",
    answer: "Mahsulotlarimiz turidan kelib chiqib 15% gacha chegirmalarimiz mavjud",
  },
  {
    id: "payment-4",
    category: "To'lov",
    question: "Avans to'lash kerakmi?",
    answer: "Yangi mijozlar uchun 50% avans to'lab xarid qilish mumkin.",
  },
];
