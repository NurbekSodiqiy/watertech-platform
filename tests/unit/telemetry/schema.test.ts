import { describe, expect, it } from "vitest";
import { telemetryBatchSchema, telemetryEventSchema } from "@/lib/telemetry/schema";

const validEvent = {
  sessionId: "123e4567-e89b-12d3-a456-426614174000",
  ts: Date.now(),
  type: "page_enter" as const,
  path: "/scripts",
};

describe("telemetryBatchSchema", () => {
  it("accepts a valid batch", () => {
    expect(telemetryBatchSchema.safeParse([validEvent]).success).toBe(true);
  });

  it("rejects a batch of 26 events (max is 25)", () => {
    const batch = Array.from({ length: 26 }, () => validEvent);
    expect(telemetryBatchSchema.safeParse(batch).success).toBe(false);
  });
});

describe("telemetryEventSchema", () => {
  it("rejects a path without a leading slash", () => {
    const result = telemetryEventSchema.safeParse({ ...validEvent, path: "scripts" });
    expect(result.success).toBe(false);
  });

  it("rejects meta that serializes to more than 600 bytes", () => {
    const oversizedMeta = { blob: "x".repeat(600) };
    const result = telemetryEventSchema.safeParse({ ...validEvent, meta: oversizedMeta });
    expect(result.success).toBe(false);
  });
});
