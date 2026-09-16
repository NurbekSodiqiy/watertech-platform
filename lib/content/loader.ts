import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  rowToScript,
  rowToObjection,
  rowToFaq,
  rowToCompetitor,
  rowToPackageGroup,
  rowToProduct,
} from "@/lib/content/db";
import type { Script, Objection, Faq, Competitor, PackageGroup, Package } from "@/lib/content/types";
import type { Product } from "@/lib/content/products";
import type { Locale } from "@/i18n/routing";

export interface ContentBundle {
  scripts: Script[];
  objections: Objection[];
  faqs: Faq[];
  competitors: Competitor[];
  packageGroups: PackageGroup[];
}

// Validated once per server lifetime, outside production, so a content typo
// (a migration that drops a required field, a bad enum value) surfaces
// immediately in dev/CI instead of silently reaching a page. Trusted in
// production — no need to pay the parse cost there.
let devValidated = false;
async function assertValidInDev(bundle: ContentBundle): Promise<void> {
  if (devValidated || process.env.NODE_ENV === "production") return;
  devValidated = true;
  const { validateContentBundle } = await import("@/lib/content/schemas");
  validateContentBundle(bundle);
}

// === Locale resolution ============================================================
// Row -> domain mappers (lib/content/db.ts) return every raw <field> and
// <field>Ru column unresolved — the admin editors need both at once. The
// getters below are the one place that collapses them down to the single
// value a locale actually sees: `<field>Ru ?? <field>` when locale is "ru"
// and the translation isn't blank, else `<field>` (or, for products,
// `name_uz ?? name_ru` — see Product.name_uz). Un-migrated content (every
// *Ru field still null) reads identically to before this migration.

function loc(base: string, ruValue: string | undefined, locale: Locale): string {
  return locale === "ru" && ruValue ? ruValue : base;
}

function localizeScript(script: Script, locale: Locale): Script {
  return {
    ...script,
    name: loc(script.name, script.nameRu, locale),
    cheatSheet: loc(script.cheatSheet, script.cheatSheetRu, locale),
    stages: locale === "ru" && script.stagesRu && script.stagesRu.length > 0 ? script.stagesRu : script.stages,
    // Raw twins are for the admin editor only (which reads them off the
    // unlocalized rowToScript path, not this getter) — stripped here so the
    // resolved-only contract documented on Script.nameRu actually holds, and
    // so the (potentially large) duplicate stagesRu tree never rides along
    // in every operator page's RSC payload.
    nameRu: undefined,
    cheatSheetRu: undefined,
    stagesRu: undefined,
  };
}

function localizeObjection(objection: Objection, locale: Locale): Objection {
  return {
    ...objection,
    label: loc(objection.label, objection.labelRu, locale),
    clientSays: loc(objection.clientSays, objection.clientSaysRu, locale),
    realMeaning: loc(objection.realMeaning, objection.realMeaningRu, locale),
    response: loc(objection.response, objection.responseRu, locale),
    followUp: objection.followUp !== undefined ? loc(objection.followUp, objection.followUpRu, locale) : undefined,
    labelRu: undefined,
    clientSaysRu: undefined,
    realMeaningRu: undefined,
    responseRu: undefined,
    followUpRu: undefined,
  };
}

function localizeFaq(faq: Faq, locale: Locale): Faq {
  return {
    ...faq,
    question: loc(faq.question, faq.questionRu, locale),
    answer: loc(faq.answer, faq.answerRu, locale),
    questionRu: undefined,
    answerRu: undefined,
  };
}

function localizePackage(pkg: Package, locale: Locale): Package {
  return {
    ...pkg,
    name: loc(pkg.name, pkg.nameRu, locale),
    orderVolume: loc(pkg.orderVolume, pkg.orderVolumeRu, locale),
    paymentTerms: loc(pkg.paymentTerms, pkg.paymentTermsRu, locale),
    estimatedDiscount: loc(pkg.estimatedDiscount, pkg.estimatedDiscountRu, locale),
    logistics: loc(pkg.logistics, pkg.logisticsRu, locale),
    deliveryTime: loc(pkg.deliveryTime, pkg.deliveryTimeRu, locale),
    nameRu: undefined,
    orderVolumeRu: undefined,
    paymentTermsRu: undefined,
    estimatedDiscountRu: undefined,
    logisticsRu: undefined,
    deliveryTimeRu: undefined,
  };
}

function localizePackageGroup(group: PackageGroup, locale: Locale): PackageGroup {
  return {
    ...group,
    title: loc(group.title, group.titleRu, locale),
    subtitle: loc(group.subtitle, group.subtitleRu, locale),
    packages: group.packages.map((pkg) => localizePackage(pkg, locale)),
    titleRu: undefined,
    subtitleRu: undefined,
  };
}

/** Products are the one table where the roles are reversed: name_ru is the
 * required primary name (product names are Russian by default, see
 * CLAUDE.md section 1) and name_uz is the optional override. */
function localizeProduct(product: Product, locale: Locale): Product {
  return {
    ...product,
    name_ru: locale === "uz" && product.name_uz ? product.name_uz : product.name_ru,
    name_uz: undefined,
  };
}

// Every getter below reads with the service-role admin client rather than
// the request-scoped session client: unstable_cache runs outside the
// request lifecycle and cannot see cookies. Each query filters
// status = "published" explicitly so the shared cache never serves draft
// content — the same rows any authenticated operator's own RLS policy would
// let them read anyway, so this doesn't leak anything beyond that.
//
// Locale is passed as an argument to the cached function (not baked into
// keyParts) — unstable_cache derives its cache key from keyParts *and* the
// arguments a call receives, so "uz" and "ru" already land in separate cache
// entries under the same tags. The exported getters default to "uz" outside
// the cached function so `getScripts()` and `getScripts("uz")` always hash
// to the same call.

const getScriptsCached = unstable_cache(
  async (locale: Locale): Promise<Script[]> => {
    const { data, error } = await createAdminClient()
      .from("content_scripts")
      .select("*")
      .eq("status", "published")
      .order("sort_order");
    if (error) throw new Error(`content_scripts: ${error.message}`);
    return data.map((row) => localizeScript(rowToScript(row), locale));
  },
  ["content:scripts"],
  { tags: ["content", "content:scripts"], revalidate: 3600 }
);
export function getScripts(locale: Locale = "uz"): Promise<Script[]> {
  return getScriptsCached(locale);
}

const getObjectionsCached = unstable_cache(
  async (locale: Locale): Promise<Objection[]> => {
    const { data, error } = await createAdminClient()
      .from("content_objections")
      .select("*")
      .eq("status", "published")
      .order("sort_order");
    if (error) throw new Error(`content_objections: ${error.message}`);
    return data.map((row) => localizeObjection(rowToObjection(row), locale));
  },
  ["content:objections"],
  { tags: ["content", "content:objections"], revalidate: 3600 }
);
export function getObjections(locale: Locale = "uz"): Promise<Objection[]> {
  return getObjectionsCached(locale);
}

const getFaqsCached = unstable_cache(
  async (locale: Locale): Promise<Faq[]> => {
    const { data, error } = await createAdminClient()
      .from("content_faqs")
      .select("*")
      .eq("status", "published")
      .order("sort_order");
    if (error) throw new Error(`content_faqs: ${error.message}`);
    return data.map((row) => localizeFaq(rowToFaq(row), locale));
  },
  ["content:faqs"],
  { tags: ["content", "content:faqs"], revalidate: 3600 }
);
export function getFaqs(locale: Locale = "uz"): Promise<Faq[]> {
  return getFaqsCached(locale);
}

// content_competitors has no *_ru columns (battle-cards stay Uzbek-only, see
// the 0004 migration) — no locale argument needed here.
export const getCompetitors = unstable_cache(
  async (): Promise<Competitor[]> => {
    const { data, error } = await createAdminClient()
      .from("content_competitors")
      .select("*")
      .eq("status", "published")
      .order("sort_order");
    if (error) throw new Error(`content_competitors: ${error.message}`);
    return data.map(rowToCompetitor);
  },
  ["content:competitors"],
  { tags: ["content", "content:competitors"], revalidate: 3600 }
);

const getPackageGroupsCached = unstable_cache(
  async (locale: Locale): Promise<PackageGroup[]> => {
    const admin = createAdminClient();
    const [groupsRes, packagesRes] = await Promise.all([
      admin.from("content_package_groups").select("*").eq("status", "published").order("sort_order"),
      admin.from("content_packages").select("*").eq("status", "published").order("sort_order"),
    ]);
    if (groupsRes.error) throw new Error(`content_package_groups: ${groupsRes.error.message}`);
    if (packagesRes.error) throw new Error(`content_packages: ${packagesRes.error.message}`);
    return groupsRes.data.map((group) =>
      localizePackageGroup(
        rowToPackageGroup(
          group,
          packagesRes.data.filter((pkg) => pkg.group_id === group.id)
        ),
        locale
      )
    );
  },
  ["content:packages"],
  { tags: ["content", "content:packages"], revalidate: 3600 }
);
export function getPackageGroups(locale: Locale = "uz"): Promise<PackageGroup[]> {
  return getPackageGroupsCached(locale);
}

const getProductsCached = unstable_cache(
  async (locale: Locale): Promise<Product[]> => {
    const { data, error } = await createAdminClient()
      .from("content_products")
      .select("*")
      .eq("status", "published")
      .order("sort_order");
    if (error) throw new Error(`content_products: ${error.message}`);
    return data.map((row) => localizeProduct(rowToProduct(row), locale));
  },
  ["content:products"],
  { tags: ["content", "content:products"], revalidate: 3600 }
);
export function getProducts(locale: Locale = "uz"): Promise<Product[]> {
  return getProductsCached(locale);
}

export async function getContentBundle(locale: Locale = "uz"): Promise<ContentBundle> {
  const [scripts, objections, faqs, competitors, packageGroups] = await Promise.all([
    getScripts(locale),
    getObjections(locale),
    getFaqs(locale),
    getCompetitors(),
    getPackageGroups(locale),
  ]);
  const bundle = { scripts, objections, faqs, competitors, packageGroups };
  await assertValidInDev(bundle);
  return bundle;
}
