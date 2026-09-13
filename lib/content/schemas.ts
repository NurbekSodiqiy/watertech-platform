import { z } from "zod";
import type { ContentBundle } from "./loader";

export const scriptTurnLinkSchema = z.object({
  label: z.string(),
  type: z.enum(["package", "competitor", "faq"]),
  id: z.string(),
});

export const scriptTurnSchema = z.object({
  speaker: z.enum(["operator", "mijoz", "note"]),
  text: z.string(),
  subStepHeader: z.string().optional(),
  condition: z.string().optional(),
  links: z.array(scriptTurnLinkSchema).optional(),
});

export const stageSchema = z.object({
  id: z.string(),
  label: z.string(),
  turns: z.array(scriptTurnSchema),
  objectionIds: z.array(z.string()),
  nextStageId: z.string().optional(),
});

export const scriptSchema = z.object({
  id: z.string(),
  name: z.string(),
  cheatSheet: z.string(),
  stages: z.array(stageSchema),
});

export const objectionSchema = z.object({
  id: z.string(),
  label: z.string(),
  keywords: z.array(z.string()),
  clientSays: z.string(),
  realMeaning: z.string(),
  response: z.string(),
  followUp: z.string().optional(),
  scriptIds: z.array(z.string()),
});

export const competitorSchema = z.object({
  id: z.string(),
  name: z.string(),
  assortment: z.string(),
  baseDiscount: z.string(),
  volumeDiscount: z.string(),
  retroBonus: z.string(),
  maxDiscount: z.string(),
  paymentTerms: z.string(),
  paymentMethod: z.string(),
  deliveryTime: z.string(),
  logistics: z.string(),
  dealerCoverage: z.string(),
  certificates: z.string(),
  marketingOffers: z.string(),
  threatLevel: z.enum(["Yuqori", "O'rta", "Ma'lumot yo'q"]),
});

export const faqSchema = z.object({
  id: z.string(),
  category: z.string(),
  question: z.string(),
  answer: z.string(),
});

export const packageSchema = z.object({
  id: z.string(),
  name: z.string(),
  isFeatured: z.boolean(),
  orderVolume: z.string(),
  paymentTerms: z.string(),
  estimatedDiscount: z.string(),
  discountPct: z.number(),
  advancePct: z.number().nullable(),
  logistics: z.string(),
  deliveryTime: z.string(),
});

export const packageGroupSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  packages: z.array(packageSchema),
});

export const productSchema = z.object({
  filename: z.string(),
  name_ru: z.string(),
  sizes: z.array(z.string()),
  line: z.enum(["ppr", "kanalizatsiya"]),
  category: z.enum(["truba", "fiting", "kran", "aksessuar"]),
  material: z.literal("latun").optional(),
});

export const contentBundleSchema = z.object({
  scripts: z.array(scriptSchema),
  objections: z.array(objectionSchema),
  faqs: z.array(faqSchema),
  competitors: z.array(competitorSchema),
  packageGroups: z.array(packageGroupSchema),
});

export function validateContentBundle(bundle: unknown): ContentBundle {
  const result = contentBundleSchema.safeParse(bundle);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid content bundle: ${issues}`);
  }
  return result.data;
}
