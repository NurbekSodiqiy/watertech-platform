"use client";

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import type { z } from "zod";
import { useOnline } from "@/hooks/useOnline";
import type { UserStateKeyDef } from "@/lib/user-state/keys";
import {
  ensure,
  flush,
  getEntry,
  getServerEntry,
  installGlobalListeners,
  setValue as storeSetValue,
  subscribe,
  type UserStateStatus,
} from "@/lib/user-state/store";

export type { UserStateStatus };

/** Durable per-user state, the same value on every device: one row per
 * (user, key) in `user_state`, read and written straight from the browser
 * under RLS (see lib/user-state/store.ts for why there is no route handler).
 *
 * What a component sees, in order: the default on the server and the first
 * client paint, the localStorage cache as soon as the mount effect runs, then
 * the server's row if it turns out to be newer. Writes are optimistic —
 * in memory immediately, debounced to storage and to the database, flushed
 * when the tab is hidden or closed, and queued for the next `online` event if
 * they fail. Every value is validated against `schema` wherever it came from;
 * anything that does not parse falls back to `defaultValue`.
 *
 * `key` may be null for a key that is not known yet — the daily one is
 * derived from `useNow()`, which is null until mount because `new Date()`
 * must not run during render (CLAUDE.md section 3). The hook then just
 * reports the default, `status: "loading"`, and a no-op setter.
 *
 * `rest` is the remainder of the key's definition from lib/user-state/keys.ts;
 * pass the definition object itself. It is read once, when the key is first
 * hydrated. */
export function useUserState<T>(
  key: string | null,
  schema: z.ZodType<T>,
  defaultValue: T,
  rest?: Pick<UserStateKeyDef<T>, "importLegacy">
): [T, (next: T | ((prev: T) => T)) => void, UserStateStatus] {
  // The definition the store works with. Kept in a ref as well so the setter
  // and the hydration effect never re-run just because the caller rebuilt an
  // options object inline.
  const def = useMemo<UserStateKeyDef<T>>(
    () => ({ key: key ?? "", schema, defaultValue, importLegacy: rest?.importLegacy }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- schema/default/importLegacy come from a module-level key definition and never change for a given key
    [key]
  );
  const defRef = useRef(def);
  defRef.current = def;

  const entry = useSyncExternalStore(
    useCallback((onChange: () => void) => (key ? subscribe(key, onChange) : () => {}), [key]),
    useCallback(() => (key ? getEntry(key) : getServerEntry()), [key]),
    getServerEntry
  );

  useEffect(() => {
    if (!key) return;
    installGlobalListeners();
    ensure(defRef.current);
  }, [key]);

  // Retry whatever is still queued as soon as the browser is back online.
  const online = useOnline();
  useEffect(() => {
    if (online) flush();
  }, [online]);

  const value = useMemo(() => {
    if (!entry.hasLocal || entry.value === undefined) return defaultValue;
    const parsed = schema.safeParse(entry.value);
    return parsed.success ? parsed.data : defaultValue;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see the memo above: schema and defaultValue are fixed per key
  }, [entry]);

  const valueRef = useRef(value);
  valueRef.current = value;

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      if (!key) return;
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(valueRef.current) : next;
      storeSetValue(defRef.current, resolved);
    },
    [key]
  );

  return [value, setValue, key ? entry.status : "loading"];
}
