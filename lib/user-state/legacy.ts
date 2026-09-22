/** One-time import of the localStorage keys the four migrated components used
 * before user_state existed. It runs for a key only when that key has no
 * cached value and no pending write yet, so it cannot re-import over newer
 * data; what it produces is then merged like any other local value, with an
 * unknown age, so a server row always wins (see lib/user-state/merge.ts).
 *
 * None of these keys names the account that wrote it, and neither did the
 * first generation of `wt-us:` cache keys — on a shared office PC that makes
 * every one of them unattributable. `wt-us-owner` is the only evidence
 * there is: the store writes it whenever it adopts an owner, so a marker
 * equal to the current owner id means the un-namespaced data is this
 * operator's own. Anything else, including the upgrade case where there is
 * no marker at all, means the data is deleted unread — never imported and
 * never uploaded, because an upload would file another operator's pins and
 * progress under this account (see `legacyBelongsTo`).
 *
 * Every importer takes the reader as an argument instead of touching
 * localStorage directly — that is what makes them testable, and it keeps a
 * browser API out of a module that pages import transitively. */
export type LegacyReader = (key: string) => string | null;

/** Names the owner of every un-namespaced entry in this browser. Written by
 * lib/user-state/store.ts on each owner change, read here. */
export const LEGACY_OWNER_MARKER_KEY = "wt-us-owner";

/** Whether the un-namespaced entries may be read at all. An absent marker is
 * not a match: nothing proves who wrote them, so they are treated as another
 * operator's and dropped. */
export function legacyBelongsTo(marker: string | null | undefined, ownerId: string): boolean {
  return !!marker && marker === ownerId;
}

export const LEGACY_ONBOARDING_KEY = "onboarding_checklist_v2";
export const LEGACY_ONBOARDING_BY_INDEX_KEY = "onboarding_checklist";
export const LEGACY_DAILY_CHECKLIST_PREFIX = "watertech-daily-checklist-";
export const LEGACY_DAILY_CALLCOUNT_PREFIX = "watertech-daily-callcount-";
export const LEGACY_SCRIPT_KEY = "watertech-scripts-last-script";
export const LEGACY_STAGE_KEY = "watertech-scripts-last-stage";

function readJson(read: LegacyReader, key: string): unknown {
  const raw = read(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** `onboarding_checklist_v2` is already `{ [itemId]: boolean }`. The older
 * `onboarding_checklist` was keyed by the item's index in
 * `onboardingSummaryChecklist`, which OnboardingChecklist itself used to
 * translate on mount — that translation lives here now, so the component no
 * longer carries two generations of storage format. */
export function importLegacyOnboarding(read: LegacyReader, summaryIds: readonly string[]): unknown | null {
  const byId = readJson(read, LEGACY_ONBOARDING_KEY);
  if (isRecord(byId)) return byId;

  const byIndex = readJson(read, LEGACY_ONBOARDING_BY_INDEX_KEY);
  if (!isRecord(byIndex)) return null;

  const migrated: Record<string, boolean> = {};
  summaryIds.forEach((id, index) => {
    if (byIndex[index] === true) migrated[id] = true;
  });
  return migrated;
}

/** The two per-day keys DailyTimeline and CallModeOverlay shared, folded into
 * one `{ checked, calls }` value. Either half may be missing. */
export function importLegacyDaily(read: LegacyReader, day: string): unknown | null {
  const checked = readJson(read, LEGACY_DAILY_CHECKLIST_PREFIX + day);
  const calls = readJson(read, LEGACY_DAILY_CALLCOUNT_PREFIX + day);
  if (!isRecord(checked) && !isRecord(calls)) return null;
  return { checked: isRecord(checked) ? checked : {}, calls: isRecord(calls) ? calls : {} };
}

/** Two plain strings before, one object now. A saved stage with no saved
 * script is meaningless (the stage id only resolves inside a script), so it
 * imports as nothing. */
export function importLegacyScriptsPosition(read: LegacyReader): unknown | null {
  const scriptId = read(LEGACY_SCRIPT_KEY);
  if (!scriptId) return null;
  return { scriptId, stageId: read(LEGACY_STAGE_KEY) || null };
}

const LEGACY_DAILY_PREFIXES = [LEGACY_DAILY_CHECKLIST_PREFIX, LEGACY_DAILY_CALLCOUNT_PREFIX];
const LEGACY_EXACT_KEYS = [
  LEGACY_ONBOARDING_KEY,
  LEGACY_ONBOARDING_BY_INDEX_KEY,
  LEGACY_SCRIPT_KEY,
  LEGACY_STAGE_KEY,
];

/** True for one of the pre-user_state component keys — the exact four above
 * and the two per-day families, whose suffix is the day the row belongs to.
 * Used to sweep them out when the marker says they are not this operator's
 * (lib/user-state/owner.ts). */
export function isLegacyComponentStorageKey(storageKey: string): boolean {
  if (LEGACY_EXACT_KEYS.includes(storageKey)) return true;
  return LEGACY_DAILY_PREFIXES.some((prefix) => storageKey.startsWith(prefix) && storageKey.length > prefix.length);
}
