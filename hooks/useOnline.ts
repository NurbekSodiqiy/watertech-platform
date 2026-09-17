"use client";

import { useEffect, useState } from "react";
import { useMounted } from "@/hooks/useMounted";

/** navigator.onLine, corrected after mount — SSR/static-prerender ships
 * `true` (same rule as everywhere else in CLAUDE.md #3: never read `window`/
 * `navigator` during render), then syncs in an effect and stays current via
 * the online/offline events, same pattern components/providers/OfflineBanner.tsx
 * already uses. */
export function useOnline(): boolean {
  const mounted = useMounted();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return !mounted || online;
}
