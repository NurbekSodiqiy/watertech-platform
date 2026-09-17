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
] as const;

export type TelemetryEventType = (typeof TELEMETRY_EVENT_TYPES)[number];

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
   * (telemetry is visible on the dashboard; questions live in copilot_logs). */
  meta?: Record<string, unknown>;
}
