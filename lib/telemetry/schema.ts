import { z } from "zod";
import { TELEMETRY_EVENT_TYPES } from "./types";
import type { Json } from "@/lib/supabase/database.types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Any JSON value — meta lands in the telemetry_events.meta JSONB column. */
const jsonValueSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValueSchema), z.record(jsonValueSchema)])
);

const copilotAskMetaSchema = z
  .object({ hits: z.number().int().min(0).max(50), chars: z.number().int().min(0).max(20_000) })
  .strict();

const pinToggleMetaSchema = z.object({ pinned: z.boolean() }).strict();

export const telemetryEventSchema = z.object({
  sessionId: z.string().uuid(),
  ts: z
    .number()
    .int()
    .refine((ts) => Math.abs(Date.now() - ts) <= DAY_MS, {
      message: "ts must be within 24h of the current time",
    }),
  type: z.enum(TELEMETRY_EVENT_TYPES),
  path: z
    .string()
    .max(200)
    .regex(/^\//),
  entityType: z.string().max(100).optional(),
  entityId: z.string().max(200).optional(),
  durationMs: z.number().int().min(0).max(86_400_000).optional(),
  meta: z
    .record(jsonValueSchema)
    .optional()
    .refine((m) => !m || JSON.stringify(m).length <= 600, {
      message: "meta must serialize to 600 bytes or fewer",
    }),
}).superRefine((event, ctx) => {
  // copilot_ask carries counts only. Strict, so a client that starts sending
  // the question text (operator-visible on the dashboard) is rejected here.
  if (event.type === "copilot_ask" && !copilotAskMetaSchema.safeParse(event.meta).success) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["meta"], message: "copilot_ask meta must be { hits, chars }" });
  }
  if (event.type === "pin_toggle" && !pinToggleMetaSchema.safeParse(event.meta).success) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["meta"], message: "pin_toggle meta must be { pinned }" });
  }
});

export const telemetryBatchSchema = z.array(telemetryEventSchema).min(1).max(25);

export type TelemetryEventInput = z.infer<typeof telemetryEventSchema>;
export type TelemetryBatchInput = z.infer<typeof telemetryBatchSchema>;
