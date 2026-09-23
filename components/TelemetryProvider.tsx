"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/telemetry/client";
import { stripLocalePrefix } from "@/lib/i18n/strip-locale";

/** Tracks page_enter/page_leave purely off route changes — no visible UI.
 * Mounted once in app/[locale]/layout.tsx, as a sibling of AppShell (not
 * inside it — AppShell.tsx is design-locked, CLAUDE.md §6), so it still sees
 * every navigation across the whole app. Uses next/navigation's raw
 * usePathname (not next-intl's) and strips the locale prefix itself, so
 * `path` values stay locale-less for dashboard aggregation. */
export function TelemetryProvider() {
  const pathname = stripLocalePrefix(usePathname());
  const prevPath = useRef<string | null>(null);
  const enteredAt = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    if (prevPath.current && prevPath.current !== pathname) {
      track({ type: "page_leave", path: prevPath.current, durationMs: now - enteredAt.current });
    }
    track({ type: "page_enter", path: pathname });
    prevPath.current = pathname;
    enteredAt.current = now;
  }, [pathname]);

  useEffect(() => {
    function onPageHide() {
      if (prevPath.current) {
        track({ type: "page_leave", path: prevPath.current, durationMs: Date.now() - enteredAt.current });
      }
    }
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  return null;
}
