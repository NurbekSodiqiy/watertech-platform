export interface CaseStudy {
  slug: string;
  client: string;
  problem: string;
  solution: string;
  resultNumber: string;
  usedForObjection: string;
}

export const caseStudies: CaseStudy[] = [
  {
    slug: "case-study-one",
    client: "[Mijoz — joy egallovchi A]",
    problem: "[Mijoz duch kelgan muammoning joy egallovchi tavsifi.]",
    solution: "[Taklif qilingan yechimning joy egallovchi tavsifi.]",
    resultNumber: "[+—% joy egallovchi natija]",
    usedForObjection: "[\"Narxingiz juda yuqori.\"]",
  },
  {
    slug: "case-study-two",
    client: "[Mijoz — joy egallovchi B]",
    problem: "[Mijoz duch kelgan muammoning joy egallovchi tavsifi.]",
    solution: "[Taklif qilingan yechimning joy egallovchi tavsifi.]",
    resultNumber: "[-—% joy egallovchi natija]",
    usedForObjection: "[\"Biz allaqachon boshqa yetkazib beruvchi bilan ishlaymiz.\"]",
  },
  {
    slug: "case-study-three",
    client: "[Mijoz — joy egallovchi C]",
    problem: "[Mijoz duch kelgan muammoning joy egallovchi tavsifi.]",
    solution: "[Taklif qilingan yechimning joy egallovchi tavsifi.]",
    resultNumber: "[+—x joy egallovchi natija]",
    usedForObjection: "[\"Yetkazib berish muddati juda uzoq.\"]",
  },
];
