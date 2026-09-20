import { describe, expect, it } from "vitest";
import { buildContentRefs, refKey } from "@/lib/search/refs";
import type { ContentBundle } from "@/lib/content/loader";
import type { Product } from "@/lib/content/products";

const bundle: ContentBundle = {
  scripts: [
    {
      id: "script1",
      name: "Script 1",
      cheatSheet: "",
      stages: [
        { id: "stage1", label: "Bosqich 1", turns: [], objectionIds: ["obj-qimmat"] },
        { id: "stage2", label: "Bosqich 2", turns: [], objectionIds: [] },
      ],
    },
  ],
  objections: [
    { id: "obj-qimmat", label: "Narxi qimmat", keywords: [], clientSays: "", realMeaning: "", response: "", scriptIds: ["script1"] },
    { id: "obj-orphan", label: "Hech qayerda yo'q", keywords: [], clientSays: "", realMeaning: "", response: "", scriptIds: [] },
  ],
  faqs: [{ id: "faq1", category: "To'lov", question: "Savol?", answer: "Javob" }],
  competitors: [
    {
      id: "comp1",
      name: "Raqobatchi",
      assortment: "",
      baseDiscount: "",
      volumeDiscount: "",
      retroBonus: "",
      maxDiscount: "",
      paymentTerms: "",
      paymentMethod: "",
      deliveryTime: "",
      logistics: "",
      dealerCoverage: "",
      certificates: "",
      marketingOffers: "",
      threatLevel: "Yuqori",
    },
  ],
  packageGroups: [],
};

const products: Product[] = [
  { id: "truba-ppr", filename: "truba-ppr.jpg", name_ru: "Труба ППР", sizes: [], line: "ppr", category: "truba" },
];

describe("buildContentRefs", () => {
  const refs = buildContentRefs(bundle, products);
  const byKey = new Map(refs.map((r) => [refKey(r), r]));

  it("has one entry per pin kind, keyed by kind and id", () => {
    expect([...byKey.keys()].sort()).toEqual(
      ["battleCard:comp1", "faq:faq1", "objection:obj-qimmat", "product:truba-ppr", "script:script1"].sort()
    );
  });

  it("links each kind to where it opens", () => {
    expect(byKey.get("script:script1")?.href).toBe("/sales-process/scripts?script=script1");
    expect(byKey.get("objection:obj-qimmat")?.href).toBe(
      "/sales-process/scripts?script=script1&stage=stage1&objection=obj-qimmat"
    );
    expect(byKey.get("faq:faq1")?.href).toBe("/sales-process/scripts?tab=faq&faq=faq1");
    expect(byKey.get("battleCard:comp1")?.href).toBe("/sales-process/battle-cards/comp1");
    expect(byKey.get("product:truba-ppr")?.href).toBe("/products?product=truba-ppr");
  });

  it("carries a script's stage labels for the continue card", () => {
    expect(byKey.get("script:script1")?.stages).toEqual([
      { id: "stage1", label: "Bosqich 1" },
      { id: "stage2", label: "Bosqich 2" },
    ]);
  });

  it("leaves out an objection no script surfaces", () => {
    expect(byKey.has("objection:obj-orphan")).toBe(false);
  });
});
