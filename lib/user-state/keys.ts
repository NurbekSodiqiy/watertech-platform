import { z } from "zod";
import {
  importLegacyDaily,
  importLegacyOnboarding,
  importLegacyScriptsPosition,
  type LegacyReader,
} from "@/lib/user-state/legacy";

/** Every durable per-user key this app stores, in one place: the key string,
 * the zod schema every value is validated against (on the way out of
 * localStorage AND out of the database — see lib/user-state/merge.ts), the
 * default used when there is nothing stored yet or what is stored no longer
 * parses, and where the key's pre-user_state localStorage data is imported
 * from, once.
 *
 * Adding a key needs no migration: `user_state` (supabase/migrations/
 * 0009_user_state.sql) is one row per (user, key) with a jsonb value. The key
 * string must match the table's CHECK — lowercase letters/digits separated by
 * single dots or dashes, at most 64 characters — which `isValidUserStateKey`
 * below mirrors so a bad key fails in a test rather than as a 400 at runtime. */
export interface UserStateKeyDef<T> {
  key: string;
  schema: z.ZodType<T>;
  defaultValue: T;
  /** Reads this key's old localStorage representation, or null when there is
   * none. Only ever called for a key with no cached value and no pending
   * write (hooks/useUserState.ts). */
  importLegacy?: (read: LegacyReader) => unknown | null;
}

/** Mirror of the `user_state_key_format` CHECK constraint in 0009. */
const KEY_FORMAT = /^[a-z0-9]+([.-][a-z0-9]+)*$/;
export const MAX_KEY_LENGTH = 64;

export function isValidUserStateKey(key: string): boolean {
  return key.length <= MAX_KEY_LENGTH && KEY_FORMAT.test(key);
}

/** `YYYY-MM-DD` in the viewer's own timezone — the daily key rolls over at
 * the operator's midnight, not UTC's. Takes the date as an argument because
 * `new Date()` must never run during render (CLAUDE.md section 3); callers
 * pass `useNow()`'s value. */
export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// --- onboarding.v2 -----------------------------------------------------------

export const ONBOARDING_KEY = "onboarding.v2";

/** `{ [onboardingSummaryChecklist item id]: true }`. Unknown ids are kept as
 * stored (an id renamed in lib/content/onboarding.ts simply stops counting —
 * OnboardingChecklist counts over the current items, never over these keys). */
export const onboardingStateSchema = z.record(z.string(), z.boolean());
export type OnboardingState = z.infer<typeof onboardingStateSchema>;

/** Takes the checklist's item ids rather than importing them, so the content
 * file stays out of every bundle that only wants a key definition. They are
 * needed by the oldest storage format alone, which was keyed by the item's
 * index in that same array. */
export function onboardingKeyDef(summaryIds: readonly string[]): UserStateKeyDef<OnboardingState> {
  return {
    key: ONBOARDING_KEY,
    schema: onboardingStateSchema,
    defaultValue: {},
    importLegacy: (read) => importLegacyOnboarding(read, summaryIds),
  };
}

// --- daily.<YYYY-MM-DD> ------------------------------------------------------

export const DAILY_KEY_PREFIX = "daily.";

/** One row per working day: which schedule items are ticked and the call
 * count typed next to each. Counts stay strings — they come straight from a
 * number input, where "" (cleared) and "07" are both states the operator can
 * legitimately be in mid-typing. */
const dailySchema = z.object({
  checked: z.record(z.string(), z.boolean()),
  calls: z.record(z.string(), z.string().max(6)),
});
export type DailyState = z.infer<typeof dailySchema>;

export const DAILY_DEFAULT: DailyState = { checked: {}, calls: {} };

/** From an already-formatted `YYYY-MM-DD`. */
export function dailyKeyForDay(day: string): UserStateKeyDef<DailyState> {
  return {
    key: `${DAILY_KEY_PREFIX}${day}`,
    schema: dailySchema,
    defaultValue: DAILY_DEFAULT,
    importLegacy: (read) => importLegacyDaily(read, day),
  };
}

export function dailyKeyDef(date: Date): UserStateKeyDef<DailyState> {
  return dailyKeyForDay(dateKey(date));
}

// --- scripts.position --------------------------------------------------------

/** Last script/stage the operator had open, restored only when the URL does
 * not already say where to go (components/scripts/ScriptsWorkspace.tsx).
 * `null` means "never opened a script yet". */
const scriptsPositionSchema = z
  .object({ scriptId: z.string().min(1), stageId: z.string().min(1).nullable() })
  .nullable();
export type ScriptsPosition = z.infer<typeof scriptsPositionSchema>;

export const scriptsPositionKey: UserStateKeyDef<ScriptsPosition> = {
  key: "scripts.position",
  schema: scriptsPositionSchema,
  defaultValue: null,
  importLegacy: importLegacyScriptsPosition,
};

// --- pins / recents / changelog.read -----------------------------------------
// pins and recents are read and written by the home page, the command palette
// and PinButton (hooks/usePins.ts, hooks/useRecordRecent.ts); changelog.read is
// still schema-only. None of them has a legacy localStorage counterpart to
// import.

/** The five kinds of content an operator can pin or reopen. */
export const PIN_KINDS = ["script", "objection", "faq", "product", "battleCard"] as const;
export type PinKind = (typeof PIN_KINDS)[number];

/** A reference to one piece of content by its stable id (the same ids
 * telemetry uses) — never by title or URL, both of which change with the
 * locale. Resolved back to a title and a link at render time
 * (lib/search/refs.ts). */
const pinRefSchema = z.object({ kind: z.enum(PIN_KINDS), id: z.string().min(1).max(100) });
export type PinRef = z.infer<typeof pinRefSchema>;

export const MAX_PINS = 24;
export const MAX_RECENTS = 8;

/** Pinned content, newest first. */
const pinsSchema = z.array(pinRefSchema).max(MAX_PINS);
export type PinsState = z.infer<typeof pinsSchema>;

export const pinsKey: UserStateKeyDef<PinsState> = { key: "pins", schema: pinsSchema, defaultValue: [] };

/** Recently opened content, newest first, one entry per item; `at` is epoch
 * milliseconds. Capped so the row stays far below the table's 16 KiB value
 * limit. */
const recentsSchema = z.array(pinRefSchema.extend({ at: z.number().int().nonnegative() })).max(MAX_RECENTS);
export type RecentsState = z.infer<typeof recentsSchema>;

export const recentsKey: UserStateKeyDef<RecentsState> = { key: "recents", schema: recentsSchema, defaultValue: [] };

/** Ids of changelog entries the operator has already seen. */
const changelogReadSchema = z.array(z.string().min(1).max(100)).max(200);
export type ChangelogReadState = z.infer<typeof changelogReadSchema>;

export const changelogReadKey: UserStateKeyDef<ChangelogReadState> = {
  key: "changelog.read",
  schema: changelogReadSchema,
  defaultValue: [],
};

/** Every key this app defines, for tests and for anything that needs to
 * enumerate them. `daily.*` is a family rather than a single key, so it is
 * represented by one sample day. */
export const USER_STATE_KEY_DEFS = [
  onboardingKeyDef([]),
  dailyKeyForDay("2026-01-01"),
  scriptsPositionKey,
  pinsKey,
  recentsKey,
  changelogReadKey,
] as const;
