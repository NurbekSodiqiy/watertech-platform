import type { Script, Stage, Objection, Faq, Competitor, Package, PackageGroup } from "@/lib/content/types";
import type { Product } from "@/lib/content/products";

/** Bookkeeping columns every content_* table carries, on top of its own
 * domain columns. Not part of any domain type — callers that need them
 * (the seed script's sort_order, a future admin UI's status toggle) read
 * them off the row directly rather than through a mapper. */
export interface ContentCommonRow {
  status: "draft" | "published";
  sort_order: number;
  version: number;
  updated_at: string;
  updated_by: string | null;
  created_at: string;
}

export interface ScriptRow extends ContentCommonRow {
  id: string;
  name: string;
  cheat_sheet: string;
  stages: unknown;
  name_ru: string | null;
  cheat_sheet_ru: string | null;
  stages_ru: unknown;
}

export interface ObjectionRow extends ContentCommonRow {
  id: string;
  label: string;
  keywords: string[];
  client_says: string;
  real_meaning: string;
  response: string;
  follow_up: string | null;
  script_ids: string[];
  label_ru: string | null;
  client_says_ru: string | null;
  real_meaning_ru: string | null;
  response_ru: string | null;
  follow_up_ru: string | null;
}

export interface FaqRow extends ContentCommonRow {
  id: string;
  category: string;
  question: string;
  answer: string;
  question_ru: string | null;
  answer_ru: string | null;
}

export interface CompetitorRow extends ContentCommonRow {
  id: string;
  name: string;
  assortment: string | null;
  base_discount: string | null;
  volume_discount: string | null;
  retro_bonus: string | null;
  max_discount: string | null;
  payment_terms: string | null;
  payment_method: string | null;
  delivery_time: string | null;
  logistics: string | null;
  dealer_coverage: string | null;
  certificates: string | null;
  marketing_offers: string | null;
  threat_level: Competitor["threatLevel"];
}

export interface PackageGroupRow extends ContentCommonRow {
  id: string;
  title: string;
  subtitle: string;
  title_ru: string | null;
  subtitle_ru: string | null;
}

export interface PackageRow extends ContentCommonRow {
  id: string;
  group_id: string;
  name: string;
  is_featured: boolean;
  order_volume: string;
  payment_terms: string;
  estimated_discount: string;
  logistics: string;
  delivery_time: string;
  discount_pct: number;
  advance_pct: number | null;
  name_ru: string | null;
  order_volume_ru: string | null;
  payment_terms_ru: string | null;
  estimated_discount_ru: string | null;
  logistics_ru: string | null;
  delivery_time_ru: string | null;
}

export interface ProductRow extends ContentCommonRow {
  id: string;
  filename: string;
  name_ru: string;
  name_uz: string | null;
  sizes: string[];
  line: Product["line"];
  category: Product["category"];
  material: Product["material"] | null;
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
    stages: row.stages as Stage[],
    nameRu: row.name_ru ?? undefined,
    cheatSheetRu: row.cheat_sheet_ru ?? undefined,
    stagesRu: (row.stages_ru as Stage[] | null) ?? undefined,
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
    threatLevel: row.threat_level,
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
    filename: row.filename,
    name_ru: row.name_ru,
    name_uz: row.name_uz ?? undefined,
    sizes: row.sizes,
    line: row.line,
    category: row.category,
    material: row.material ?? undefined,
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
    stages: script.stages,
    name_ru: ru(script.nameRu),
    cheat_sheet_ru: ru(script.cheatSheetRu),
    stages_ru: script.stagesRu && script.stagesRu.length > 0 ? script.stagesRu : null,
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

export function productToRow(product: Product) {
  return {
    id: product.id,
    filename: product.filename,
    name_ru: product.name_ru,
    name_uz: ru(product.name_uz),
    sizes: product.sizes,
    line: product.line,
    category: product.category,
    material: product.material ?? null,
  };
}
