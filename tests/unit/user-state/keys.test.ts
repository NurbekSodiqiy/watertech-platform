import { describe, expect, it } from "vitest";
import {
  dailyKeyForDay,
  dateKey,
  isValidUserStateKey,
  onboardingKeyDef,
  scriptsPositionKey,
  USER_STATE_KEY_DEFS,
} from "@/lib/user-state/keys";

describe("isValidUserStateKey", () => {
  it("accepts every key this app defines", () => {
    for (const def of USER_STATE_KEY_DEFS) {
      expect(isValidUserStateKey(def.key), def.key).toBe(true);
    }
    expect(isValidUserStateKey(dailyKeyForDay("2026-09-19").key)).toBe(true);
  });

  it("rejects what the table's CHECK constraint would reject", () => {
    expect(isValidUserStateKey("Onboarding.v2")).toBe(false); // uppercase
    expect(isValidUserStateKey("onboarding_v2")).toBe(false); // underscore
    expect(isValidUserStateKey("onboarding..v2")).toBe(false); // empty segment
    expect(isValidUserStateKey(".onboarding")).toBe(false);
    expect(isValidUserStateKey("onboarding.")).toBe(false);
    expect(isValidUserStateKey("")).toBe(false);
    expect(isValidUserStateKey(`daily.${"9".repeat(64)}`)).toBe(false); // too long
  });
});

describe("dateKey", () => {
  it("formats the viewer's local calendar date, zero-padded", () => {
    expect(dateKey(new Date(2026, 8, 19))).toBe("2026-09-19");
    expect(dateKey(new Date(2026, 0, 2))).toBe("2026-01-02");
  });

  it("does not roll over to the UTC date late in the evening", () => {
    // 23:30 local on the 19th is the 20th in UTC east of Greenwich; the key
    // must follow the operator's own midnight, not UTC's.
    expect(dateKey(new Date(2026, 8, 19, 23, 30))).toBe("2026-09-19");
  });
});

describe("schema fallbacks", () => {
  it("rejects a stored onboarding value that is not a map of booleans", () => {
    const def = onboardingKeyDef(["summary-d1"]);
    expect(def.schema.safeParse({ "summary-d1": true }).success).toBe(true);
    expect(def.schema.safeParse({ "summary-d1": "yes" }).success).toBe(false);
    expect(def.schema.safeParse(["summary-d1"]).success).toBe(false);
    expect(def.defaultValue).toEqual({});
  });

  it("rejects a daily value missing either half, and caps call counts", () => {
    const def = dailyKeyForDay("2026-09-19");
    expect(def.schema.safeParse({ checked: {}, calls: {} }).success).toBe(true);
    expect(def.schema.safeParse({ checked: {} }).success).toBe(false);
    expect(def.schema.safeParse({ checked: {}, calls: { "1": 7 } }).success).toBe(false);
    expect(def.schema.safeParse({ checked: {}, calls: { "1": "1234567" } }).success).toBe(false);
    expect(def.defaultValue).toEqual({ checked: {}, calls: {} });
  });

  it("accepts a script position with no stage but not one with no script", () => {
    expect(scriptsPositionKey.schema.safeParse({ scriptId: "s1", stageId: null }).success).toBe(true);
    expect(scriptsPositionKey.schema.safeParse(null).success).toBe(true);
    expect(scriptsPositionKey.schema.safeParse({ scriptId: "", stageId: null }).success).toBe(false);
    expect(scriptsPositionKey.schema.safeParse({ stageId: "stage-1" }).success).toBe(false);
    expect(scriptsPositionKey.defaultValue).toBeNull();
  });

  it("caps the keys that grow: pins, recents, changelog.read", () => {
    const byKey = new Map(USER_STATE_KEY_DEFS.map((def) => [def.key, def]));
    expect(byKey.get("pins")?.schema.safeParse(Array.from({ length: 51 }, (_, i) => `/p${i}`)).success).toBe(false);
    expect(byKey.get("recents")?.schema.safeParse([{ path: "/faq", at: "2026-09-19T08:00:00.000Z" }]).success).toBe(true);
    expect(byKey.get("recents")?.schema.safeParse([{ path: "/faq" }]).success).toBe(false);
    expect(byKey.get("changelog.read")?.schema.safeParse(["v1", "v2"]).success).toBe(true);
    expect(byKey.get("changelog.read")?.schema.safeParse([1, 2]).success).toBe(false);
  });
});
