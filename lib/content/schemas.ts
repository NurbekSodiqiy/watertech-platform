import { z } from "zod";
import type { ContentBundle } from "./loader";
import { ContentValidationError } from "./errors";

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

/** Shape of the content_scripts.stages / stages_ru JSONB columns. */
export const stagesSchema = z.array(stageSchema);

export const scriptSchema = z.object({
  id: z.string(),
  name: z.string(),
  cheatSheet: z.string(),
  stages: z.array(stageSchema),
  nameRu: z.string().optional(),
  cheatSheetRu: z.string().optional(),
  stagesRu: z.array(stageSchema).optional(),
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
  labelRu: z.string().optional(),
  clientSaysRu: z.string().optional(),
  realMeaningRu: z.string().optional(),
  responseRu: z.string().optional(),
  followUpRu: z.string().optional(),
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
  questionRu: z.string().optional(),
  answerRu: z.string().optional(),
});

/** "YYYY-MM-DD" that is also a real calendar day ("2026-02-30" is rejected). */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Sana YYYY-MM-DD ko'rinishida bo'lishi kerak")
  .refine(
    (value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
    },
    { message: "Bunday sana mavjud emas" }
  );

/** A path on this site: one leading "/", never "//host" (protocol-relative). */
export const sitePathSchema = z
  .string()
  .regex(/^\/(?!\/)\S*$/, "Yo'l bitta «/» bilan boshlanishi va bo'sh joysiz bo'lishi kerak (masalan: /faq)");

export const changelogSchema = z.object({
  id: z.string(),
  publishedOn: isoDateSchema,
  title: z.string(),
  body: z.string(),
  linkedPath: sitePathSchema.optional(),
  approvedBy: z.string(),
  titleRu: z.string().optional(),
  bodyRu: z.string().optional(),
});

/** "+998 90 123 45 67" (spaces or dashes between the groups optional) or an
 * internal extension of 2-5 digits. Kept in step with the CHECK in
 * 0011_content_contacts.sql. */
export const contactPhoneSchema = z
  .string()
  .regex(
    /^(?:\+998[ -]?\d{2}[ -]?\d{3}[ -]?\d{2}[ -]?\d{2}|\d{2,5})$/,
    "Telefon +998 90 123 45 67 ko'rinishida yoki 2–5 xonali ichki raqam bo'lishi kerak"
  );

/** Telegram handle — it becomes a t.me link, so nothing but the handle itself. */
export const contactMessengerSchema = z
  .string()
  .regex(/^@[A-Za-z][A-Za-z0-9_]{4,31}$/, "Telegram nomi @ bilan boshlanadi (masalan: @watertech_savdo)");

export const contactSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  topic: z.string(),
  phone: contactPhoneSchema,
  messenger: contactMessengerSchema,
  roleRu: z.string().optional(),
  topicRu: z.string().optional(),
});

export const sopStepSchema = z.object({
  title: z.string(),
  body: z.string(),
});

export const sopStepsSchema = z.array(sopStepSchema);

export const sopSchema = z.object({
  id: z.string(),
  title: z.string(),
  summary: z.string(),
  steps: sopStepsSchema,
  titleRu: z.string().optional(),
  summaryRu: z.string().optional(),
  stepsRu: sopStepsSchema.optional(),
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
  nameRu: z.string().optional(),
  orderVolumeRu: z.string().optional(),
  paymentTermsRu: z.string().optional(),
  estimatedDiscountRu: z.string().optional(),
  logisticsRu: z.string().optional(),
  deliveryTimeRu: z.string().optional(),
});

export const packageGroupSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  packages: z.array(packageSchema),
  titleRu: z.string().optional(),
  subtitleRu: z.string().optional(),
});

export const productSchema = z.object({
  id: z.string(),
  filename: z.string().optional(),
  image_path: z.string().optional(),
  name_ru: z.string(),
  name_uz: z.string().optional(),
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
    throw new ContentValidationError(`Invalid content bundle: ${issues}`);
  }
  return result.data;
}
