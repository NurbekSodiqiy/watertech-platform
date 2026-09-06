export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const salesQuizQuestions: QuizQuestion[] = [
  {
    question: "Mijoz \"narxingiz qimmat\" desa, birinchi navbatda nima qilish kerak?",
    options: [
      "Narx emas, xavfsizlik/kafolatni sotayotganingizni tushuntirish va arzon mahsulotdan yo'qotish xavfini eslatish",
      "Darhol chegirma taklif qilish",
      "\"Boshqa joydan arzonroq topolmaysiz\" deb bahslashish",
    ],
    correctIndex: 0,
    explanation:
      "Narx emas, xavfsizlik va kafolatni sotayotganingizni tushuntiring — arzon mahsulotdan kelib chiqadigan yo'qotish xavfini eslating.",
  },
  {
    question: "Mijoz \"hozir o'ylab ko'raman\" desa, eng to'g'ri javob qaysi?",
    options: [
      "Aniq nimasi to'xtatib turganini (narxmi, shartlarmi) aniqlashtiruvchi savol berish",
      "\"Yaxshi, kutaman\" deb qo'ng'iroqni yakunlash",
      "Darhol boshqa mahsulot taklif qilish",
    ],
    correctIndex: 0,
    explanation:
      "\"O'ylab ko'raman\" maqsadsiz javob hisoblanadi — har doim nimasi aniq to'xtatib turganini aniqlashtiruvchi savol bilan davom eting.",
  },
  {
    question: "Sovuq qo'ng'iroqda ЛПР (qaror qabul qiluvchi)ni qanday aniqlaymiz?",
    options: [
      "\"Qaysi pozitsiyada faoliyat yuritishingizni bilsam bo'ladi?\" deb muloyimlik bilan so'rash",
      "To'g'ridan-to'g'ri \"Siz qaror qabul qiluvchimisiz?\" deb so'rash",
      "Bu savolni umuman bermaslik",
    ],
    correctIndex: 0,
    explanation:
      "ЛПРni aniqlashda pozitsiyasini muloyimlik bilan so'rash kifoya — to'g'ridan-to'g'ri qaror huquqi haqida so'rash noqulay tuyulishi mumkin.",
  },
  {
    question: "Usta bilan suhbatda \"Usta Klubi\" dasturiga jalb qilishning kaliti nima?",
    options: [
      "Ustaning tavsiya sababini (narx/ishonch/bonus) va qaysi bonus turini afzal ko'rishini aniqlash",
      "Darhol pul mukofoti taklif qilish",
      "Faqat mahsulot sifatini maqtash",
    ],
    correctIndex: 0,
    explanation:
      "Avval ustaning tavsiya qilish motivatsiyasini (narx, ishonch yoki bonus) va qaysi bonus turini afzal ko'rishini aniqlang — shundan keyingina mos taklif bering.",
  },
  {
    question: "FAB formulasida \"B\" (Benefit/Foyda) nimani anglatadi?",
    options: [
      "Xususiyat va afzallikning mijoz uchun aniq amaliy natijasi (masalan, obro' tiklash, xavfsiz oborot)",
      "Mahsulotning texnik xususiyati",
      "Mahsulotning narxi",
    ],
    correctIndex: 0,
    explanation:
      "Foyda (Benefit) — xususiyat va afzallikning mijoz uchun aniq amaliy natijasi, masalan obro'ni tiklash yoki xavfsiz oborot.",
  },
];
