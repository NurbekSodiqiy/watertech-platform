import { DAILY_KEY_PREFIX } from "@/lib/user-state/keys";

/** How many days of `daily.<YYYY-MM-DD>` rows are kept, counting today. Two
 * working weeks is enough for "what did I do last week" and keeps the table
 * at a couple of dozen small rows per operator. */
export const DAILY_KEEP_DAYS = 14;

/** The oldest day still kept, as `YYYY-MM-DD`. Day arithmetic goes through
 * UTC so it cannot be shifted by a DST boundary in the viewer's timezone —
 * the strings themselves are plain calendar dates either way. */
export function dailyCutoffDay(todayDay: string, keepDays: number = DAILY_KEEP_DAYS): string {
  const ms = Date.parse(`${todayDay}T00:00:00Z`);
  if (Number.isNaN(ms)) return todayDay;
  const cutoff = new Date(ms - (keepDays - 1) * 86_400_000);
  return cutoff.toISOString().slice(0, 10);
}

/** The `daily.` key that marks the start of the kept window. Keys sort
 * lexicographically in date order, so the server-side prune is one range
 * delete (`key < cutoff`) rather than a list of ids. */
export function dailyCutoffKey(todayDay: string, keepDays: number = DAILY_KEEP_DAYS): string {
  return `${DAILY_KEY_PREFIX}${dailyCutoffDay(todayDay, keepDays)}`;
}

/** Which of the given user-state keys are daily rows outside the kept window.
 * Non-daily keys and malformed daily keys are never pruned. */
export function staleDailyKeys(keys: readonly string[], todayDay: string, keepDays: number = DAILY_KEEP_DAYS): string[] {
  const cutoff = dailyCutoffKey(todayDay, keepDays);
  return keys.filter((key) => {
    if (!key.startsWith(DAILY_KEY_PREFIX)) return false;
    const day = key.slice(DAILY_KEY_PREFIX.length);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
    return key < cutoff;
  });
}
