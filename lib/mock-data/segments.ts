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
    name: "[Residential Contractors]",
    pains: ["[Pain point placeholder 1]", "[Pain point placeholder 2]"],
    decisionMakers: "[Owner / lead installer]",
    buyingCycle: "[1–2 weeks — placeholder]",
    avgDealSize: "[$— placeholder]",
    bestProduct: "[Product Line A — Placeholder]",
    bestArgument: "[Placeholder argument]",
    commonObjection: "[Placeholder objection]",
  },
  {
    slug: "commercial-developers",
    name: "[Commercial Developers]",
    pains: ["[Pain point placeholder 1]", "[Pain point placeholder 2]"],
    decisionMakers: "[Procurement manager / project engineer]",
    buyingCycle: "[4–8 weeks — placeholder]",
    avgDealSize: "[$— placeholder]",
    bestProduct: "[Product Line B — Placeholder]",
    bestArgument: "[Placeholder argument]",
    commonObjection: "[Placeholder objection]",
  },
  {
    slug: "industrial-plants",
    name: "[Industrial Plants]",
    pains: ["[Pain point placeholder 1]", "[Pain point placeholder 2]"],
    decisionMakers: "[Plant manager / procurement committee]",
    buyingCycle: "[2–4 months — placeholder]",
    avgDealSize: "[$— placeholder]",
    bestProduct: "[Product Line C — Placeholder]",
    bestArgument: "[Placeholder argument]",
    commonObjection: "[Placeholder objection]",
  },
];
