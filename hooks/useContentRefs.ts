"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { PIN_KINDS, type PinKind } from "@/lib/user-state/keys";
import { refKey, type ContentRef } from "@/lib/search/refs";

export interface ContentRefIndex {
  byKey: ReadonlyMap<string, ContentRef>;
  /** Kinds the index has at least one entry for — the only kinds it is safe
   * to prune unknown ids from (see pruneRefs in lib/user-state/pins.ts). */
  loadedKinds: ReadonlySet<PinKind>;
}

// One fetch per locale for the whole session, shared by every consumer (the
// home islands and the command palette). A failed fetch is forgotten so the
// next consumer to mount retries.
const cache = new Map<string, Promise<ContentRefIndex>>();

function load(locale: string): Promise<ContentRefIndex> {
  const cached = cache.get(locale);
  if (cached) return cached;
  const request = fetch(`/api/content-refs?locale=${locale}`)
    .then((res) => (res.ok ? (res.json() as Promise<ContentRef[]>) : Promise.reject(new Error(String(res.status)))))
    .then((refs): ContentRefIndex => {
      const loadedKinds = new Set<PinKind>();
      for (const kind of PIN_KINDS) if (refs.some((ref) => ref.kind === kind)) loadedKinds.add(kind);
      return { byKey: new Map(refs.map((ref) => [refKey(ref), ref])), loadedKinds };
    });
  request.catch(() => cache.delete(locale));
  cache.set(locale, request);
  return request;
}

/** Lookup map from a stored PinRef to its title and link, loaded lazily from
 * /api/content-refs. `index` is null until it arrives (or if it never does);
 * `enabled` lets the palette hold the fetch until it is first opened. */
export function useContentRefs(enabled = true): { index: ContentRefIndex | null; failed: boolean } {
  const locale = useLocale();
  const [state, setState] = useState<{ locale: string; index: ContentRefIndex | null; failed: boolean } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    load(locale).then(
      (index) => !cancelled && setState({ locale, index, failed: false }),
      () => !cancelled && setState({ locale, index: null, failed: true })
    );
    return () => {
      cancelled = true;
    };
  }, [enabled, locale]);

  // A result for another locale (the operator switched language mid-session)
  // is not this locale's index — titles would be in the wrong language.
  if (!state || state.locale !== locale) return { index: null, failed: false };
  return { index: state.index, failed: state.failed };
}
