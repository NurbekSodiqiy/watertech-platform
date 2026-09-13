import { describe, expect, it } from "vitest";
import { buildSearchDocs, createSearcher } from "@/lib/search/index";
import type { ContentBundle } from "@/lib/content/loader";

const bundle: ContentBundle = {
  scripts: [
    {
      id: "script1",
      name: "Script 1",
      cheatSheet: "",
      stages: [
        {
          id: "stage1",
          label: "Bosqich 1",
          turns: [{ speaker: "operator", text: "Salom, umumiy taklif shu." }],
          objectionIds: ["obj-qimmat"],
        },
      ],
    },
  ],
  objections: [
    {
      id: "obj-qimmat",
      label: "Narxi qimmat",
      keywords: ["qimmat"],
      clientSays: "Narxi qimmat",
      realMeaning: "Qiymatni ko'rmayapti",
      response: "Umumiy narx tushuntirish",
      scriptIds: ["script1"],
    },
  ],
  faqs: [{ id: "faq1", category: "umumiy", question: "Savol?", answer: "Umumiy javob" }],
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
  packageGroups: [
    {
      id: "pg1",
      title: "Paketlar",
      subtitle: "",
      packages: [
        {
          id: "pkg1",
          name: "Paket 1",
          isFeatured: false,
          orderVolume: "Umumiy hajm",
          paymentTerms: "",
          estimatedDiscount: "",
          discountPct: 0,
          advancePct: null,
          logistics: "",
          deliveryTime: "",
        },
      ],
    },
  ],
};

describe("buildSearchDocs", () => {
  it("produces one doc per objection/stage/faq/competitor/package", () => {
    const docs = buildSearchDocs(bundle);
    expect(docs).toHaveLength(5);
    expect(docs.map((d) => d.type).sort()).toEqual(
      ["objection", "script_stage", "faq", "competitor", "package"].sort()
    );
  });
});

describe("createSearcher", () => {
  it("returns the 'Narxi qimmat' objection first for a matching query", () => {
    const docs = buildSearchDocs(bundle);
    const results = createSearcher(docs).searchAll("qimmat");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].title).toBe("Narxi qimmat");
  });

  it("excludes faq/package docs from Call Mode search", () => {
    const docs = buildSearchDocs(bundle);
    // "umumiy" appears in the objection's response, the stage's turn text,
    // the faq's answer, and the package's orderVolume — a query broad
    // enough to match all four doc types if the filter weren't applied.
    const results = createSearcher(docs).searchCallMode("umumiy", "script1");
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.type === "objection" || r.type === "script_stage")).toBe(true);
  });
});
