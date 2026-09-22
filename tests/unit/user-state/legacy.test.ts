import { describe, expect, it } from "vitest";
import {
  importLegacyDaily,
  importLegacyOnboarding,
  importLegacyScriptsPosition,
  isLegacyComponentStorageKey,
  legacyBelongsTo,
  LEGACY_DAILY_CALLCOUNT_PREFIX,
  LEGACY_DAILY_CHECKLIST_PREFIX,
  LEGACY_ONBOARDING_BY_INDEX_KEY,
  LEGACY_ONBOARDING_KEY,
  LEGACY_SCRIPT_KEY,
  LEGACY_STAGE_KEY,
  type LegacyReader,
} from "@/lib/user-state/legacy";
import { dailyKeyForDay, onboardingKeyDef, scriptsPositionKey } from "@/lib/user-state/keys";

/** Stands in for localStorage.getItem — everything not written is missing. */
function reader(store: Record<string, string>): LegacyReader {
  return (key) => store[key] ?? null;
}

const SUMMARY_IDS = ["summary-d1", "summary-d2", "summary-d3", "summary-d4"];

describe("importLegacyOnboarding", () => {
  it("takes the id-keyed value as it stands", () => {
    const read = reader({ [LEGACY_ONBOARDING_KEY]: JSON.stringify({ "summary-d1": true, "summary-d2": false }) });
    expect(importLegacyOnboarding(read, SUMMARY_IDS)).toEqual({ "summary-d1": true, "summary-d2": false });
  });

  it("translates the oldest index-keyed value into item ids", () => {
    const read = reader({ [LEGACY_ONBOARDING_BY_INDEX_KEY]: JSON.stringify({ 0: true, 2: true, 3: false }) });
    expect(importLegacyOnboarding(read, SUMMARY_IDS)).toEqual({ "summary-d1": true, "summary-d3": true });
  });

  it("prefers the newer format when both are present", () => {
    const read = reader({
      [LEGACY_ONBOARDING_KEY]: JSON.stringify({ "summary-d4": true }),
      [LEGACY_ONBOARDING_BY_INDEX_KEY]: JSON.stringify({ 0: true }),
    });
    expect(importLegacyOnboarding(read, SUMMARY_IDS)).toEqual({ "summary-d4": true });
  });

  it("imports nothing when there is nothing, or when it is corrupt", () => {
    expect(importLegacyOnboarding(reader({}), SUMMARY_IDS)).toBeNull();
    expect(importLegacyOnboarding(reader({ [LEGACY_ONBOARDING_KEY]: "{oops" }), SUMMARY_IDS)).toBeNull();
    expect(importLegacyOnboarding(reader({ [LEGACY_ONBOARDING_KEY]: "[1,2]" }), SUMMARY_IDS)).toBeNull();
  });

  it("produces something the key's schema accepts", () => {
    const read = reader({ [LEGACY_ONBOARDING_KEY]: JSON.stringify({ "summary-d1": true }) });
    const def = onboardingKeyDef(SUMMARY_IDS);
    expect(def.schema.safeParse(def.importLegacy?.(read)).success).toBe(true);
  });
});

describe("importLegacyDaily", () => {
  const day = "2026-09-19";

  it("folds the two per-day keys into one value", () => {
    const read = reader({
      [LEGACY_DAILY_CHECKLIST_PREFIX + day]: JSON.stringify({ 1: true }),
      [LEGACY_DAILY_CALLCOUNT_PREFIX + day]: JSON.stringify({ 1: "12" }),
    });
    expect(importLegacyDaily(read, day)).toEqual({ checked: { 1: true }, calls: { 1: "12" } });
  });

  it("fills in the missing half", () => {
    const read = reader({ [LEGACY_DAILY_CHECKLIST_PREFIX + day]: JSON.stringify({ 2: true }) });
    expect(importLegacyDaily(read, day)).toEqual({ checked: { 2: true }, calls: {} });
  });

  it("ignores another day's keys", () => {
    const read = reader({ [LEGACY_DAILY_CHECKLIST_PREFIX + "2026-09-18"]: JSON.stringify({ 1: true }) });
    expect(importLegacyDaily(read, day)).toBeNull();
  });

  it("produces something the key's schema accepts", () => {
    const read = reader({
      [LEGACY_DAILY_CHECKLIST_PREFIX + day]: JSON.stringify({ 1: true }),
      [LEGACY_DAILY_CALLCOUNT_PREFIX + day]: JSON.stringify({ 1: "12" }),
    });
    const def = dailyKeyForDay(day);
    expect(def.schema.safeParse(def.importLegacy?.(read)).success).toBe(true);
  });
});

describe("importLegacyScriptsPosition", () => {
  it("pairs the two plain strings", () => {
    const read = reader({ [LEGACY_SCRIPT_KEY]: "lead-orqali-tushgan", [LEGACY_STAGE_KEY]: "stage-2" });
    expect(importLegacyScriptsPosition(read)).toEqual({ scriptId: "lead-orqali-tushgan", stageId: "stage-2" });
  });

  it("keeps a script with no saved stage", () => {
    const read = reader({ [LEGACY_SCRIPT_KEY]: "lead-orqali-tushgan" });
    expect(importLegacyScriptsPosition(read)).toEqual({ scriptId: "lead-orqali-tushgan", stageId: null });
  });

  it("imports nothing from a stage with no script — the stage id alone means nothing", () => {
    expect(importLegacyScriptsPosition(reader({ [LEGACY_STAGE_KEY]: "stage-2" }))).toBeNull();
  });

  it("produces something the key's schema accepts", () => {
    const read = reader({ [LEGACY_SCRIPT_KEY]: "lead-orqali-tushgan", [LEGACY_STAGE_KEY]: "stage-2" });
    expect(scriptsPositionKey.schema.safeParse(scriptsPositionKey.importLegacy?.(read)).success).toBe(true);
  });
});

describe("legacyBelongsTo", () => {
  const OWNER = "0123456789abcdef";

  it("adopts only when the marker is exactly this owner", () => {
    expect(legacyBelongsTo(OWNER, OWNER)).toBe(true);
  });

  it("refuses another operator's marker", () => {
    expect(legacyBelongsTo("fedcba9876543210", OWNER)).toBe(false);
  });

  it("refuses an absent marker — the upgrade case, where nothing proves whose the data is", () => {
    expect(legacyBelongsTo(null, OWNER)).toBe(false);
    expect(legacyBelongsTo(undefined, OWNER)).toBe(false);
    expect(legacyBelongsTo("", OWNER)).toBe(false);
  });
});

describe("isLegacyComponentStorageKey", () => {
  it("covers every pre-user_state key the migrated components wrote", () => {
    expect(isLegacyComponentStorageKey(LEGACY_ONBOARDING_KEY)).toBe(true);
    expect(isLegacyComponentStorageKey(LEGACY_ONBOARDING_BY_INDEX_KEY)).toBe(true);
    expect(isLegacyComponentStorageKey(LEGACY_SCRIPT_KEY)).toBe(true);
    expect(isLegacyComponentStorageKey(LEGACY_STAGE_KEY)).toBe(true);
    expect(isLegacyComponentStorageKey(`${LEGACY_DAILY_CHECKLIST_PREFIX}2026-09-22`)).toBe(true);
    expect(isLegacyComponentStorageKey(`${LEGACY_DAILY_CALLCOUNT_PREFIX}2026-09-22`)).toBe(true);
  });

  it("leaves unrelated keys alone", () => {
    expect(isLegacyComponentStorageKey("watertech-theme")).toBe(false);
    expect(isLegacyComponentStorageKey("wt-session-id")).toBe(false);
    // A bare prefix with no day is not a row of anyone's.
    expect(isLegacyComponentStorageKey(LEGACY_DAILY_CHECKLIST_PREFIX)).toBe(false);
  });
});
