"use client";

import { useEffect, useRef } from "react";
import { useUserState } from "@/hooks/useUserState";
import { recentsKey, type PinKind } from "@/lib/user-state/keys";
import { recordRecent } from "@/lib/user-state/pins";

/** Records that one piece of content was opened, for the home page's Recents
 * and the command palette's. Call it with the entity the page is showing *now*
 * — a selected script, an expanded FAQ answer, an open lightbox — and with
 * null while nothing is open, never from a list that merely renders rows.
 * Fires once per change of entity, not per render; the time is taken inside
 * the effect because `Date.now()` must not run during render. */
export function useRecordRecent(target: { kind: PinKind; id: string } | null): void {
  const [recents, setRecents, status] = useUserState(
    recentsKey.key,
    recentsKey.schema,
    recentsKey.defaultValue,
    recentsKey
  );
  const recentsRef = useRef(recents);
  recentsRef.current = recents;

  const kind = target?.kind;
  const id = target?.id;

  useEffect(() => {
    // Before the stored list has hydrated, `recents` is the empty default and
    // writing it would overwrite the real one.
    if (!kind || !id || status === "loading") return;
    const next = recordRecent(recentsRef.current, { kind, id }, Date.now());
    if (next !== recentsRef.current) setRecents(next);
  }, [kind, id, status, setRecents]);
}
