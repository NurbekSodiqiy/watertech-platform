export interface BattleCard {
  slug: string;
  competitor: string;
  strongSegment: string;
  theirStrengths: string[];
  ourStrengths: { point: string; proof: string }[];
  objectionResponses: { theirClaim: string; response: string }[];
  neverSay: string[];
  wonLostDeals: { deal: string; outcome: "Won" | "Lost"; note: string }[];
}

export const battleCards: BattleCard[] = [
  {
    slug: "competitor-a",
    competitor: "[Competitor A]",
    strongSegment: "[Industrial, large-volume contracts]",
    theirStrengths: [
      "[Placeholder strength 1 — e.g. lower list price]",
      "[Placeholder strength 2 — e.g. faster regional delivery]",
      "[Placeholder strength 3 — e.g. longer market presence]",
    ],
    ourStrengths: [
      { point: "[Placeholder strength 1]", proof: "[Proof point / stat placeholder]" },
      { point: "[Placeholder strength 2]", proof: "[Proof point / stat placeholder]" },
      { point: "[Placeholder strength 3]", proof: "[Proof point / stat placeholder]" },
    ],
    objectionResponses: [
      { theirClaim: "[\"They're cheaper.\"]", response: "[Placeholder response.]" },
      { theirClaim: "[\"They're faster.\"]", response: "[Placeholder response.]" },
    ],
    neverSay: [
      "[Placeholder — never disparage the competitor by name.]",
      "[Placeholder — never guarantee a delivery date we can't confirm.]",
    ],
    wonLostDeals: [
      { deal: "[Deal — Placeholder]", outcome: "Won", note: "[Restricted detail]" },
      { deal: "[Deal — Placeholder]", outcome: "Lost", note: "[Restricted detail]" },
    ],
  },
  {
    slug: "competitor-b",
    competitor: "[Competitor B]",
    strongSegment: "[Residential, small contractors]",
    theirStrengths: [
      "[Placeholder strength 1 — e.g. wide retail distribution]",
      "[Placeholder strength 2 — e.g. brand recognition]",
      "[Placeholder strength 3 — e.g. bundled kits]",
    ],
    ourStrengths: [
      { point: "[Placeholder strength 1]", proof: "[Proof point / stat placeholder]" },
      { point: "[Placeholder strength 2]", proof: "[Proof point / stat placeholder]" },
      { point: "[Placeholder strength 3]", proof: "[Proof point / stat placeholder]" },
    ],
    objectionResponses: [
      { theirClaim: "[\"They're everywhere.\"]", response: "[Placeholder response.]" },
      { theirClaim: "[\"Everyone knows their brand.\"]", response: "[Placeholder response.]" },
    ],
    neverSay: [
      "[Placeholder — never disparage the competitor by name.]",
      "[Placeholder — never quote unverified specs.]",
    ],
    wonLostDeals: [
      { deal: "[Deal — Placeholder]", outcome: "Won", note: "[Restricted detail]" },
      { deal: "[Deal — Placeholder]", outcome: "Lost", note: "[Restricted detail]" },
    ],
  },
];
