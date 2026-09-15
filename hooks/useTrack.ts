"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/telemetry/client";
import type { TelemetryEventType } from "@/lib/telemetry/types";
import { stripLocalePrefix } from "@/lib/i18n/strip-locale";

/** Convenience hook for firing telemetry events from inside a component —
 * fills in `path` from the current route so call sites only need to pass
 * what's specific to the event. Uses next/navigation's raw usePathname (not
 * next-intl's) and strips the locale prefix itself, so `path` values stay
 * locale-less for dashboard aggregation. */
export function useTrack() {
  const pathname = stripLocalePrefix(usePathname());

  return useCallback(
    (
      type: TelemetryEventType,
      opts?: { entityType?: string; entityId?: string; durationMs?: number; meta?: Record<string, unknown> }
    ) => {
      track({ type, path: pathname, ...opts });
    },
    [pathname]
  );
}
