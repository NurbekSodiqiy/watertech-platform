export const TELEMETRY_EVENT_TYPES = [
  "page_enter",
  "page_leave",
  "script_select",
  "stage_view",
  "objection_view",
  "faq_view",
  "competitor_view",
  "package_view",
  "search",
  "copy",
  "call_mode_on",
  "call_mode_off",
  "checklist_toggle",
  "calculator_use",
  "call_count_log",
  "feedback",
  "idle_start",
  "idle_end",
  "web_vital",
  "copilot_ask",
  "pin_toggle",
] as const;

export type TelemetryEventType = (typeof TELEMETRY_EVENT_TYPES)[number];

/** `entityType` of a content item, as the view events send it (script_select →
 * "script", stage_view → "stage", objection_view → "objection", faq_view →
 * "faq", competitor_view → "competitor", package_view → "package"). A `copy`
 * of the same item sends the same entityType/entityId pair, which is how
 * admin_top_content (0021) files copies under the item's views. "contact" has
 * no view event: its copies count per person but in no content ranking. */
export type ContentEntityType = "script" | "stage" | "objection" | "faq" | "competitor" | "package" | "contact";

export interface TelemetryEvent {
  sessionId: string;
  ts: number;
  type: TelemetryEventType;
  path: string;
  entityType?: string;
  entityId?: string;
  durationMs?: number;
  /** e.g. for `search`: { query, resultCount }
   * for `web_vital`: { name: "LCP"|"CLS"|"INP"|"FCP"|"TTFB", value: number, rating: "good"|"needs-improvement"|"poor" }
   * for `copilot_ask`: { hits: number, chars: number } — counts only, never the question text
   * (telemetry is visible on the dashboard; questions live in copilot_logs).
   * for `pin_toggle`: { pinned: boolean } — the state after the toggle; entityType is the pin kind
   * ("script"|"objection"|"faq"|"product"|"battleCard"), entityId the content id.
   * for `checklist_toggle`: entityId is the onboarding item's stable id (lib/content/onboarding.ts) —
   * before the "onboarding_checklist_v2" migration (components/OnboardingChecklist.tsx) it was the array index. */
  meta?: Record<string, unknown>;
}
