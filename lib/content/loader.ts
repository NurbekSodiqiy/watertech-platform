import "server-only";
import { scripts } from "@/lib/content/scripts";
import { objections } from "@/lib/content/objections";
import { faqs } from "@/lib/content/faq";
import { competitors } from "@/lib/content/competitors";
import { packageGroups } from "@/lib/content/packages";
import { products, type Product } from "@/lib/content/products";
import type { Script, Objection, Faq, Competitor, PackageGroup } from "@/lib/content/types";

export interface ContentBundle {
  scripts: Script[];
  objections: Objection[];
  faqs: Faq[];
  competitors: Competitor[];
  packageGroups: PackageGroup[];
}

// Validated once at first load, outside production, so a content typo
// (a copy-paste that drops a required field, a bad enum value) surfaces
// immediately in dev/CI instead of silently reaching a page. The static
// arrays are trusted in production — no need to pay the parse cost there.
let devValidated = false;
async function assertValidInDev(): Promise<void> {
  if (devValidated || process.env.NODE_ENV === "production") return;
  devValidated = true;
  const { validateContentBundle } = await import("@/lib/content/schemas");
  validateContentBundle({ scripts, objections, faqs, competitors, packageGroups });
}

// Each getter returns the existing static array today; swapping the body for
// a Supabase read later (S14) needs no change on the caller side.
export async function getScripts(): Promise<Script[]> {
  await assertValidInDev();
  return scripts;
}

export async function getObjections(): Promise<Objection[]> {
  await assertValidInDev();
  return objections;
}

export async function getFaqs(): Promise<Faq[]> {
  await assertValidInDev();
  return faqs;
}

export async function getCompetitors(): Promise<Competitor[]> {
  await assertValidInDev();
  return competitors;
}

export async function getPackageGroups(): Promise<PackageGroup[]> {
  await assertValidInDev();
  return packageGroups;
}

export async function getProducts(): Promise<Product[]> {
  return products;
}

export async function getContentBundle(): Promise<ContentBundle> {
  await assertValidInDev();
  return { scripts, objections, faqs, competitors, packageGroups };
}
