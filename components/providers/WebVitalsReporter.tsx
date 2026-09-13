"use client";

import { useReportWebVitals } from "next/web-vitals";
import { track } from "@/lib/telemetry/client";

const TRACKED_METRICS = new Set(["LCP", "CLS", "INP", "FCP", "TTFB"]);

/** Reports Core Web Vitals through the same telemetry pipeline as every
 * other event — mounted once in app/layout.tsx, as a sibling of
 * TelemetryProvider (not inside AppShell, which is design-locked). */
export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (!TRACKED_METRICS.has(metric.name)) return;
    track({
      type: "web_vital",
      path: window.location.pathname,
      meta: {
        name: metric.name,
        value: Math.round(metric.value * 1000) / 1000,
        rating: metric.rating,
      },
    });
  });

  return null;
}
