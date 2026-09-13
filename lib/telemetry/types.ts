export type TelemetryEventType =
  | "page_enter"
  | "page_leave"
  | "script_select"
  | "stage_view"
  | "objection_view"
  | "faq_view"
  | "competitor_view"
  | "package_view"
  | "search"
  | "copy"
  | "call_mode_on"
  | "call_mode_off"
  | "checklist_toggle"
  | "calculator_use"
  | "call_count_log"
  | "feedback"
  | "idle_start"
  | "idle_end";

export interface TelemetryEvent {
  sessionId: string;
  ts: number;
  type: TelemetryEventType;
  path: string;
  entityType?: string;
  entityId?: string;
  durationMs?: number;
  /** e.g. for `search`: { query, resultCount } */
  meta?: Record<string, unknown>;
}
