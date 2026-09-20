"use client";

import { useEffect, useMemo } from "react";
import { useContentRefs } from "@/hooks/useContentRefs";
import { refKey, type ContentRef } from "@/lib/search/refs";
import type { PinRef } from "@/lib/user-state/keys";
import { pruneRefs } from "@/lib/user-state/pins";

/** Resolves stored refs to titles and links, and prunes the ones whose
 * content no longer exists out of the stored list — silently, as the ids of
 * deleted content are of no use to anyone. Nothing is fetched while there is
 * nothing to resolve, and nothing is pruned before the list itself has
 * hydrated (`ready`) or unless the content index actually loaded. */
export function useResolvedRefs<T extends PinRef>(
  refs: T[],
  setRefs: (next: T[]) => void,
  ready: boolean
): { items: { ref: T; content: ContentRef }[]; pending: boolean; failed: boolean } {
  const { index, failed } = useContentRefs(ready && refs.length > 0);

  useEffect(() => {
    if (!ready || !index) return;
    const next = pruneRefs(refs, (ref) => index.byKey.has(refKey(ref)), index.loadedKinds);
    if (next !== refs) setRefs(next);
  }, [ready, index, refs, setRefs]);

  const items = useMemo(
    () =>
      index
        ? refs.flatMap((ref) => {
            const content = index.byKey.get(refKey(ref));
            return content ? [{ ref, content }] : [];
          })
        : [],
    [index, refs]
  );

  return { items, pending: ready && refs.length > 0 && !index && !failed, failed };
}
