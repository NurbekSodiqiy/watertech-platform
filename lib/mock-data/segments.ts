export interface Segment {
  slug: string;
  name: string;
  pains: string[];
  decisionMakers: string;
  buyingCycle: string;
  avgDealSize: string;
  bestProduct: string;
  bestArgument: string;
  commonObjection: string;
}

export const segments: Segment[] = [
  {
    slug: "residential-contractors",
    name: "[Turar-joy pudratchilari]",
    pains: ["[Muammo nuqtasi — joy egallovchi 1]", "[Muammo nuqtasi — joy egallovchi 2]"],
    decisionMakers: "[Egasi / bosh montajchi]",
    buyingCycle: "[1–2 hafta — joy egallovchi]",
    avgDealSize: "[$— joy egallovchi]",
    bestProduct: "[A turkumi — joy egallovchi]",
    bestArgument: "[Joy egallovchi argument]",
    commonObjection: "[Joy egallovchi e'tiroz]",
  },
  {
    slug: "commercial-developers",
    name: "[Tijorat quruvchilari]",
    pains: ["[Muammo nuqtasi — joy egallovchi 1]", "[Muammo nuqtasi — joy egallovchi 2]"],
    decisionMakers: "[Xarid menejeri / loyiha muhandisi]",
    buyingCycle: "[4–8 hafta — joy egallovchi]",
    avgDealSize: "[$— joy egallovchi]",
    bestProduct: "[B turkumi — joy egallovchi]",
    bestArgument: "[Joy egallovchi argument]",
    commonObjection: "[Joy egallovchi e'tiroz]",
  },
  {
    slug: "industrial-plants",
    name: "[Sanoat korxonalari]",
    pains: ["[Muammo nuqtasi — joy egallovchi 1]", "[Muammo nuqtasi — joy egallovchi 2]"],
    decisionMakers: "[Zavod menejeri / xarid qo'mitasi]",
    buyingCycle: "[2–4 oy — joy egallovchi]",
    avgDealSize: "[$— joy egallovchi]",
    bestProduct: "[C turkumi — joy egallovchi]",
    bestArgument: "[Joy egallovchi argument]",
    commonObjection: "[Joy egallovchi e'tiroz]",
  },
];
