export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  sourcePage: string;
  timesAsked: number;
  lastUpdated: string;
}

export const faqItems: FaqItem[] = [
  { id: "faq-1", question: "[Placeholder question about pricing?]", answer: "[Placeholder answer.]", sourcePage: "/products/price-sheet", timesAsked: 42, lastUpdated: "Aug 2026" },
  { id: "faq-2", question: "[Placeholder question about delivery time?]", answer: "[Placeholder answer.]", sourcePage: "/logistics/delivery-terms", timesAsked: 37, lastUpdated: "Aug 2026" },
  { id: "faq-3", question: "[Placeholder question about warranty?]", answer: "[Placeholder answer.]", sourcePage: "/products/warranty-service", timesAsked: 29, lastUpdated: "Jul 2026" },
  { id: "faq-4", question: "[Placeholder question about discounts?]", answer: "[Placeholder answer.]", sourcePage: "/products/discount-policy", timesAsked: 24, lastUpdated: "Jul 2026" },
  { id: "faq-5", question: "[Placeholder question about returns?]", answer: "[Placeholder answer.]", sourcePage: "/logistics/returns-policy", timesAsked: 18, lastUpdated: "Jun 2026" },
  { id: "faq-6", question: "[Placeholder question about custom orders?]", answer: "[Placeholder answer.]", sourcePage: "/products/technical-faq", timesAsked: 15, lastUpdated: "Jun 2026" },
  { id: "faq-7", question: "[Placeholder question about payment terms?]", answer: "[Placeholder answer.]", sourcePage: "/sales-process/payment-terms", timesAsked: 12, lastUpdated: "May 2026" },
  { id: "faq-8", question: "[Placeholder question about tender documents?]", answer: "[Placeholder answer.]", sourcePage: "/sales-process/tender-procurement", timesAsked: 9, lastUpdated: "May 2026" },
];
