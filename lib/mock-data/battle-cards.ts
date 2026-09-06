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
    competitor: "[A raqobatchisi]",
    strongSegment: "[Sanoat, yirik hajmdagi shartnomalar]",
    theirStrengths: [
      "[Joy egallovchi ustunlik 1 — masalan, pastroq ro'yxat narxi]",
      "[Joy egallovchi ustunlik 2 — masalan, mintaqaviy yetkazib berish tezligi]",
      "[Joy egallovchi ustunlik 3 — masalan, bozorda uzoqroq mavjudligi]",
    ],
    ourStrengths: [
      { point: "[Joy egallovchi ustunlik 1]", proof: "[Isbot / statistika — joy egallovchi]" },
      { point: "[Joy egallovchi ustunlik 2]", proof: "[Isbot / statistika — joy egallovchi]" },
      { point: "[Joy egallovchi ustunlik 3]", proof: "[Isbot / statistika — joy egallovchi]" },
    ],
    objectionResponses: [
      { theirClaim: "[\"Ular arzonroq.\"]", response: "[Joy egallovchi javob.]" },
      { theirClaim: "[\"Ular tezroq.\"]", response: "[Joy egallovchi javob.]" },
    ],
    neverSay: [
      "[Joy egallovchi — raqobatchini nomi bilan yomonlamang.]",
      "[Joy egallovchi — tasdiqlay olmaydigan yetkazib berish sanasini va'da qilmang.]",
    ],
    wonLostDeals: [
      { deal: "[Bitim — joy egallovchi]", outcome: "Won", note: "[Cheklangan tafsilot]" },
      { deal: "[Bitim — joy egallovchi]", outcome: "Lost", note: "[Cheklangan tafsilot]" },
    ],
  },
  {
    slug: "competitor-b",
    competitor: "[B raqobatchisi]",
    strongSegment: "[Turar-joy, kichik pudratchilar]",
    theirStrengths: [
      "[Joy egallovchi ustunlik 1 — masalan, keng chakana tarmoq]",
      "[Joy egallovchi ustunlik 2 — masalan, brend tanilganligi]",
      "[Joy egallovchi ustunlik 3 — masalan, to'plam sifatidagi kitlar]",
    ],
    ourStrengths: [
      { point: "[Joy egallovchi ustunlik 1]", proof: "[Isbot / statistika — joy egallovchi]" },
      { point: "[Joy egallovchi ustunlik 2]", proof: "[Isbot / statistika — joy egallovchi]" },
      { point: "[Joy egallovchi ustunlik 3]", proof: "[Isbot / statistika — joy egallovchi]" },
    ],
    objectionResponses: [
      { theirClaim: "[\"Ular hamma yerda bor.\"]", response: "[Joy egallovchi javob.]" },
      { theirClaim: "[\"Ularning brendini hamma biladi.\"]", response: "[Joy egallovchi javob.]" },
    ],
    neverSay: [
      "[Joy egallovchi — raqobatchini nomi bilan yomonlamang.]",
      "[Joy egallovchi — tasdiqlanmagan texnik ko'rsatkichlarni keltirmang.]",
    ],
    wonLostDeals: [
      { deal: "[Bitim — joy egallovchi]", outcome: "Won", note: "[Cheklangan tafsilot]" },
      { deal: "[Bitim — joy egallovchi]", outcome: "Lost", note: "[Cheklangan tafsilot]" },
    ],
  },
];
