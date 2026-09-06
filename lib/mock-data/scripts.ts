export interface SalesScript {
  slug: string;
  title: string;
  goal: string;
  successCriteria: string;
  opening: string;
  situationQuestions: string[];
  problemQuestions: string[];
  implicationQuestions: string[];
  needPayoffQuestions: string[];
  presentationBlock: string;
  nextStepCommitment: string;
  dontDo: string[];
}

export const scripts: SalesScript[] = [
  {
    slug: "first-call-discovery",
    title: "[Birinchi qo'ng'iroq — Aniqlash]",
    goal: "[Joy egallovchi — masalan, lidni saralash va texnik kuzatuvni belgilash.]",
    successCriteria: "[Joy egallovchi — masalan, mijoz sanasi belgilangan keyingi uchrashuvga rozi bo'ladi.]",
    opening: "[Qo'ng'iroq sababini belgilaydigan joy egallovchi kirish gapi.]",
    situationQuestions: [
      "[Vaziyat savoli 1 — joy egallovchi]",
      "[Vaziyat savoli 2 — joy egallovchi]",
      "[Vaziyat savoli 3 — joy egallovchi]",
    ],
    problemQuestions: [
      "[Muammo savoli 1 — joy egallovchi]",
      "[Muammo savoli 2 — joy egallovchi]",
      "[Muammo savoli 3 — joy egallovchi]",
    ],
    implicationQuestions: [
      "[Oqibat savoli 1 — joy egallovchi]",
      "[Oqibat savoli 2 — joy egallovchi]",
    ],
    needPayoffQuestions: [
      "[Ehtiyoj-natija savoli 1 — joy egallovchi]",
      "[Ehtiyoj-natija savoli 2 — joy egallovchi]",
    ],
    presentationBlock: "[Joy egallovchi — ehtiyojlar tasdiqlangach mos yechimni qanday taqdim etish kerak.]",
    nextStepCommitment: "[Joy egallovchi — so'raladigan aniq keyingi qadam.]",
    dontDo: [
      "[Qilmang — joy egallovchi 1]",
      "[Qilmang — joy egallovchi 2]",
      "[Qilmang — joy egallovchi 3]",
      "[Qilmang — joy egallovchi 4]",
      "[Qilmang — joy egallovchi 5]",
    ],
  },
  {
    slug: "renewal-upsell",
    title: "[Uzaytirish / Qo'shimcha sotuv qo'ng'irog'i]",
    goal: "[Joy egallovchi — masalan, mavjud hisobni yangi mahsulot turkumiga kengaytirish.]",
    successCriteria: "[Joy egallovchi — masalan, namuna buyurtmasi so'raladi.]",
    opening: "[Mavjud munosabatga ishora qiluvchi joy egallovchi kirish gapi.]",
    situationQuestions: [
      "[Vaziyat savoli 1 — joy egallovchi]",
      "[Vaziyat savoli 2 — joy egallovchi]",
      "[Vaziyat savoli 3 — joy egallovchi]",
    ],
    problemQuestions: [
      "[Muammo savoli 1 — joy egallovchi]",
      "[Muammo savoli 2 — joy egallovchi]",
      "[Muammo savoli 3 — joy egallovchi]",
    ],
    implicationQuestions: [
      "[Oqibat savoli 1 — joy egallovchi]",
      "[Oqibat savoli 2 — joy egallovchi]",
    ],
    needPayoffQuestions: [
      "[Ehtiyoj-natija savoli 1 — joy egallovchi]",
      "[Ehtiyoj-natija savoli 2 — joy egallovchi]",
    ],
    presentationBlock: "[Joy egallovchi — yondosh mahsulot turkumini qanday tanishtirish kerak.]",
    nextStepCommitment: "[Joy egallovchi — so'raladigan aniq keyingi qadam.]",
    dontDo: [
      "[Qilmang — joy egallovchi 1]",
      "[Qilmang — joy egallovchi 2]",
      "[Qilmang — joy egallovchi 3]",
      "[Qilmang — joy egallovchi 4]",
      "[Qilmang — joy egallovchi 5]",
    ],
  },
];
