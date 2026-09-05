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
    client: "[Client — Placeholder A]",
    problem: "[Placeholder description of the problem the client faced.]",
    solution: "[Placeholder description of the solution provided.]",
    resultNumber: "[+—% placeholder result]",
    usedForObjection: "[\"Your price is too high.\"]",
  },
  {
    slug: "case-study-two",
    client: "[Client — Placeholder B]",
    problem: "[Placeholder description of the problem the client faced.]",
    solution: "[Placeholder description of the solution provided.]",
    resultNumber: "[-—% placeholder result]",
    usedForObjection: "[\"We already work with another supplier.\"]",
  },
  {
    slug: "case-study-three",
    client: "[Client — Placeholder C]",
    problem: "[Placeholder description of the problem the client faced.]",
    solution: "[Placeholder description of the solution provided.]",
    resultNumber: "[+—x placeholder result]",
    usedForObjection: "[\"Delivery time is too long.\"]",
  },
];
