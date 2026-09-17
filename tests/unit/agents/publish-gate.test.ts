import { describe, expect, it } from "vitest";
import {
  PUBLISH_GATE_CHECKS,
  internalLinksResolve,
  linkedScriptsPublished,
  noDuplicateFaq,
  placeholderText,
  requiredNotBlank,
  ruTranslationPresent,
  runChecks,
  schemaValid,
  stagesNonEmpty,
  toGateResult,
} from "@/lib/agents/publish-gate/checks";
import type { GateIssue, GateTarget } from "@/lib/agents/publish-gate/types";
import {
  competitorToRow,
  faqToRow,
  objectionToRow,
  packageGroupToRow,
  packageToRow,
  productToRow,
  scriptToRow,
} from "@/lib/content/db";
import type { Faq, Objection, Package, Script } from "@/lib/content/types";
import {
  DRAFT_SCRIPT_ID,
  PUBLISHED_SCRIPT_ID,
  byId,
  contentBundle,
  gateContext,
  products,
} from "../../fixtures/content";

// Targets are built with the same *ToRow mappers the admin upserts use, so a
// fixture row is exactly what the gate sees before a real publish.

const ctx = gateContext();
const packageGroup = byId(contentBundle.packageGroups, "pg-diler");

function scriptTarget(id: string, patch: Partial<Script> = {}): GateTarget {
  return { table: "content_scripts", row: scriptToRow({ ...byId(contentBundle.scripts, id), ...patch }) };
}

function objectionTarget(id: string, patch: Partial<Objection> = {}): GateTarget {
  return { table: "content_objections", row: objectionToRow({ ...byId(contentBundle.objections, id), ...patch }) };
}

function faqTarget(id: string, patch: Partial<Faq> = {}): GateTarget {
  return { table: "content_faqs", row: faqToRow({ ...byId(contentBundle.faqs, id), ...patch }) };
}

function packageTarget(id: string, patch: Partial<Package> = {}, groupId = packageGroup.id): GateTarget {
  return { table: "content_packages", row: packageToRow({ ...byId(packageGroup.packages, id), ...patch }, groupId) };
}

function allFixtureTargets(): GateTarget[] {
  return [
    ...contentBundle.scripts.map((s): GateTarget => ({ table: "content_scripts", row: scriptToRow(s) })),
    ...contentBundle.objections.map((o): GateTarget => ({ table: "content_objections", row: objectionToRow(o) })),
    ...contentBundle.faqs.map((f): GateTarget => ({ table: "content_faqs", row: faqToRow(f) })),
    ...contentBundle.competitors.map((c): GateTarget => ({ table: "content_competitors", row: competitorToRow(c) })),
    { table: "content_package_groups", row: packageGroupToRow(packageGroup) },
    ...packageGroup.packages.map((p): GateTarget => ({ table: "content_packages", row: packageToRow(p, packageGroup.id) })),
    ...products.map((p): GateTarget => ({ table: "content_products", row: productToRow(p) })),
  ];
}

function codes(issues: GateIssue[]): string[] {
  return issues.map((i) => i.code);
}

describe("PUBLISH_GATE_CHECKS", () => {
  it("runs every check exactly once, in a stable order", () => {
    expect(PUBLISH_GATE_CHECKS).toEqual([
      schemaValid,
      requiredNotBlank,
      linkedScriptsPublished,
      internalLinksResolve,
      noDuplicateFaq,
      ruTranslationPresent,
      stagesNonEmpty,
      placeholderText,
    ]);
  });
});

describe("schemaValid", () => {
  it("passes every well-formed fixture row, across all seven tables", () => {
    for (const target of allFixtureTargets()) expect(schemaValid(target, ctx)).toEqual([]);
  });

  it("fails malformed stages JSONB instead of silently rendering an empty script", () => {
    const target: GateTarget = {
      table: "content_scripts",
      row: { ...scriptToRow(byId(contentBundle.scripts, PUBLISHED_SCRIPT_ID)), stages: [{ id: "salomlashish" }] },
    };
    const issues = schemaValid(target, ctx);
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every((i) => i.code === "schema_invalid" && i.severity === "error")).toBe(true);
    expect(issues.map((i) => i.field)).toContain("stages.0.label");
  });

  it("fails a drifted CHECK-constrained enum", () => {
    const competitor = byId(contentBundle.competitors, "aquaplast");
    const target: GateTarget = {
      table: "content_competitors",
      row: { ...competitorToRow(competitor), threat_level: "Juda yuqori" },
    };
    expect(schemaValid(target, ctx)).toEqual([expect.objectContaining({ code: "schema_invalid", field: "threatLevel" })]);
  });

  it("fails a non-numeric discount the calculator would do arithmetic on", () => {
    const issues = schemaValid(packageTarget("pkg-start", { discountPct: Number.NaN }), ctx);
    expect(issues).toEqual([expect.objectContaining({ code: "schema_invalid", severity: "error", field: "discountPct" })]);
  });
});

describe("requiredNotBlank", () => {
  it("passes rows with every required column filled", () => {
    expect(requiredNotBlank(objectionTarget("obj-qimmat"), ctx)).toEqual([]);
    expect(requiredNotBlank(faqTarget("faq-kafolat"), ctx)).toEqual([]);
  });

  it("treats whitespace-only as blank", () => {
    expect(requiredNotBlank(faqTarget("faq-kafolat", { answer: "   " }), ctx)).toEqual([
      expect.objectContaining({ code: "required_blank", severity: "error", field: "answer" }),
    ]);
  });

  it("reports each blank required column separately", () => {
    const issues = requiredNotBlank(objectionTarget("obj-qimmat", { label: "", response: "" }), ctx);
    expect(issues.map((i) => i.field)).toEqual(["label", "response"]);
  });
});

describe("linkedScriptsPublished", () => {
  it("passes an objection whose scripts exist and are published", () => {
    expect(linkedScriptsPublished(objectionTarget("obj-qimmat"), ctx)).toEqual([]);
  });

  it("fails an objection referencing a script that doesn't exist", () => {
    expect(linkedScriptsPublished(objectionTarget("obj-oylab-koraman"), ctx)).toEqual([
      expect.objectContaining({ code: "link_missing", severity: "error", field: "script_ids" }),
    ]);
  });

  it("fails an objection referencing a draft script", () => {
    const issues = linkedScriptsPublished(objectionTarget("obj-chegirma"), ctx);
    expect(issues).toEqual([expect.objectContaining({ code: "link_unpublished", severity: "error", field: "script_ids" })]);
    expect(issues[0]?.message).toContain(DRAFT_SCRIPT_ID);
  });

  it("fails a package whose group is missing", () => {
    expect(linkedScriptsPublished(packageTarget("pkg-start", {}, "pg-yoq"), ctx)).toEqual([
      expect.objectContaining({ code: "link_missing", field: "group_id" }),
    ]);
  });

  it("passes a script whose stage objections and turn links all resolve", () => {
    expect(linkedScriptsPublished(scriptTarget(PUBLISHED_SCRIPT_ID), ctx)).toEqual([]);
  });

  it("fails dead stage objections and turn links, with a JSON path to each", () => {
    const target = scriptTarget(PUBLISHED_SCRIPT_ID, {
      stages: [
        { id: "etiroz", label: "E'tiroz", turns: [], objectionIds: ["obj-yoq"] },
        {
          id: "taklif",
          label: "Taklif",
          turns: [{ speaker: "operator", text: "FAQ ni ko'ring", links: [{ label: "FAQ", type: "faq", id: "faq-yoq" }] }],
          objectionIds: [],
        },
      ],
    });
    const issues = linkedScriptsPublished(target, ctx);
    expect(issues.map((i) => [i.code, i.field])).toEqual([
      ["link_missing", "stages[0].objectionIds"],
      ["link_missing", "stages[1].turns[0].links[0]"],
    ]);
  });

  it("fails a turn link to a package that exists but is unpublished", () => {
    const issues = linkedScriptsPublished(scriptTarget(PUBLISHED_SCRIPT_ID), gateContext({ content_packages: new Set(["pkg-start"]) }));
    expect(issues).toEqual([expect.objectContaining({ code: "link_unpublished", field: "stages[2].turns[0].links[0]" })]);
  });

  it("ignores tables without cross-references", () => {
    expect(linkedScriptsPublished(faqTarget("faq-kafolat"), ctx)).toEqual([]);
  });
});

describe("internalLinksResolve", () => {
  it("passes links to real routes and published ids, ignoring external URLs and trailing punctuation", () => {
    const answer = [
      `Skriptni oching: /sales-process/scripts?script=${PUBLISHED_SCRIPT_ID}&stage=etiroz&objection=obj-qimmat.`,
      "Katalog: /products, taqqoslash: /products/comparisons;",
      "Raqobatchi: /sales-process/battle-cards/aquaplast",
      "Sayt: https://watertech.uz/products va /faq!",
    ].join("\n");
    expect(internalLinksResolve(faqTarget("faq-kafolat", { answer }), ctx)).toEqual([]);
  });

  it("fails a path that isn't a page", () => {
    expect(internalLinksResolve(faqTarget("faq-kafolat", { answer: "Batafsil: /faqs" }), ctx)).toEqual([
      expect.objectContaining({ code: "internal_link_broken", severity: "error", field: "answer" }),
    ]);
  });

  it("fails links to draft or missing scripts and competitors", () => {
    const answer = [
      `/sales-process/scripts?script=${DRAFT_SCRIPT_ID}`,
      `/sales-process/scripts/${DRAFT_SCRIPT_ID}`,
      "/sales-process/battle-cards/yoq",
      `/sales-process/scripts?script=${PUBLISHED_SCRIPT_ID}&stage=yoq`,
      "/sales-process/scripts?objection=obj-yoq",
    ].join(" ");
    const issues = internalLinksResolve(faqTarget("faq-kafolat", { answer }), ctx);
    expect(issues).toHaveLength(5);
    expect(new Set(codes(issues))).toEqual(new Set(["internal_link_broken"]));
  });

  it("scans prose inside script stages, reporting the JSON path", () => {
    const script = byId(contentBundle.scripts, PUBLISHED_SCRIPT_ID);
    const stages = script.stages.map((stage, i) =>
      i === 0 ? { ...stage, turns: [{ speaker: "operator" as const, text: "Qarang: /products/yoq" }] } : stage
    );
    expect(internalLinksResolve(scriptTarget(PUBLISHED_SCRIPT_ID, { stages }), ctx)).toEqual([
      expect.objectContaining({ code: "internal_link_broken", field: "stages[0].turns[0].text" }),
    ]);
  });
});

describe("noDuplicateFaq", () => {
  it("passes a question with no published look-alike", () => {
    expect(noDuplicateFaq(faqTarget("faq-yetkazib-berish"), ctx)).toEqual([]);
  });

  it("warns (never errors) on a near-duplicate published question", () => {
    const issues = noDuplicateFaq(faqTarget("faq-kafolat-muddati"), ctx);
    expect(issues).toEqual([expect.objectContaining({ code: "faq_duplicate", severity: "warning", field: "question" })]);
    expect(issues[0]?.message).toContain("faq-kafolat");
  });

  it("only compares against published FAQs other than the row itself", () => {
    const onlySelfPublished = gateContext({ content_faqs: new Set(["faq-kafolat-muddati", "faq-yetkazib-berish"]) });
    expect(noDuplicateFaq(faqTarget("faq-kafolat-muddati"), onlySelfPublished)).toEqual([]);
  });

  it("ignores non-FAQ tables", () => {
    expect(noDuplicateFaq(objectionTarget("obj-qimmat"), ctx)).toEqual([]);
  });
});

describe("ruTranslationPresent", () => {
  it("passes fully translated rows", () => {
    expect(ruTranslationPresent(faqTarget("faq-yetkazib-berish"), ctx)).toEqual([]);
    expect(ruTranslationPresent(packageTarget("pkg-diler"), ctx)).toEqual([]);
    expect(ruTranslationPresent(objectionTarget("obj-qimmat"), ctx)).toEqual([]);
  });

  it("warns once per empty *_ru column", () => {
    const issues = ruTranslationPresent(faqTarget("faq-kafolat"), ctx);
    expect(issues.map((i) => [i.code, i.severity, i.field])).toEqual([
      ["ru_missing", "warning", "question_ru"],
      ["ru_missing", "warning", "answer_ru"],
    ]);
  });

  it("warns on the remaining columns of a partially translated row", () => {
    const issues = ruTranslationPresent(faqTarget("faq-yetkazib-berish", { answerRu: "" }), ctx);
    expect(issues.map((i) => i.field)).toEqual(["answer_ru"]);
  });

  it("requires follow_up_ru only when there is a follow_up to translate", () => {
    const withoutFollowUp = objectionTarget("obj-chegirma");
    expect(ruTranslationPresent(withoutFollowUp, ctx).map((i) => i.field)).not.toContain("follow_up_ru");

    const withFollowUp = objectionTarget("obj-qimmat", { followUpRu: undefined });
    expect(ruTranslationPresent(withFollowUp, ctx).map((i) => i.field)).toEqual(["follow_up_ru"]);
  });

  it("never asks for RU on Uzbek-only battle-cards or on products", () => {
    const competitor: GateTarget = {
      table: "content_competitors",
      row: competitorToRow(byId(contentBundle.competitors, "aquaplast")),
    };
    const product: GateTarget = { table: "content_products", row: productToRow(byId(products, "truba-ppr")) };
    expect(ruTranslationPresent(competitor, ctx)).toEqual([]);
    expect(ruTranslationPresent(product, ctx)).toEqual([]);
  });
});

describe("stagesNonEmpty", () => {
  it("passes a script whose objection-handling stage has objectionIds instead of turns", () => {
    expect(stagesNonEmpty(scriptTarget(PUBLISHED_SCRIPT_ID), ctx)).toEqual([]);
  });

  it("fails a script with no stages at all", () => {
    expect(codes(stagesNonEmpty(scriptTarget(PUBLISHED_SCRIPT_ID, { stages: [] }), ctx))).toEqual(["stages_none"]);
  });

  it("fails a stage with neither turns nor objectionIds, in stages and stages_ru", () => {
    const empty = { id: "bosh", label: "Bo'sh bosqich", turns: [], objectionIds: [] };
    const target = scriptTarget(PUBLISHED_SCRIPT_ID, { stages: [empty], stagesRu: [empty] });
    expect(stagesNonEmpty(target, ctx).map((i) => [i.code, i.severity, i.field])).toEqual([
      ["stage_empty", "error", "stages[0].turns"],
      ["stage_empty", "error", "stages_ru[0].turns"],
    ]);
  });

  it("leaves malformed stages to schemaValid", () => {
    const target: GateTarget = {
      table: "content_scripts",
      row: { ...scriptToRow(byId(contentBundle.scripts, PUBLISHED_SCRIPT_ID)), stages: "not-an-array" },
    };
    expect(stagesNonEmpty(target, ctx)).toEqual([]);
  });
});

describe("placeholderText", () => {
  it("passes real copy, including words that merely contain a token", () => {
    expect(placeholderText(packageTarget("pkg-diler"), ctx)).toEqual([]);
    expect(placeholderText(faqTarget("faq-kafolat", { answer: "XXXL o'lchamdagi fitinglar ham bor. Todorov zavodi." }), ctx)).toEqual([]);
  });

  it.each([
    ["TODO", "TODO: javobni yozish"],
    ["lorem", "Lorem ipsum dolor sit amet"],
    ["???", "Narxi ??? so'm"],
    ["XXX", "Chegirma XXX foiz"],
  ])("fails leftover %s", (token, response) => {
    const issues = placeholderText(objectionTarget("obj-qimmat", { response }), ctx);
    expect(issues).toEqual([expect.objectContaining({ code: "placeholder_text", severity: "error", field: "response" })]);
    expect(issues[0]?.message).toContain(token);
  });

  it("scans turn text inside stages", () => {
    const stages = [{ id: "s", label: "Salom", turns: [{ speaker: "operator" as const, text: "todo" }], objectionIds: [] }];
    expect(placeholderText(scriptTarget(PUBLISHED_SCRIPT_ID, { stages }), ctx)).toEqual([
      expect.objectContaining({ field: "stages[0].turns[0].text" }),
    ]);
  });
});

describe("gate verdict", () => {
  it("toGateResult: passed is false only when an error-severity issue exists", () => {
    const warning: GateIssue = { code: "ru_missing", severity: "warning", message: "w" };
    const error: GateIssue = { code: "required_blank", severity: "error", message: "e" };
    expect(toGateResult([]).passed).toBe(true);
    expect(toGateResult([warning, warning]).passed).toBe(true);
    expect(toGateResult([warning, error]).passed).toBe(false);
  });

  it("runChecks passes a clean row with no issues", () => {
    expect(runChecks(faqTarget("faq-yetkazib-berish"), ctx)).toEqual({ passed: true, issues: [] });
  });

  it("runChecks passes a row that only has warnings", () => {
    const result = runChecks(faqTarget("faq-kafolat-muddati"), ctx);
    expect(result.passed).toBe(true);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues.every((i) => i.severity === "warning")).toBe(true);
    expect(new Set(codes(result.issues))).toEqual(new Set(["faq_duplicate", "ru_missing"]));
  });

  it("runChecks blocks a row with an error even when warnings are present too", () => {
    const result = runChecks(objectionTarget("obj-oylab-koraman"), ctx);
    expect(result.passed).toBe(false);
    expect(codes(result.issues)).toContain("link_missing");
    expect(codes(result.issues)).toContain("ru_missing");
  });
});
