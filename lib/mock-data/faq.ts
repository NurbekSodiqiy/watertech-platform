export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sourcePage: string;
  timesAsked: number;
  lastUpdated: string;
}

export const faqItems: FaqItem[] = [
  { id: "faq-1", question: "[Narxlar haqidagi joy egallovchi savol?]", answer: "[Joy egallovchi javob.]", sourcePage: "/products/price-sheet", timesAsked: 42, lastUpdated: "avg, 2026" },
  { id: "faq-2", question: "[Yetkazib berish muddati haqidagi joy egallovchi savol?]", answer: "[Joy egallovchi javob.]", sourcePage: "/logistics/delivery-terms", timesAsked: 37, lastUpdated: "avg, 2026" },
  { id: "faq-3", question: "[Kafolat haqidagi joy egallovchi savol?]", answer: "[Joy egallovchi javob.]", sourcePage: "/products/warranty-service", timesAsked: 29, lastUpdated: "iyul, 2026" },
  { id: "faq-4", question: "[Chegirmalar haqidagi joy egallovchi savol?]", answer: "[Joy egallovchi javob.]", sourcePage: "/products/discount-policy", timesAsked: 24, lastUpdated: "iyul, 2026" },
  { id: "faq-5", question: "[Qaytarish haqidagi joy egallovchi savol?]", answer: "[Joy egallovchi javob.]", sourcePage: "/logistics/returns-policy", timesAsked: 18, lastUpdated: "iyun, 2026" },
  { id: "faq-6", question: "[Buyurtma bo'yicha maxsus talablar haqidagi joy egallovchi savol?]", answer: "[Joy egallovchi javob.]", sourcePage: "/products/technical-faq", timesAsked: 15, lastUpdated: "iyun, 2026" },
  { id: "faq-7", question: "[To'lov shartlari haqidagi joy egallovchi savol?]", answer: "[Joy egallovchi javob.]", sourcePage: "/sales-process/payment-terms", timesAsked: 12, lastUpdated: "may, 2026" },
  { id: "faq-8", question: "[Tender hujjatlari haqidagi joy egallovchi savol?]", answer: "[Joy egallovchi javob.]", sourcePage: "/sales-process/tender-procurement", timesAsked: 9, lastUpdated: "may, 2026" },
];
