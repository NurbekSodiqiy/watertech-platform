import type { z } from "zod";

/** A value plus the moment it was last changed. `updatedAt` is an ISO string
 * produced on the device that made the change (the database column has the
 * same meaning — see supabase/migrations/0009_user_state.sql) and is the only
 * conflict resolver: newest wins. */
export interface StoredValue<T> {
  value: T;
  updatedAt: string;
}

/** `updatedAt` for a value that exists locally but whose age is unknown —
 * everything imported from the old localStorage keys (lib/user-state/legacy.ts).
 * Sorts before every real timestamp, so a server row always wins over it, and
 * it is restamped with the current time if it is adopted (see `mergeUserState`). */
export const UNKNOWN_UPDATED_AT = "";

export type MergeWinner = "default" | "local" | "remote";

export interface MergeResult<T> {
  value: T;
  updatedAt: string;
  winner: MergeWinner;
  /** The local value is the newer one and the server does not have it yet. */
  needsUpload: boolean;
}

/** Decides what a key's value actually is once the localStorage cache and the
 * server row are both known.
 *
 * - nothing anywhere -> the default, nothing to upload;
 * - only one side -> that side; if it is the local one it still has to reach
 *   the server, and an unknown-age local value (a legacy import) is restamped
 *   with `nowIso` so it gets a real timestamp to be compared against later;
 * - both -> the newer `updatedAt` wins. A tie goes to the server, which is
 *   the canonical copy and saves a pointless write. */
export function mergeUserState<T>(
  local: StoredValue<T> | null,
  remote: StoredValue<T> | null,
  defaultValue: T,
  nowIso: string
): MergeResult<T> {
  if (!local && !remote) return { value: defaultValue, updatedAt: UNKNOWN_UPDATED_AT, winner: "default", needsUpload: false };
  if (!local && remote) return { value: remote.value, updatedAt: remote.updatedAt, winner: "remote", needsUpload: false };
  if (local && !remote) {
    const updatedAt = local.updatedAt === UNKNOWN_UPDATED_AT ? nowIso : local.updatedAt;
    return { value: local.value, updatedAt, winner: "local", needsUpload: true };
  }

  const l = local as StoredValue<T>;
  const r = remote as StoredValue<T>;
  if (l.updatedAt > r.updatedAt) return { value: l.value, updatedAt: l.updatedAt, winner: "local", needsUpload: true };
  return { value: r.value, updatedAt: r.updatedAt, winner: "remote", needsUpload: false };
}

/** Validates one side of a merge. Anything that does not match the key's
 * schema — a value written by an older build, a half-written localStorage
 * entry, a row edited by hand — is treated as absent, so the merge falls back
 * to the other side or to the default instead of handing invalid data to a
 * component. */
export function parseStoredValue<T>(
  raw: { value: unknown; updatedAt: unknown } | null | undefined,
  schema: z.ZodType<T>
): StoredValue<T> | null {
  if (!raw) return null;
  const parsed = schema.safeParse(raw.value);
  if (!parsed.success) return null;
  return { value: parsed.data, updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : UNKNOWN_UPDATED_AT };
}

/** The localStorage cache entry shape, kept short because it is written on
 * every debounced change: `v` = value, `t` = updatedAt. */
interface CacheEnvelope {
  v: unknown;
  t?: unknown;
}

export function serializeCacheEntry<T>(entry: StoredValue<T>): string {
  return JSON.stringify({ v: entry.value, t: entry.updatedAt } satisfies CacheEnvelope);
}

/** Parses + validates a localStorage cache entry. Returns null for missing,
 * corrupt, or schema-violating content — never throws. */
export function parseCacheEntry<T>(raw: string | null, schema: z.ZodType<T>): StoredValue<T> | null {
  if (!raw) return null;
  let envelope: CacheEnvelope;
  try {
    envelope = JSON.parse(raw) as CacheEnvelope;
  } catch {
    return null;
  }
  if (!envelope || typeof envelope !== "object") return null;
  return parseStoredValue({ value: envelope.v, updatedAt: envelope.t }, schema);
}
