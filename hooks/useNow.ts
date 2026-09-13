"use client";

import { useEffect, useState } from "react";

/** `null` on the server and on first client render (avoids a hydration
 * mismatch from `new Date()` differing between server and browser); set to
 * the real clock in an effect. Pass `intervalMs` to keep it refreshed on a
 * timer. */
export function useNow(intervalMs?: number): Date | null {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    if (!intervalMs) return;
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
