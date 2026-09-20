import { CHANGELOG_READ_MAX } from "@/lib/user-state/keys";

// Pure helpers over the `changelog.read` value (an array of entry ids). No
// React, no Supabase: the operator hook, the manager query and the unit tests
// all use these, so "unread" means the same thing everywhere.

/** Published entry ids the operator has not read yet, in the order given. */
export function unreadIds(publishedIds: readonly string[], read: readonly string[]): string[] {
  const seen = new Set(read);
  return publishedIds.filter((id) => !seen.has(id));
}

/** `read` with `add` marked as read, appended in order. Deduplicated, and never
 * longer than CHANGELOG_READ_MAX — a longer array would fail the key's schema
 * and be thrown away as invalid — so when it overflows the oldest marks are
 * dropped (those are the entries an operator is least likely to still care
 * about; a dropped one merely shows as unread again). Returns `read` itself
 * when nothing changed, so a repeated mark does not trigger a write. */
export function withRead(read: string[], add: readonly string[]): string[] {
  const seen = new Set(read);
  const fresh = add.filter((id, i) => !seen.has(id) && add.indexOf(id) === i);
  if (fresh.length === 0) return read;
  return [...read, ...fresh].slice(-CHANGELOG_READ_MAX);
}

export interface ChangelogReadCounts {
  /** Operators on the allow-list. */
  total: number;
  /** Per entry id: how many of those operators have it marked as read. */
  readBy: ReadonlyMap<string, number>;
}

/** Counts, per entry, the allow-listed operators who read it. `states` is
 * every `changelog.read` row visible to the manager; a row from someone who is
 * not an operator (a manager's own marks, a removed user) is ignored so the
 * count can never exceed `total`. Values are written by browsers, so each one
 * is validated by `parse` (the key's zod schema) and a bad one counts as
 * "read nothing". */
export function aggregateChangelogReads(
  operators: readonly string[],
  states: readonly { user_email: string; value: unknown }[],
  parse: (value: unknown) => string[] | null
): ChangelogReadCounts {
  const operatorSet = new Set(operators);
  const readBy = new Map<string, number>();
  const counted = new Set<string>();

  for (const state of states) {
    if (!operatorSet.has(state.user_email) || counted.has(state.user_email)) continue;
    counted.add(state.user_email);
    for (const id of new Set(parse(state.value) ?? [])) readBy.set(id, (readBy.get(id) ?? 0) + 1);
  }

  return { total: operatorSet.size, readBy };
}
