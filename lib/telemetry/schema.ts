import { z } from "zod";
import { TELEMETRY_EVENT_TYPES } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

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
    .record(z.unknown())
    .optional()
    .refine((m) => !m || JSON.stringify(m).length <= 600, {
      message: "meta must serialize to 600 bytes or fewer",
    }),
});

export const telemetryBatchSchema = z.array(telemetryEventSchema).min(1).max(25);

export type TelemetryEventInput = z.infer<typeof telemetryEventSchema>;
export type TelemetryBatchInput = z.infer<typeof telemetryBatchSchema>;
