"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/telemetry/client";

/** Tracks page_enter/page_leave purely off route changes — no visible UI,
 * mounted once near the top of AppShell so it sees every navigation. */
export function TelemetryProvider() {
  const pathname = usePathname();
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
