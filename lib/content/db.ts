import type {
  Script,
  Stage,
  Objection,
  Faq,
  Competitor,
  Package,
  PackageGroup,
  ChangelogEntry,
  Contact,
  Sop,
  SopStep,
} from "@/lib/content/types";
import type { Product } from "@/lib/content/products";
import { z } from "zod";
import {
  stagesSchema,
  competitorSchema,
  productSchema,
  sitePathSchema,
  contactPhoneSchema,
  contactMessengerSchema,
  sopStepsSchema,
} from "@/lib/content/schemas";
import type { Json } from "@/lib/supabase/database.types";
import type { Tables } from "@/lib/supabase/typed";

export type ScriptRow = Tables<"content_scripts">;
export type ObjectionRow = Tables<"content_objections">;
export type FaqRow = Tables<"content_faqs">;
export type CompetitorRow = Tables<"content_competitors">;
export type PackageGroupRow = Tables<"content_package_groups">;
export type PackageRow = Tables<"content_packages">;
export type ProductRow = Tables<"content_products">;
export type ChangelogRow = Tables<"content_changelog">;
export type ContactRow = Tables<"content_contacts">;
export type SopRow = Tables<"content_sops">;

// Generated row types widen CHECK-constrained text columns (threat_level,
// line, category, material) to plain string. The constraints make an invalid
// value unreachable in practice; if the schema ever drifts, log it and fall
// back instead of throwing — a mapper must never take a page down.
export function narrowColumn<T>(schema: z.ZodType<T>, value: unknown, fallback: T, what: string, id: string): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  console.error(`[content] invalid ${what} for`, id);
  return fallback;
}

/** JSONB stages -> Stage[]. The only place stages/stages_ru are narrowed. */
function parseStages(value: Json, id: string): Stage[] {
  const result = stagesSchema.safeParse(value);
  if (result.success) return result.data;
  console.error("[content] invalid stages for script", id);
  return [];
}

/** JSONB steps -> SopStep[]. The only place steps/steps_ru are narrowed. */
function parseSopSteps(value: Json, id: string): SopStep[] {
  const result = sopStepsSchema.safeParse(value);
  if (result.success) return result.data;
  console.error("[content] invalid steps for sop", id);
  return [];
}

/** SopStep[] -> JSONB, as plain object literals (see stagesToJson). */
function sopStepsToJson(steps: SopStep[]): Json {
  return steps.map((step) => ({ title: step.title, body: step.body }));
}

/** Stage[] -> JSONB. Rebuilt as plain object literals because interfaces
 * (Stage, ScriptTurn) are not assignable to Json's index signature. */
function stagesToJson(stages: Stage[]): Json {
  return stages.map((stage) => ({
    id: stage.id,
    label: stage.label,
    turns: stage.turns.map((turn) => ({
      speaker: turn.speaker,
      text: turn.text,
      subStepHeader: turn.subStepHeader,
      condition: turn.condition,
      links: turn.links?.map((link) => ({ label: link.label, type: link.type, id: link.id })),
    })),
    objectionIds: stage.objectionIds,
    nextStageId: stage.nextStageId,
  }));
}

// === Row -> domain ==============================================================

/** Fills in nextStageId from array order instead of hand-typing it per stage.
 * Shared by the seed literal (lib/content/scripts.ts) and the admin
 * upsertScript action, which recomputes it the same way from the stages
 * array's saved order rather than trusting a client-submitted value. */
export function chain(stages: Array<Omit<Stage, "nextStageId">>): Stage[] {
  return stages.map((s, i) => ({ ...s, nextStageId: stages[i + 1]?.id }));
}

export function rowToScript(row: ScriptRow): Script {
  return {
    id: row.id,
    name: row.name,
    cheatSheet: row.cheat_sheet,
    stages: parseStages(row.stages, row.id),
    nameRu: row.name_ru ?? undefined,
    cheatSheetRu: row.cheat_sheet_ru ?? undefined,
    stagesRu: row.stages_ru === null ? undefined : parseStages(row.stages_ru, row.id),
  };
}

export function rowToObjection(row: ObjectionRow): Objection {
  return {
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
  };
}

export function rowToFaq(row: FaqRow): Faq {
  return {
    id: row.id,
    category: row.category,
    question: row.question,
    answer: row.answer,
    questionRu: row.question_ru ?? undefined,
    answerRu: row.answer_ru ?? undefined,
  };
}

export function rowToChangelog(row: ChangelogRow): ChangelogEntry {
  return {
    id: row.id,
    publishedOn: row.published_on,
    title: row.title,
    body: row.body,
    // The CHECK constraint keeps a bad path out; if one ever gets in anyway it
    // is dropped here rather than rendered as a link off this site.
    linkedPath:
      row.linked_path === null ? undefined : narrowColumn(sitePathSchema.optional(), row.linked_path, undefined, "linked_path", row.id),
    approvedBy: row.approved_by,
    titleRu: row.title_ru ?? undefined,
    bodyRu: row.body_ru ?? undefined,
  };
}

export function rowToContact(row: ContactRow): Contact {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    topic: row.topic,
    // The CHECKs keep a malformed phone or handle out; if one ever gets in
    // anyway it is blanked here rather than rendered as a tel:/t.me link.
    phone: narrowColumn(contactPhoneSchema, row.phone, "", "phone", row.id),
    messenger: narrowColumn(contactMessengerSchema, row.messenger, "", "messenger", row.id),
    roleRu: row.role_ru ?? undefined,
    topicRu: row.topic_ru ?? undefined,
  };
}

export function rowToSop(row: SopRow): Sop {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    steps: parseSopSteps(row.steps, row.id),
    titleRu: row.title_ru ?? undefined,
    summaryRu: row.summary_ru ?? undefined,
    stepsRu: row.steps_ru === null ? undefined : parseSopSteps(row.steps_ru, row.id),
  };
}

export function rowToCompetitor(row: CompetitorRow): Competitor {
  return {
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
    threatLevel: narrowColumn(competitorSchema.shape.threatLevel, row.threat_level, "Ma'lumot yo'q", "threat_level", row.id),
  };
}

function rowToPackage(row: PackageRow): Package {
  return {
    id: row.id,
    name: row.name,
    isFeatured: row.is_featured,
    orderVolume: row.order_volume,
    paymentTerms: row.payment_terms,
    estimatedDiscount: row.estimated_discount,
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
  };
}

export function rowToPackageGroup(groupRow: PackageGroupRow, packageRows: PackageRow[]): PackageGroup {
  return {
    id: groupRow.id,
    title: groupRow.title,
    subtitle: groupRow.subtitle,
    packages: packageRows.map(rowToPackage),
    titleRu: groupRow.title_ru ?? undefined,
    subtitleRu: groupRow.subtitle_ru ?? undefined,
  };
}

export function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    filename: row.filename ?? undefined,
    image_path: row.image_path ?? undefined,
    name_ru: row.name_ru,
    name_uz: row.name_uz ?? undefined,
    sizes: row.sizes,
    line: narrowColumn(productSchema.shape.line, row.line, "ppr", "line", row.id),
    category: narrowColumn(productSchema.shape.category, row.category, "aksessuar", "category", row.id),
    material: row.material === null ? undefined : narrowColumn(productSchema.shape.material, row.material, undefined, "material", row.id),
  };
}

// === Domain -> row (seed + future admin writes) =================================
// Only the domain columns — bookkeeping columns (status, sort_order, ...) are
// the caller's decision (the seed script sets sort_order from array position).

/** A blank Ruscha (ixtiyoriy) admin field must save as null, not "" — that's
 * what makes an empty field fall back to Uzbek on read (lib/content/loader.ts)
 * instead of showing a permanently blank translation. */
function ru<T>(value: T | "" | undefined): T | null {
  return value ? value : null;
}

export function scriptToRow(script: Script) {
  return {
    id: script.id,
    name: script.name,
    cheat_sheet: script.cheatSheet,
    stages: stagesToJson(script.stages),
    name_ru: ru(script.nameRu),
    cheat_sheet_ru: ru(script.cheatSheetRu),
    stages_ru: script.stagesRu && script.stagesRu.length > 0 ? stagesToJson(script.stagesRu) : null,
  };
}

export function objectionToRow(objection: Objection) {
  return {
    id: objection.id,
    label: objection.label,
    keywords: objection.keywords,
    client_says: objection.clientSays,
    real_meaning: objection.realMeaning,
    response: objection.response,
    follow_up: objection.followUp ?? null,
    script_ids: objection.scriptIds,
    label_ru: ru(objection.labelRu),
    client_says_ru: ru(objection.clientSaysRu),
    real_meaning_ru: ru(objection.realMeaningRu),
    response_ru: ru(objection.responseRu),
    follow_up_ru: ru(objection.followUpRu),
  };
}

export function faqToRow(faq: Faq) {
  return {
    id: faq.id,
    category: faq.category,
    question: faq.question,
    answer: faq.answer,
    question_ru: ru(faq.questionRu),
    answer_ru: ru(faq.answerRu),
  };
}

export function changelogToRow(entry: ChangelogEntry) {
  return {
    id: entry.id,
    published_on: entry.publishedOn,
    title: entry.title,
    body: entry.body,
    linked_path: entry.linkedPath ?? null,
    approved_by: entry.approvedBy,
    title_ru: ru(entry.titleRu),
    body_ru: ru(entry.bodyRu),
  };
}

export function contactToRow(contact: Contact) {
  return {
    id: contact.id,
    name: contact.name,
    role: contact.role,
    topic: contact.topic,
    phone: contact.phone,
    messenger: contact.messenger,
    role_ru: ru(contact.roleRu),
    topic_ru: ru(contact.topicRu),
  };
}

export function sopToRow(sop: Sop) {
  return {
    id: sop.id,
    title: sop.title,
    summary: sop.summary,
    steps: sopStepsToJson(sop.steps),
    title_ru: ru(sop.titleRu),
    summary_ru: ru(sop.summaryRu),
    steps_ru: sop.stepsRu && sop.stepsRu.length > 0 ? sopStepsToJson(sop.stepsRu) : null,
  };
}

export function competitorToRow(competitor: Competitor) {
  return {
    id: competitor.id,
    name: competitor.name,
    assortment: competitor.assortment,
    base_discount: competitor.baseDiscount,
    volume_discount: competitor.volumeDiscount,
    retro_bonus: competitor.retroBonus,
    max_discount: competitor.maxDiscount,
    payment_terms: competitor.paymentTerms,
    payment_method: competitor.paymentMethod,
    delivery_time: competitor.deliveryTime,
    logistics: competitor.logistics,
    dealer_coverage: competitor.dealerCoverage,
    certificates: competitor.certificates,
    marketing_offers: competitor.marketingOffers,
    threat_level: competitor.threatLevel,
  };
}

export function packageGroupToRow(group: Pick<PackageGroup, "id" | "title" | "subtitle" | "titleRu" | "subtitleRu">) {
  return {
    id: group.id,
    title: group.title,
    subtitle: group.subtitle,
    title_ru: ru(group.titleRu),
    subtitle_ru: ru(group.subtitleRu),
  };
}

export function packageToRow(pkg: Package, groupId: string) {
  return {
    id: pkg.id,
    group_id: groupId,
    name: pkg.name,
    is_featured: pkg.isFeatured,
    order_volume: pkg.orderVolume,
    payment_terms: pkg.paymentTerms,
    estimated_discount: pkg.estimatedDiscount,
    logistics: pkg.logistics,
    delivery_time: pkg.deliveryTime,
    discount_pct: pkg.discountPct,
    advance_pct: pkg.advancePct,
    name_ru: ru(pkg.nameRu),
    order_volume_ru: ru(pkg.orderVolumeRu),
    payment_terms_ru: ru(pkg.paymentTermsRu),
    estimated_discount_ru: ru(pkg.estimatedDiscountRu),
    logistics_ru: ru(pkg.logisticsRu),
    delivery_time_ru: ru(pkg.deliveryTimeRu),
  };
}

/** No `image_path`: that column is written only by the upload action
 * (lib/admin/actions/product-image.ts), so neither a form save nor the seed
 * can clear a photo a manager uploaded. See MANAGED_COLUMNS in
 * lib/admin/registry.ts. */
export function productToRow(product: Product) {
  return {
    id: product.id,
    filename: product.filename ?? null,
    name_ru: product.name_ru,
    name_uz: ru(product.name_uz),
    sizes: product.sizes,
    line: product.line,
    category: product.category,
    material: product.material ?? null,
  };
}
