import { z } from "zod";
import { siteTree } from "@/lib/site-config";
import { resolveEntityLabel, type EntityLabelMaps } from "@/lib/telemetry/aggregate";
import type { TelemetryEventType } from "@/lib/telemetry/types";
import type { PersonEvent } from "@/lib/admin/people";

// What the person page (/admin/users/[email], R3/S04) does with the rows of the
// 0021 functions before drawing them: which app section a path segment is, and
// what each timeline event says. Pure, so tests/unit/admin/person-page.test.ts
// pins it; the page only formats and renders.

// --- Sections -----------------------------------------------------------------------------

export type SectionLabel =
  | { kind: "home" }
  /** A top-level entry of siteTree; `titleKey` is its `nav` message key. */
  | { kind: "nav"; titleKey: string }
  /** A segment the site tree does not know (a route added since, /login, /offline). */
  | { kind: "raw"; section: string };

/** admin_person_sections (0021) groups page time by the first path segment,
 * with '/' as "home". The label comes from lib/site-config.ts, so a section
 * renamed there is renamed here; an unknown segment is shown as it is. */
export function resolveSection(section: string): SectionLabel {
  if (section === "home") return { kind: "home" };
  const node = siteTree.find((entry) => entry.path === `/${section}`);
  return node ? { kind: "nav", titleKey: node.title } : { kind: "raw", section };
}

// --- The timeline ----------------------------------------------------------------------------

/** The event types admin_person_recent_events can return that have a sentence
 * of their own (it leaves out web_vital, idle_start, idle_end and page_leave).
 * Anything else — an old row of a type this release no longer sends — is
 * "events.unknown". tests/unit/admin/person-page.test.ts checks every entry has
 * its message in both locales. */
export const TIMELINE_EVENT_TYPES = [
  "page_enter",
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
  "copilot_ask",
  "pin_toggle",
] as const satisfies readonly TelemetryEventType[];
export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

/** Message keys under `pages.admin.people.events` that are not an event type
 * themselves: the unknown-type fallback and the two variants of a type whose
 * sentence differs by its data. */
export const TIMELINE_EXTRA_MESSAGES = ["unknown", "searchNoResults", "copyPlain"] as const;

function isTimelineEventType(type: string): type is TimelineEventType {
  return TIMELINE_EVENT_TYPES.some((known) => known === type);
}

/** Every meta key a sentence reads. Each is validated on its own, so a
 * malformed one costs that key, not the sentence; unknown keys are stripped.
 * (meta is client-sent JSON, ≤ 600 bytes — lib/telemetry/schema.ts.) */
const eventMetaSchema = z.object({
  query: z.string().max(200).optional().catch(undefined),
  resultCount: z.number().int().nonnegative().optional().catch(undefined),
  /** call_count_log: the daily task's whole calls field — a string, "" once cleared. */
  count: z.union([z.string().max(12), z.number().int().nonnegative()]).optional().catch(undefined),
  checked: z.boolean().optional().catch(undefined),
  pinned: z.boolean().optional().catch(undefined),
  helpful: z.boolean().optional().catch(undefined),
});
type EventMeta = z.infer<typeof eventMetaSchema>;

function readMeta(meta: Record<string, unknown> | null): EventMeta {
  const parsed = eventMetaSchema.safeParse(meta ?? {});
  return parsed.success ? parsed.data : {};
}

/** The content view event whose label map names an entity of this type —
 * `copy` and `pin_toggle` events carry the item's entityType, not a view type. */
const VIEW_TYPE_OF_ENTITY: ReadonlyMap<string, TelemetryEventType> = new Map([
  ["script", "script_select"],
  ["stage", "stage_view"],
  ["objection", "objection_view"],
  ["faq", "faq_view"],
  ["competitor", "competitor_view"],
  ["battleCard", "competitor_view"],
  ["package", "package_view"],
]);

/** The label map an entity of this type is named by (`copy` and `pin_toggle`
 * events carry the item's entityType); undefined for an item without one. */
function entityViewType(entityType: string | null): TelemetryEventType | undefined {
  return entityType === null ? undefined : VIEW_TYPE_OF_ENTITY.get(entityType);
}

/** The item an event is about, as words: a content title from the bundle when
 * `viewType` names its label map, else the raw id (a product, a contact), else
 * null when the event has no item. */
function entityLabel(event: PersonEvent, maps: EntityLabelMaps, viewType: TelemetryEventType | undefined): string | null {
  if (event.entityId === null || event.entityId === "") return null;
  return viewType ? resolveEntityLabel(viewType, event.entityId, event.path, maps) : event.entityId;
}

/** A calls-field value that is a whole number, else null ("" while it is being retyped). */
function callCount(value: EventMeta["count"]): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^\d{1,6}$/.test(value)) return Number(value);
  return null;
}

/** One line of the person's timeline: the `pages.admin.people.events` message
 * and the values it takes. Plain data — the server component formats it. */
export interface TimelineEntry {
  /** Stable React key. */
  key: string;
  /** toISOString() form. */
  ts: string;
  /** Under `pages.admin.people.events`. */
  messageKey: string;
  values: Record<string, string | number>;
}

function describeEvent(event: PersonEvent, maps: EntityLabelMaps): Pick<TimelineEntry, "messageKey" | "values"> {
  if (!isTimelineEventType(event.type)) return { messageKey: "unknown", values: { type: event.type } };

  const meta = readMeta(event.meta);
  switch (event.type) {
    case "page_enter":
      return { messageKey: event.type, values: { path: event.path } };

    case "script_select":
    case "stage_view":
    case "objection_view":
    case "faq_view":
    case "competitor_view":
    case "package_view":
      return { messageKey: event.type, values: { label: entityLabel(event, maps, event.type) ?? event.path } };

    case "search":
      return {
        messageKey: meta.resultCount === 0 ? "searchNoResults" : event.type,
        values: { query: meta.query ?? "—" },
      };

    case "copy": {
      const label = entityLabel(event, maps, entityViewType(event.entityType));
      return label === null ? { messageKey: "copyPlain", values: {} } : { messageKey: event.type, values: { label } };
    }

    case "pin_toggle":
      return {
        messageKey: event.type,
        values: {
          state: meta.pinned === undefined ? "other" : meta.pinned ? "on" : "off",
          label: entityLabel(event, maps, entityViewType(event.entityType)) ?? "—",
        },
      };

    case "checklist_toggle":
      return {
        messageKey: event.type,
        values: {
          kind: event.entityType === "daily_task" || event.entityType === "onboarding_item" ? event.entityType : "other",
          state: meta.checked === undefined ? "other" : meta.checked ? "on" : "off",
        },
      };

    case "call_count_log": {
      const count = callCount(meta.count);
      return { messageKey: event.type, values: { count: count === null ? "—" : count } };
    }

    case "feedback":
      return {
        messageKey: event.type,
        values: { helpful: meta.helpful === undefined ? "other" : meta.helpful ? "yes" : "no" },
      };

    case "call_mode_on":
    case "call_mode_off":
    case "calculator_use":
    case "copilot_ask":
      return { messageKey: event.type, values: {} };
  }
}

/** The timeline's lines, newest first as the database sent them, each already
 * turned into a message key and values. Labels come from the content bundle's
 * maps (unreadable content degrades to raw ids, never to an error). */
export function buildTimeline(events: readonly PersonEvent[], maps: EntityLabelMaps): TimelineEntry[] {
  return events.map((event, index) => ({
    key: `${event.ts}#${index}`,
    ts: event.ts,
    ...describeEvent(event, maps),
  }));
}
