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

// Each getter returns the existing static array today; swapping the body for
// a Supabase read later (S14) needs no change on the caller side.
export async function getScripts(): Promise<Script[]> {
  return scripts;
}

export async function getObjections(): Promise<Objection[]> {
  return objections;
}

export async function getFaqs(): Promise<Faq[]> {
  return faqs;
}

export async function getCompetitors(): Promise<Competitor[]> {
  return competitors;
}

export async function getPackageGroups(): Promise<PackageGroup[]> {
  return packageGroups;
}

export async function getProducts(): Promise<Product[]> {
  return products;
}

export async function getContentBundle(): Promise<ContentBundle> {
  return { scripts, objections, faqs, competitors, packageGroups };
}
