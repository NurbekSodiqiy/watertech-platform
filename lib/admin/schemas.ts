import { z } from "zod";
import {
  changelogSchema,
  contactSchema,
  sopSchema,
  sopStepSchema,
  sitePathSchema,
  faqSchema,
  objectionSchema,
  competitorSchema,
  packageSchema,
  packageGroupSchema,
  productSchema,
  scriptSchema,
  stageSchema,
} from "@/lib/content/schemas";

/** Content table ids are stable slugs — telemetry and script/objection cross
 * references key off them, so the admin UI enforces the same shape a
 * hand-written content id already follows. */
export const idSchema = z
  .string()
  .min(1, "Majburiy")
  .regex(/^[a-z0-9-]+$/, "Faqat kichik lotin harflari, raqamlar va tire (-)");

export const statusSchema = z.enum(["draft", "published"]);

function csvToArray(value: string): string[] {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Comma-separated text input -> string[], for array fields (keywords,
 * scriptIds, sizes) edited as a single text field in EntityForm. */
const csvArrayField = z.string().transform(csvToArray);

/** Text/number input (always a string coming out of an HTML input) -> a
 * required number. Kept as a string->number transform rather than
 * z.coerce.number() so the field's input type (what EntityForm/RHF binds
 * to) stays `string`, not `unknown`. */
const numberField = z
  .string()
  .transform((v) => Number(v))
  .refine((v) => Number.isFinite(v), { message: "Raqam kiriting" });

/** Same as numberField, but "" -> null (an optional number input left
 * blank) instead of failing. */
const optionalNumberField = z
  .string()
  .transform((v) => (v.trim() === "" ? null : Number(v)))
  .refine((v) => v === null || Number.isFinite(v), { message: "Raqam kiriting" });

/** The row's last-known version, for optimistic concurrency
 * (lib/admin/actions/concurrency.ts) — undefined means "creating a new row,
 * skip the check". Every *WriteSchema carries this as the already-numeric
 * shape a Server Action call receives; every *FormSchema below overrides it
 * with versionFormField since EntityForm binds it to a hidden HTML input
 * (always a string, blank on create). */
const versionField = z.number().int().nonnegative().optional();
const versionFormField = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v.trim() === "" ? undefined : Number(v)))
  .pipe(versionField);

// === Write schemas — server actions validate the already-structured value
// (arrays, numbers, booleans) a submitted form or a version restore
// produces, reusing the same field rules as the public content schemas. ===

/** Stage ids follow the same slug rule as every other content id — the
 * editor auto-fills one from the stage label, but a manager can still type
 * one by hand. Uniqueness across a script's stages can't be expressed by the
 * shape alone, hence the superRefine below. */
function checkStageIdsUnique(stages: { id: string }[], path: "stages" | "stagesRu", ctx: z.RefinementCtx): void {
  const seen = new Set<string>();
  stages.forEach((stage, index) => {
    if (seen.has(stage.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bosqich ID takrorlanmoqda",
        path: [path, index, "id"],
      });
    }
    seen.add(stage.id);
  });
}

export const scriptWriteSchema = scriptSchema
  .extend({
    id: idSchema,
    status: statusSchema,
    stages: z.array(stageSchema.extend({ id: idSchema })),
    stagesRu: z.array(stageSchema.extend({ id: idSchema })).optional(),
    version: versionField,
  })
  .superRefine((script, ctx) => {
    checkStageIdsUnique(script.stages, "stages", ctx);
    if (script.stagesRu) checkStageIdsUnique(script.stagesRu, "stagesRu", ctx);
  });

export const faqWriteSchema = faqSchema.extend({ id: idSchema, status: statusSchema, version: versionField });
export const changelogWriteSchema = changelogSchema.extend({
  id: idSchema,
  status: statusSchema,
  version: versionField,
});
export const contactWriteSchema = contactSchema.extend({
  id: idSchema,
  status: statusSchema,
  version: versionField,
});
/** An SOP saves with at least one step, and every step needs its instruction
 * (the body is the optional note under it) — stricter than the read path's
 * sopSchema, which only describes what may be stored. SopEditor binds to this
 * schema directly (no *FormSchema): it has no transforms beyond trim, so the
 * form's input and output types are the same. */
const sopStepWriteSchema = sopStepSchema.extend({ title: z.string().trim().min(1, "Majburiy") });
export const sopWriteSchema = sopSchema.extend({
  id: idSchema,
  status: statusSchema,
  steps: z.array(sopStepWriteSchema).min(1, "Kamida bitta qadam kerak"),
  stepsRu: z.array(sopStepWriteSchema).optional(),
  version: versionField,
});
export const objectionWriteSchema = objectionSchema.extend({
  id: idSchema,
  status: statusSchema,
  version: versionField,
});
export const competitorWriteSchema = competitorSchema.extend({
  id: idSchema,
  status: statusSchema,
  version: versionField,
});
export const packageGroupWriteSchema = packageGroupSchema
  .omit({ packages: true })
  .extend({ id: idSchema, status: statusSchema, version: versionField });
export const packageWriteSchema = packageSchema.extend({
  id: idSchema,
  status: statusSchema,
  groupId: idSchema,
  version: versionField,
});
export const productWriteSchema = productSchema.extend({ id: idSchema, status: statusSchema, version: versionField });

// === Form schemas — react-hook-form + zodResolver on the client. Array
// fields are edited as one comma-separated text input and transformed here;
// TForm (react-hook-form's generic) is z.input<...> (raw strings), the
// value passed to onSubmit is z.output<...> (the transformed/coerced shape
// the write schemas above also expect). ===

export const faqFormSchema = faqWriteSchema.extend({ version: versionFormField });
/** The optional "Bog'langan sahifa" text input is "" when left blank —
 * that means "no link", not an invalid path. */
const linkedPathFormField = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v.trim() === "" ? undefined : v.trim()))
  .pipe(sitePathSchema.optional());
export const changelogFormSchema = changelogWriteSchema.extend({
  linkedPath: linkedPathFormField,
  version: versionFormField,
});
export const contactFormSchema = contactWriteSchema.extend({ version: versionFormField });
export const objectionFormSchema = objectionWriteSchema.extend({
  keywords: csvArrayField,
  scriptIds: csvArrayField,
  version: versionFormField,
});
export const competitorFormSchema = competitorWriteSchema.extend({ version: versionFormField });
export const packageGroupFormSchema = packageGroupWriteSchema.extend({ version: versionFormField });
export const packageFormSchema = packageWriteSchema.extend({
  discountPct: numberField,
  advancePct: optionalNumberField,
  version: versionFormField,
});
/** The product's material <select> offers an empty "no material" option
 * (native <select> values are always strings) — map that back to undefined
 * before the literal("latun").optional() schema runs. */
const materialField = z.preprocess((v) => (v === "" ? undefined : v), productSchema.shape.material);

export const productFormSchema = productWriteSchema.extend({
  sizes: csvArrayField,
  material: materialField,
  version: versionFormField,
});

// Output types — what onSubmit/the server actions receive (already parsed:
// arrays, numbers, etc). Input types — what EntityForm/react-hook-form bind
// to (raw strings for csv/number fields) and what a page's defaultValues
// must match.

export type ScriptFormValues = z.infer<typeof scriptWriteSchema>;
export type SopFormValues = z.infer<typeof sopWriteSchema>;

export type FaqFormValues = z.output<typeof faqFormSchema>;
export type ChangelogFormValues = z.output<typeof changelogFormSchema>;
export type ContactFormValues = z.output<typeof contactFormSchema>;
export type ObjectionFormValues = z.output<typeof objectionFormSchema>;
export type CompetitorFormValues = z.output<typeof competitorFormSchema>;
export type PackageGroupFormValues = z.output<typeof packageGroupFormSchema>;
export type PackageFormValues = z.output<typeof packageFormSchema>;
export type ProductFormValues = z.output<typeof productFormSchema>;

export type FaqFormInput = z.input<typeof faqFormSchema>;
export type ChangelogFormInput = z.input<typeof changelogFormSchema>;
export type ContactFormInput = z.input<typeof contactFormSchema>;
export type ObjectionFormInput = z.input<typeof objectionFormSchema>;
export type CompetitorFormInput = z.input<typeof competitorFormSchema>;
export type PackageGroupFormInput = z.input<typeof packageGroupFormSchema>;
export type PackageFormInput = z.input<typeof packageFormSchema>;
export type ProductFormInput = z.input<typeof productFormSchema>;
