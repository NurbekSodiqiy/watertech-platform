import { describe, expect, it } from "vitest";
import type { ContentBundle } from "@/lib/content/loader";
import type { Product } from "@/lib/content/products";
import {
  MAX_CHUNK_CHARS,
  MAX_CONTEXT_CHARS,
  buildCopilotDocs,
  createCopilotIndex,
  queryTokens,
} from "@/lib/copilot/docs";
import { buildSearchDocs } from "@/lib/search/index";

const bundle: ContentBundle = {
  scripts: [
    {
      id: "script1",
      name: "Lead orqali tushgan",
      cheatSheet: "",
      stages: [
        {
          id: "salom",
          label: "Salomlashish",
          turns: [{ speaker: "operator", text: "Assalomu alaykum, WaterTech kompaniyasidan qo'ng'iroq qilyapman." }],
          objectionIds: [],
        },
        { id: "etiroz", label: "E'tiroz ustida ishlash", turns: [], objectionIds: ["obj-qimmat"] },
      ],
    },
  ],
  objections: [
    {
      id: "obj-qimmat",
      label: "Narxi qimmat",
      keywords: ["qimmat", "narx"],
      clientSays: "Sizlarda narx qimmat ekan",
      realMeaning: "Qiymatni ko'rmayapti",
      response: "Sifat sertifikati bor, 10 yil kafolat beramiz",
      followUp: "Hajmni aniqlab olamizmi?",
      scriptIds: ["script1"],
    },
  ],
  faqs: [{ id: "faq-kafolat", category: "umumiy", question: "Kafolat muddati qancha?", answer: "Trubalarga 10 yil kafolat." }],
  competitors: [],
  packageGroups: [
    {
      id: "pg1",
      title: "Diler paketlari",
      subtitle: "",
      packages: [
        {
          id: "pkg-start",
          name: "Start paketi",
          isFeatured: false,
          orderVolume: "50 mln so'mdan",
          paymentTerms: "100% oldindan",
          estimatedDiscount: "~5%",
          discountPct: 5,
          advancePct: null,
          logistics: "Samovyvoz yoki yetkazib berish",
          deliveryTime: "3 ish kuni",
        },
      ],
    },
  ],
};

const products: Product[] = [
  {
    id: "truba-ppr",
    filename: "truba-ppr.jpg",
    name_ru: "Труба ППР",
    sizes: ["Ø20", "Ø25"],
    line: "ppr",
    category: "truba",
  },
];

describe("buildCopilotDocs", () => {
  const docs = buildCopilotDocs(bundle, products);

  it("covers every palette search doc plus one doc per product", () => {
    expect(docs).toHaveLength(buildSearchDocs(bundle).length + products.length);
    expect(docs.map((d) => d.type).sort()).toEqual(["faq", "objection", "package", "product", "script_stage"]);
  });

  it("uses the full raw body, not the palette snippet", () => {
    const objection = docs.find((d) => d.id === "objection:obj-qimmat");
    expect(objection?.text).toContain("Qiymatni ko'rmayapti");
    expect(objection?.text).toContain("Hajmni aniqlab olamizmi?");

    const pkg = docs.find((d) => d.id === "package:pkg-start");
    expect(pkg?.text).toContain("3 ish kuni");
    expect(pkg?.text).toContain("Samovyvoz");
  });

  it("derives hrefs from the same nav the palette resolves", () => {
    expect(docs.find((d) => d.id === "objection:obj-qimmat")?.href).toBe(
      "/sales-process/scripts?script=script1&stage=etiroz&objection=obj-qimmat"
    );
    expect(docs.find((d) => d.id === "stage:script1:salom")?.href).toBe(
      "/sales-process/scripts?script=script1&stage=salom"
    );
    expect(docs.find((d) => d.type === "faq")?.href).toBe("/sales-process/scripts?tab=faq");
    expect(docs.find((d) => d.type === "product")?.href).toBe("/products");
  });
});

describe("queryTokens", () => {
  it("drops question filler and short tokens, keeps content words", () => {
    expect(queryTokens("Mijoz narx qimmat desa nima deyish kerak?")).toEqual(["narx", "qimmat", "deyish"]);
  });

  it("normalizes Cyrillic and apostrophes like the search index does", () => {
    expect(queryTokens("Какая труба?")).toEqual(["truba"]);
    expect(queryTokens("yetkazib berish qo'ng'iroq")).toContain("qongiroq");
  });
});

describe("createCopilotIndex", () => {
  const index = createCopilotIndex(buildCopilotDocs(bundle, products));

  it("ranks the objection first for an objection question", () => {
    const hits = index.search("Mijoz narx qimmat desa nima deyman?");
    expect(hits[0]?.id).toBe("objection:obj-qimmat");
  });

  it("finds package delivery terms that the palette index doesn't match on", () => {
    const hits = index.search("Start paketi yetkazib berish muddati");
    expect(hits[0]?.id).toBe("package:pkg-start");
  });

  it("finds products from a Cyrillic question", () => {
    expect(index.search("Труба ППР размеры").map((h) => h.id)).toContain("product:truba-ppr");
  });

  it("returns nothing for an unrelated question", () => {
    expect(index.search("Toshkentda ob-havo qanday bo'ladi?")).toEqual([]);
  });

  it("caps each chunk and the total context", () => {
    const long = "kafolat ".repeat(400);
    const bigBundle: ContentBundle = {
      ...bundle,
      faqs: Array.from({ length: 10 }, (_, i) => ({
        id: `faq-${i}`,
        category: "umumiy",
        question: `Kafolat savoli ${i}`,
        answer: long,
      })),
    };
    const hits = createCopilotIndex(buildCopilotDocs(bigBundle, [])).search("kafolat", 8);
    expect(hits.length).toBeGreaterThan(0);
    for (const hit of hits) expect(hit.text.length).toBeLessThanOrEqual(MAX_CHUNK_CHARS);
    expect(hits.reduce((sum, h) => sum + h.text.length, 0)).toBeLessThanOrEqual(MAX_CONTEXT_CHARS);
  });
});
