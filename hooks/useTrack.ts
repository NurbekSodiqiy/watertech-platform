"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/telemetry/client";
import type { TelemetryEventType } from "@/lib/telemetry/types";

/** Convenience hook for firing telemetry events from inside a component —
 * fills in `path` from the current route so call sites only need to pass
 * what's specific to the event. */
export function useTrack() {
  const pathname = usePathname();

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
