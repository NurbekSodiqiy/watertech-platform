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
import type { Script, Objection, Faq, Competitor, PackageGroup } from "@/lib/content/types";
import type { Product } from "@/lib/content/products";

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

// Every getter below reads with the service-role admin client rather than
// the request-scoped session client: unstable_cache runs outside the
// request lifecycle and cannot see cookies. Each query filters
// status = "published" explicitly so the shared cache never serves draft
// content — the same rows any authenticated operator's own RLS policy would
// let them read anyway, so this doesn't leak anything beyond that.

export const getScripts = unstable_cache(
  async (): Promise<Script[]> => {
    const { data, error } = await createAdminClient()
      .from("content_scripts")
      .select("*")
      .eq("status", "published")
      .order("sort_order");
    if (error) throw new Error(`content_scripts: ${error.message}`);
    return data.map(rowToScript);
  },
  ["content:scripts"],
  { tags: ["content", "content:scripts"], revalidate: 3600 }
);

export const getObjections = unstable_cache(
  async (): Promise<Objection[]> => {
    const { data, error } = await createAdminClient()
      .from("content_objections")
      .select("*")
      .eq("status", "published")
      .order("sort_order");
    if (error) throw new Error(`content_objections: ${error.message}`);
    return data.map(rowToObjection);
  },
  ["content:objections"],
  { tags: ["content", "content:objections"], revalidate: 3600 }
);

export const getFaqs = unstable_cache(
  async (): Promise<Faq[]> => {
    const { data, error } = await createAdminClient()
      .from("content_faqs")
      .select("*")
      .eq("status", "published")
      .order("sort_order");
    if (error) throw new Error(`content_faqs: ${error.message}`);
    return data.map(rowToFaq);
  },
  ["content:faqs"],
  { tags: ["content", "content:faqs"], revalidate: 3600 }
);

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

export const getPackageGroups = unstable_cache(
  async (): Promise<PackageGroup[]> => {
    const admin = createAdminClient();
    const [groupsRes, packagesRes] = await Promise.all([
      admin.from("content_package_groups").select("*").eq("status", "published").order("sort_order"),
      admin.from("content_packages").select("*").eq("status", "published").order("sort_order"),
    ]);
    if (groupsRes.error) throw new Error(`content_package_groups: ${groupsRes.error.message}`);
    if (packagesRes.error) throw new Error(`content_packages: ${packagesRes.error.message}`);
    return groupsRes.data.map((group) =>
      rowToPackageGroup(
        group,
        packagesRes.data.filter((pkg) => pkg.group_id === group.id)
      )
    );
  },
  ["content:packages"],
  { tags: ["content", "content:packages"], revalidate: 3600 }
);

export const getProducts = unstable_cache(
  async (): Promise<Product[]> => {
    const { data, error } = await createAdminClient()
      .from("content_products")
      .select("*")
      .eq("status", "published")
      .order("sort_order");
    if (error) throw new Error(`content_products: ${error.message}`);
    return data.map(rowToProduct);
  },
  ["content:products"],
  { tags: ["content", "content:products"], revalidate: 3600 }
);

export async function getContentBundle(): Promise<ContentBundle> {
  const [scripts, objections, faqs, competitors, packageGroups] = await Promise.all([
    getScripts(),
    getObjections(),
    getFaqs(),
    getCompetitors(),
    getPackageGroups(),
  ]);
  const bundle = { scripts, objections, faqs, competitors, packageGroups };
  await assertValidInDev(bundle);
  return bundle;
}
