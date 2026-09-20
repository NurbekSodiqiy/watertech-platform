import { MAX_PINS, MAX_RECENTS, type PinKind, type PinRef, type PinsState, type RecentsState } from "@/lib/user-state/keys";

export function sameRef(a: PinRef, b: PinRef): boolean {
  return a.kind === b.kind && a.id === b.id;
}

export function isPinned(pins: PinsState, ref: PinRef): boolean {
  return pins.some((pin) => sameRef(pin, ref));
}

/** Unpins when already pinned; otherwise pins at the front. A full list
 * (MAX_PINS) drops its oldest pin rather than refusing the new one — the
 * operator just asked for this one. */
export function togglePin(pins: PinsState, ref: PinRef): PinsState {
  if (isPinned(pins, ref)) return pins.filter((pin) => !sameRef(pin, ref));
  return [{ kind: ref.kind, id: ref.id }, ...pins].slice(0, MAX_PINS);
}

/** Moves `ref` to the front with a fresh timestamp, one entry per item.
 * Returns the same array when `ref` is already the newest entry, so opening
 * the item that is already on top does not write (and re-sync) the row. */
export function recordRecent(recents: RecentsState, ref: PinRef, at: number): RecentsState {
  if (recents[0] && sameRef(recents[0], ref)) return recents;
  return [{ kind: ref.kind, id: ref.id, at }, ...recents.filter((r) => !sameRef(r, ref))].slice(0, MAX_RECENTS);
}

/** Drops refs the caller could not resolve, but only for kinds it actually
 * has content for. A kind with nothing resolved at all is ambiguous — every
 * item of it deleted, or its content failed to load (the loaders degrade to
 * an empty list on a Supabase outage) — and pruning on an outage would wipe
 * someone's favourites. Returns the same array when nothing is dropped. */
export function pruneRefs<T extends PinRef>(
  refs: T[],
  isKnown: (ref: PinRef) => boolean,
  loadedKinds: ReadonlySet<PinKind>
): T[] {
  const kept = refs.filter((ref) => !loadedKinds.has(ref.kind) || isKnown(ref));
  return kept.length === refs.length ? refs : kept;
}
