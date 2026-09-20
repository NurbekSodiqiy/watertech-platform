import Fuse from "fuse.js";
import type { z } from "zod";
import {
  changelogSchema,
  competitorSchema,
  contactSchema,
  faqSchema,
  objectionSchema,
  packageGroupSchema,
  packageSchema,
  productSchema,
  scriptSchema,
  sopSchema,
  sopStepsSchema,
  stagesSchema,
} from "@/lib/content/schemas";
import { flattenTree } from "@/lib/site-config";
import { normalizeSearchText } from "@/lib/search/normalize";
import type { SopStep, Stage } from "@/lib/content/types";
import type { Json } from "@/lib/supabase/database.types";
import type { GateCheck, GateContext, GateIssue, GateResult, GateTarget } from "./types";

// Pure publish-gate checks: no DB access, no Next.js imports. Every input
// arrives as (target, ctx), so each check can be unit-tested with plain
// fixture rows. lib/agents/publish-gate/index.ts does the loading.

// === Helpers ======================================================================

function issue(code: string, severity: GateIssue["severity"], message: string, field?: string): GateIssue {
  return field === undefined ? { code, severity, message } : { code, severity, message, field };
}

function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === "";
}

/** JSONB stages -> Stage[], or null when the column is null or malformed.
 * schemaValid reports a malformed shape, so the other checks just skip it. */
function parseStages(value: Json | null): Stage[] | null {
  if (value === null) return null;
  const result = stagesSchema.safeParse(value);
  return result.success ? result.data : null;
}

/** JSONB steps -> SopStep[], or null when the column is null or malformed
 * (schemaValid reports the malformed shape, so the other checks skip it). */
function parseSopSteps(value: Json | null): SopStep[] | null {
  if (value === null) return null;
  const result = sopStepsSchema.safeParse(value);
  return result.success ? result.data : null;
}

function idsOf(items: readonly { id: string }[]): ReadonlySet<string> {
  return new Set(items.map((item) => item.id));
}

/** Display title of a row, for notification titles and messages. */
export function targetTitle(target: GateTarget): string {
  switch (target.table) {
    case "content_scripts":
      return target.row.name;
    case "content_objections":
      return target.row.label;
    case "content_faqs":
      return target.row.question;
    case "content_competitors":
      return target.row.name;
    case "content_package_groups":
      return target.row.title;
    case "content_packages":
      return target.row.name;
    case "content_products":
      return target.row.name_ru;
    case "content_changelog":
      return target.row.title;
    case "content_contacts":
      return target.row.name;
    case "content_sops":
      return target.row.title;
  }
}

export interface TextField {
  field: string;
  text: string;
}

function stringColumns<Row>(row: Row, names: readonly (keyof Row & string)[]): TextField[] {
  const out: TextField[] = [];
  for (const name of names) {
    const value = row[name];
    if (typeof value === "string" && value !== "") out.push({ field: name, text: value });
  }
  return out;
}

function sopStepTextFields(steps: SopStep[] | null, column: "steps" | "steps_ru"): TextField[] {
  return (steps ?? []).flatMap((step, i) => [
    { field: `${column}[${i}].title`, text: step.title },
    { field: `${column}[${i}].body`, text: step.body },
  ]);
}

function stageTextFields(stages: Stage[] | null, column: "stages" | "stages_ru"): TextField[] {
  const out: TextField[] = [];
  stages?.forEach((stage, i) => {
    out.push({ field: `${column}[${i}].label`, text: stage.label });
    stage.turns.forEach((turn, j) => {
      const base = `${column}[${i}].turns[${j}]`;
      out.push({ field: `${base}.text`, text: turn.text });
      if (turn.subStepHeader) out.push({ field: `${base}.subStepHeader`, text: turn.subStepHeader });
      if (turn.condition) out.push({ field: `${base}.condition`, text: turn.condition });
      turn.links?.forEach((link, k) => out.push({ field: `${base}.links[${k}].label`, text: link.label }));
    });
  });
  return out;
}

/** Every prose field of a row an operator can read (ids, file names and
 * enum columns excluded) — what placeholderText and internalLinksResolve scan. */
export function textFields(target: GateTarget): TextField[] {
  switch (target.table) {
    case "content_scripts": {
      const { row } = target;
      return [
        ...stringColumns(row, ["name", "cheat_sheet", "name_ru", "cheat_sheet_ru"]),
        ...stageTextFields(parseStages(row.stages), "stages"),
        ...stageTextFields(parseStages(row.stages_ru), "stages_ru"),
      ];
    }
    case "content_objections": {
      const { row } = target;
      return [
        ...stringColumns(row, [
          "label",
          "client_says",
          "real_meaning",
          "response",
          "follow_up",
          "label_ru",
          "client_says_ru",
          "real_meaning_ru",
          "response_ru",
          "follow_up_ru",
        ]),
        ...row.keywords.map((text, i) => ({ field: `keywords[${i}]`, text })),
      ];
    }
    case "content_faqs":
      return stringColumns(target.row, ["category", "question", "answer", "question_ru", "answer_ru"]);
    case "content_competitors":
      return stringColumns(target.row, [
        "name",
        "assortment",
        "base_discount",
        "volume_discount",
        "retro_bonus",
        "max_discount",
        "payment_terms",
        "payment_method",
        "delivery_time",
        "logistics",
        "dealer_coverage",
        "certificates",
        "marketing_offers",
      ]);
    case "content_package_groups":
      return stringColumns(target.row, ["title", "subtitle", "title_ru", "subtitle_ru"]);
    case "content_packages":
      return stringColumns(target.row, [
        "name",
        "order_volume",
        "payment_terms",
        "estimated_discount",
        "logistics",
        "delivery_time",
        "name_ru",
        "order_volume_ru",
        "payment_terms_ru",
        "estimated_discount_ru",
        "logistics_ru",
        "delivery_time_ru",
      ]);
    case "content_products":
      return stringColumns(target.row, ["name_ru", "name_uz"]);
    // linked_path is scanned as prose on purpose: internalLinksResolve then
    // reports a path into /sales-process, /products or /faq that does not exist.
    case "content_changelog":
      return stringColumns(target.row, ["title", "body", "linked_path", "approved_by", "title_ru", "body_ru"]);
    // phone and messenger are format-checked by schemaValid, not prose.
    case "content_contacts":
      return stringColumns(target.row, ["name", "role", "topic", "role_ru", "topic_ru"]);
    case "content_sops": {
      const { row } = target;
      return [
        ...stringColumns(row, ["title", "summary", "title_ru", "summary_ru"]),
        ...sopStepTextFields(parseSopSteps(row.steps), "steps"),
        ...sopStepTextFields(parseSopSteps(row.steps_ru), "steps_ru"),
      ];
    }
  }
}

// === schemaValid ==================================================================

const packageGroupRowSchema = packageGroupSchema.omit({ packages: true });

function schemaIssues<Input, Output>(result: z.SafeParseReturnType<Input, Output>): GateIssue[] {
  if (result.success) return [];
  return result.error.issues.map((zodIssue) =>
    issue(
      "schema_invalid",
      "error",
      `Ma'lumot tuzilmasi noto'g'ri: ${zodIssue.message}`,
      zodIssue.path.length > 0 ? zodIssue.path.join(".") : undefined
    )
  );
}

/** Runs the table's lib/content/schemas.ts schema against the row mapped the
 * way the read path maps it (lib/content/db.ts), minus the read path's silent
 * fallbacks — malformed stages JSONB or a drifted enum is reported here instead
 * of quietly rendering as an empty script. */
export const schemaValid: GateCheck = (target) => {
  switch (target.table) {
    case "content_scripts": {
      const { row } = target;
      return schemaIssues(
        scriptSchema.safeParse({
          id: row.id,
          name: row.name,
          cheatSheet: row.cheat_sheet,
          stages: row.stages,
          nameRu: row.name_ru ?? undefined,
          cheatSheetRu: row.cheat_sheet_ru ?? undefined,
          stagesRu: row.stages_ru ?? undefined,
        })
      );
    }
    case "content_objections": {
      const { row } = target;
      return schemaIssues(
        objectionSchema.safeParse({
          id: row.id,
          label: row.label,
          keywords: row.keywords,
          clientSays: row.client_says,
          realMeaning: row.real_meaning,
          response: row.response,
          followUp: row.follow_up ?? undefined,
          scriptIds: row.script_ids,
          labelRu: row.label_ru ?? undefined,
          clientSaysRu: row.client_says_ru ?? undefined,
          realMeaningRu: row.real_meaning_ru ?? undefined,
          responseRu: row.response_ru ?? undefined,
          followUpRu: row.follow_up_ru ?? undefined,
        })
      );
    }
    case "content_faqs": {
      const { row } = target;
      return schemaIssues(
        faqSchema.safeParse({
          id: row.id,
          category: row.category,
          question: row.question,
          answer: row.answer,
          questionRu: row.question_ru ?? undefined,
          answerRu: row.answer_ru ?? undefined,
        })
      );
    }
    case "content_competitors": {
      // Nullable text columns read as "" (rowToCompetitor) — only the
      // CHECK-constrained threat_level can actually be wrong here.
      const { row } = target;
      return schemaIssues(
        competitorSchema.safeParse({
          id: row.id,
          name: row.name,
          assortment: row.assortment ?? "",
          baseDiscount: row.base_discount ?? "",
          volumeDiscount: row.volume_discount ?? "",
          retroBonus: row.retro_bonus ?? "",
          maxDiscount: row.max_discount ?? "",
          paymentTerms: row.payment_terms ?? "",
          paymentMethod: row.payment_method ?? "",
          deliveryTime: row.delivery_time ?? "",
          logistics: row.logistics ?? "",
          dealerCoverage: row.dealer_coverage ?? "",
          certificates: row.certificates ?? "",
          marketingOffers: row.marketing_offers ?? "",
          threatLevel: row.threat_level,
        })
      );
    }
    case "content_package_groups": {
      const { row } = target;
      return schemaIssues(
        packageGroupRowSchema.safeParse({
          id: row.id,
          title: row.title,
          subtitle: row.subtitle,
          titleRu: row.title_ru ?? undefined,
          subtitleRu: row.subtitle_ru ?? undefined,
        })
      );
    }
    case "content_packages": {
      const { row } = target;
      return schemaIssues(
        packageSchema.safeParse({
          id: row.id,
          name: row.name,
          isFeatured: row.is_featured,
          orderVolume: row.order_volume,
          paymentTerms: row.payment_terms,
          estimatedDiscount: row.estimated_discount,
          // Same Number() the read path applies to numeric columns; NaN still fails z.number().
          discountPct: Number(row.discount_pct),
          advancePct: row.advance_pct === null ? null : Number(row.advance_pct),
          logistics: row.logistics,
          deliveryTime: row.delivery_time,
          nameRu: row.name_ru ?? undefined,
          orderVolumeRu: row.order_volume_ru ?? undefined,
          paymentTermsRu: row.payment_terms_ru ?? undefined,
          estimatedDiscountRu: row.estimated_discount_ru ?? undefined,
          logisticsRu: row.logistics_ru ?? undefined,
          deliveryTimeRu: row.delivery_time_ru ?? undefined,
        })
      );
    }
    case "content_products": {
      const { row } = target;
      return schemaIssues(
        productSchema.safeParse({
          id: row.id,
          filename: row.filename,
          name_ru: row.name_ru,
          name_uz: row.name_uz ?? undefined,
          sizes: row.sizes,
          line: row.line,
          category: row.category,
          material: row.material ?? undefined,
        })
      );
    }
    case "content_changelog": {
      const { row } = target;
      return schemaIssues(
        changelogSchema.safeParse({
          id: row.id,
          publishedOn: row.published_on,
          title: row.title,
          body: row.body,
          linkedPath: row.linked_path ?? undefined,
          approvedBy: row.approved_by,
          titleRu: row.title_ru ?? undefined,
          bodyRu: row.body_ru ?? undefined,
        })
      );
    }
    case "content_contacts": {
      const { row } = target;
      return schemaIssues(
        contactSchema.safeParse({
          id: row.id,
          name: row.name,
          role: row.role,
          topic: row.topic,
          phone: row.phone,
          messenger: row.messenger,
          roleRu: row.role_ru ?? undefined,
          topicRu: row.topic_ru ?? undefined,
        })
      );
    }
    case "content_sops": {
      const { row } = target;
      return schemaIssues(
        sopSchema.safeParse({
          id: row.id,
          title: row.title,
          summary: row.summary,
          steps: row.steps,
          titleRu: row.title_ru ?? undefined,
          summaryRu: row.summary_ru ?? undefined,
          stepsRu: row.steps_ru ?? undefined,
        })
      );
    }
  }
};

// === requiredNotBlank =============================================================

function blankRequired<Row>(row: Row, required: readonly [keyof Row & string, string][]): GateIssue[] {
  return required.flatMap(([column, label]) => {
    const value = row[column];
    return typeof value === "string" && value.trim() !== ""
      ? []
      : [issue("required_blank", "error", `"${label}" maydoni bo'sh`, column)];
  });
}

export const requiredNotBlank: GateCheck = (target) => {
  switch (target.table) {
    case "content_scripts":
      return blankRequired(target.row, [["name", "Skript nomi"]]);
    case "content_objections":
      return blankRequired(target.row, [
        ["label", "Nomi"],
        ["response", "Javob"],
      ]);
    case "content_faqs":
      return blankRequired(target.row, [
        ["question", "Savol"],
        ["answer", "Javob"],
      ]);
    case "content_competitors":
      return blankRequired(target.row, [["name", "Nomi"]]);
    case "content_package_groups":
      return blankRequired(target.row, [["title", "Nomi"]]);
    case "content_packages":
      return blankRequired(target.row, [["name", "Nomi"]]);
    case "content_products":
      return blankRequired(target.row, [["name_ru", "Nomi (rus tilida)"]]);
    case "content_changelog":
      return blankRequired(target.row, [
        ["title", "Sarlavha"],
        ["body", "Matn"],
        ["approved_by", "Tasdiqlagan"],
      ]);
    case "content_contacts":
      return blankRequired(target.row, [
        ["name", "Ism"],
        ["role", "Lavozim"],
        ["topic", "Mavzu"],
      ]);
    case "content_sops": {
      // A SOP page with no steps is an empty page. A malformed steps column is
      // schemaValid's to report, not this check's.
      const steps = parseSopSteps(target.row.steps);
      return [
        ...blankRequired(target.row, [["title", "Nomi"]]),
        ...(steps !== null && steps.length === 0 ? [issue("steps_none", "error", "Reglamentda birorta ham qadam yo'q", "steps")] : []),
      ];
    }
  }
};

// === linkedScriptsPublished =======================================================

function referenceIssues(
  ids: readonly string[],
  existing: ReadonlySet<string>,
  published: ReadonlySet<string>,
  noun: string,
  field: string
): GateIssue[] {
  return ids.flatMap((id) => {
    if (!existing.has(id)) return [issue("link_missing", "error", `Bog'langan ${noun} topilmadi: ${id}`, field)];
    if (!published.has(id)) return [issue("link_unpublished", "error", `Bog'langan ${noun} nashr etilmagan: ${id}`, field)];
    return [];
  });
}

function stageReferenceIssues(stages: Stage[] | null, column: "stages" | "stages_ru", ctx: GateContext): GateIssue[] {
  if (!stages) return [];
  const { bundle, publishedIds } = ctx;
  const objectionIds = idsOf(bundle.objections);
  const turnLinkTargets = {
    package: { existing: idsOf(bundle.packageGroups.flatMap((group) => group.packages)), published: publishedIds.content_packages, noun: "paket" },
    competitor: { existing: idsOf(bundle.competitors), published: publishedIds.content_competitors, noun: "raqobatchi" },
    faq: { existing: idsOf(bundle.faqs), published: publishedIds.content_faqs, noun: "FAQ" },
  };

  return stages.flatMap((stage, i) => [
    ...referenceIssues(stage.objectionIds, objectionIds, publishedIds.content_objections, "e'tiroz", `${column}[${i}].objectionIds`),
    ...stage.turns.flatMap((turn, j) =>
      (turn.links ?? []).flatMap((link, k) => {
        const linkTarget = turnLinkTargets[link.type];
        return referenceIssues(
          [link.id],
          linkTarget.existing,
          linkTarget.published,
          linkTarget.noun,
          `${column}[${i}].turns[${j}].links[${k}]`
        );
      })
    ),
  ]);
}

/** Cross-references an operator would follow must exist AND be published —
 * a draft target is invisible to operators, so the link would dead-end:
 * objection -> scripts, package -> its group, script stages -> objections and
 * turn links -> packages/competitors/FAQs. */
export const linkedScriptsPublished: GateCheck = (target, ctx) => {
  switch (target.table) {
    case "content_objections":
      return referenceIssues(
        target.row.script_ids,
        idsOf(ctx.bundle.scripts),
        ctx.publishedIds.content_scripts,
        "skript",
        "script_ids"
      );
    case "content_packages":
      return referenceIssues(
        [target.row.group_id],
        idsOf(ctx.bundle.packageGroups),
        ctx.publishedIds.content_package_groups,
        "paket guruhi",
        "group_id"
      );
    case "content_scripts":
      return [
        ...stageReferenceIssues(parseStages(target.row.stages), "stages", ctx),
        ...stageReferenceIssues(parseStages(target.row.stages_ru), "stages_ru", ctx),
      ];
    default:
      return [];
  }
};

// === internalLinksResolve =========================================================

const LINK_SECTIONS = ["/sales-process", "/products", "/faq"] as const;

/** A path starting one of the linkable sections, not preceded by anything that
 * would make it part of a longer URL or word (`https://x.uz/products` is
 * external and skipped). Anything after the section name is captured, so a
 * typo like `/faqs` is still found and reported. */
const INTERNAL_LINK_PATTERN = /(?<![\w./:-])\/(?:sales-process|products|faq)[^\s"'<>()[\]{}]*/g;
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;
const DYNAMIC_ROUTE_PATTERN = /^\/sales-process\/(scripts|battle-cards)\/([^/]+)$/;

/** Static routes under the linkable sections, straight from the nav tree. */
const STATIC_LINK_PATHS: ReadonlySet<string> = new Set(
  flattenTree()
    .map((node) => node.path)
    .filter((path) => LINK_SECTIONS.some((section) => path === section || path.startsWith(`${section}/`)))
);

/** Query ids the scripts page reads (components/scripts/ScriptsWorkspace.tsx). */
function scriptsQueryProblem(params: URLSearchParams, ctx: GateContext): string | null {
  const scriptId = params.get("script");
  const stageId = params.get("stage");
  const objectionId = params.get("objection");

  if (scriptId !== null && !ctx.publishedIds.content_scripts.has(scriptId)) {
    return `"${scriptId}" skripti nashr etilmagan yoki mavjud emas`;
  }
  if (scriptId !== null && stageId !== null) {
    const script = ctx.bundle.scripts.find((s) => s.id === scriptId);
    if (!script?.stages.some((stage) => stage.id === stageId)) return `"${stageId}" bosqichi skriptda yo'q`;
  }
  if (objectionId !== null && !ctx.publishedIds.content_objections.has(objectionId)) {
    return `"${objectionId}" e'tirozi nashr etilmagan yoki mavjud emas`;
  }
  return null;
}

function internalLinkProblem(link: string, ctx: GateContext): string | null {
  const url = new URL(link, "https://link.invalid");
  const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : url.pathname;

  if (STATIC_LINK_PATHS.has(pathname)) {
    return pathname === "/sales-process/scripts" ? scriptsQueryProblem(url.searchParams, ctx) : null;
  }

  const dynamic = DYNAMIC_ROUTE_PATTERN.exec(pathname);
  if (dynamic) {
    const [, section, slug] = dynamic;
    if (section === "scripts") {
      return ctx.publishedIds.content_scripts.has(slug) ? null : `"${slug}" skripti nashr etilmagan yoki mavjud emas`;
    }
    return ctx.publishedIds.content_competitors.has(slug) ? null : `"${slug}" raqobatchisi nashr etilmagan yoki mavjud emas`;
  }

  return "bunday sahifa yo'q";
}

export const internalLinksResolve: GateCheck = (target, ctx) =>
  textFields(target).flatMap(({ field, text }) =>
    Array.from(text.matchAll(INTERNAL_LINK_PATTERN), (match) => match[0].replace(TRAILING_PUNCTUATION, "")).flatMap(
      (link) => {
        const problem = internalLinkProblem(link, ctx);
        return problem ? [issue("internal_link_broken", "error", `Ichki havola ochilmaydi: ${link} — ${problem}`, field)] : [];
      }
    )
  );

// === noDuplicateFaq ===============================================================

/** Fuse score is 0 for an exact match and 1 for no match at all. */
const DUPLICATE_FAQ_MAX_SCORE = 0.25;

export const noDuplicateFaq: GateCheck = (target, ctx) => {
  if (target.table !== "content_faqs") return [];
  const question = normalizeSearchText(target.row.question);
  if (!question) return [];

  const others = ctx.bundle.faqs
    .filter((faq) => faq.id !== target.row.id && ctx.publishedIds.content_faqs.has(faq.id))
    .map((faq) => ({ id: faq.id, question: faq.question, normalized: normalizeSearchText(faq.question) }));
  if (others.length === 0) return [];

  const fuse = new Fuse(others, {
    keys: ["normalized"],
    includeScore: true,
    ignoreLocation: true,
    threshold: DUPLICATE_FAQ_MAX_SCORE,
  });

  return fuse
    .search(question)
    .filter((result) => result.score !== undefined && result.score < DUPLICATE_FAQ_MAX_SCORE)
    .map((result) =>
      issue(
        "faq_duplicate",
        "warning",
        `Shunga o'xshash FAQ allaqachon nashr etilgan: "${result.item.question}" (${result.item.id})`,
        "question"
      )
    );
};

// === ruTranslationPresent =========================================================

function blankColumns<Row>(row: Row, names: readonly (keyof Row & string)[]): string[] {
  return names.filter((name) => {
    const value = row[name];
    return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
  });
}

/** *_ru columns still empty on a row. Shared with the daily stale scan
 * (lib/agents/stale-scan.ts) so both agree on what "missing RU" means. */
export function missingRuFields(target: GateTarget): string[] {
  switch (target.table) {
    case "content_scripts": {
      const { row } = target;
      const stagesRuEmpty = row.stages_ru === null || (Array.isArray(row.stages_ru) && row.stages_ru.length === 0);
      return [...blankColumns(row, ["name_ru", "cheat_sheet_ru"]), ...(stagesRuEmpty ? ["stages_ru"] : [])];
    }
    case "content_objections": {
      const { row } = target;
      // follow_up is optional — its translation is only missing when there is something to translate.
      const followUpRuMissing = !isBlank(row.follow_up) && isBlank(row.follow_up_ru);
      return [
        ...blankColumns(row, ["label_ru", "client_says_ru", "real_meaning_ru", "response_ru"]),
        ...(followUpRuMissing ? ["follow_up_ru"] : []),
      ];
    }
    case "content_faqs":
      return blankColumns(target.row, ["question_ru", "answer_ru"]);
    case "content_changelog":
      return blankColumns(target.row, ["title_ru", "body_ru"]);
    case "content_contacts":
      return blankColumns(target.row, ["role_ru", "topic_ru"]);
    case "content_sops": {
      const { row } = target;
      const stepsRuEmpty = row.steps_ru === null || (Array.isArray(row.steps_ru) && row.steps_ru.length === 0);
      return [...blankColumns(row, ["title_ru", "summary_ru"]), ...(stepsRuEmpty ? ["steps_ru"] : [])];
    }
    case "content_package_groups":
      return blankColumns(target.row, ["title_ru", "subtitle_ru"]);
    case "content_packages":
      return blankColumns(target.row, [
        "name_ru",
        "order_volume_ru",
        "payment_terms_ru",
        "estimated_discount_ru",
        "logistics_ru",
        "delivery_time_ru",
      ]);
    // Battle-cards stay Uzbek-only (0004_content_ru_columns.sql), and a
    // product's name_ru is its required primary name — nothing to translate.
    case "content_competitors":
    case "content_products":
      return [];
  }
}

export const ruTranslationPresent: GateCheck = (target) =>
  missingRuFields(target).map((field) => issue("ru_missing", "warning", "Ruscha tarjima to'ldirilmagan", field));

// === stagesNonEmpty ===============================================================

/** An objection-handling stage legitimately has no turns — its content comes
 * from objectionIds (see Stage.objectionIds in lib/content/types.ts) — so a
 * stage is only empty when it has neither. */
function emptyStageIssues(stages: Stage[], column: "stages" | "stages_ru"): GateIssue[] {
  return stages.flatMap((stage, i) =>
    stage.turns.length === 0 && stage.objectionIds.length === 0
      ? [issue("stage_empty", "error", `"${stage.label || stage.id}" bosqichida birorta ham replika yo'q`, `${column}[${i}].turns`)]
      : []
  );
}

export const stagesNonEmpty: GateCheck = (target) => {
  if (target.table !== "content_scripts") return [];
  const stages = parseStages(target.row.stages);
  if (stages === null) return [];

  return [
    ...(stages.length === 0 ? [issue("stages_none", "error", "Skriptda birorta ham bosqich yo'q", "stages")] : []),
    ...emptyStageIssues(stages, "stages"),
    ...emptyStageIssues(parseStages(target.row.stages_ru) ?? [], "stages_ru"),
  ];
};

// === placeholderText ==============================================================

const PLACEHOLDER_TOKENS: readonly { token: string; pattern: RegExp }[] = [
  { token: "TODO", pattern: /\btodo\b/i },
  { token: "lorem", pattern: /\blorem\b/i },
  { token: "???", pattern: /\?\?\?/ },
  { token: "XXX", pattern: /\bxxx\b/i },
];

export const placeholderText: GateCheck = (target) =>
  textFields(target).flatMap(({ field, text }) => {
    const hit = PLACEHOLDER_TOKENS.find(({ pattern }) => pattern.test(text));
    return hit ? [issue("placeholder_text", "error", `Vaqtinchalik matn qolib ketgan: "${hit.token}"`, field)] : [];
  });

// === Runner =======================================================================

export const PUBLISH_GATE_CHECKS: readonly GateCheck[] = [
  schemaValid,
  requiredNotBlank,
  linkedScriptsPublished,
  internalLinksResolve,
  noDuplicateFaq,
  ruTranslationPresent,
  stagesNonEmpty,
  placeholderText,
];

export function toGateResult(issues: GateIssue[]): GateResult {
  return { passed: !issues.some((i) => i.severity === "error"), issues };
}

export function runChecks(target: GateTarget, ctx: GateContext): GateResult {
  return toGateResult(PUBLISH_GATE_CHECKS.flatMap((check) => check(target, ctx)));
}
