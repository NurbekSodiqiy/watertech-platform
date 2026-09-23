"use client";

import { useRouter } from "@/i18n/routing";
import { WidgetFallback } from "@/components/ui/WidgetFallback";

/** A dashboard widget whose data could not be loaded (`{ ok: false }` from
 * lib/dashboard/telemetry-window.ts) — the same card a crashed widget shows.
 * Retry is router.refresh(), which re-renders the route's server components and
 * so re-runs the database calls; a link to the same URL could be answered from
 * the client router cache instead. */
export function DashboardWidgetError() {
  const router = useRouter();
  return <WidgetFallback reset={() => router.refresh()} />;
}
