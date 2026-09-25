import { describe, expect, it } from "vitest";
import { createTranslator } from "next-intl";
import ru from "@/messages/ru.json";
import uz from "@/messages/uz.json";
import type { PersonEvent } from "@/lib/admin/people";
import {
  TIMELINE_EVENT_TYPES,
  TIMELINE_EXTRA_MESSAGES,
  buildTimeline,
  resolveSection,
  type TimelineEntry,
} from "@/lib/admin/person-page";
import { siteTree } from "@/lib/site-config";
import type { EntityLabelMaps } from "@/lib/telemetry/aggregate";

// What the person page does with the 0021 rows before drawing them: which app
// section a path segment is, and what each timeline line says. The last block
// formats every message through next-intl in both locales, so a broken ICU
// string (an apostrophe in the wrong place, a select without `other`) fails
// here and not on the owner's screen.

const MAPS: EntityLabelMaps = {
  scriptNameById: new Map([["script-1", "Yangi mijoz"]]),
  stageLabelById: new Map([["stage-1", "Yangi mijoz — Salomlashish"]]),
  objectionLabelById: new Map([["obj-qimmat", "Narx qimmat"]]),
  competitorNameById: new Map([["alfa-therm", "Alfa Therm"]]),
  packageNameById: new Map([["pkg-1", "Boshlang'ich to'plam"]]),
};

const TS = "2026-09-24T08:00:00.000Z";

function event(over: Partial<PersonEvent> & Pick<PersonEvent, "type">): PersonEvent {
  return { ts: TS, path: "/faq", entityType: null, entityId: null, meta: null, ...over };
}

function line(over: Parameters<typeof event>[0]): Pick<TimelineEntry, "messageKey" | "values"> {
  const [entry] = buildTimeline([event(over)], MAPS);
  if (!entry) throw new Error("no entry");
  return { messageKey: entry.messageKey, values: entry.values };
}

describe("resolveSection", () => {
  it("knows home", () => {
    expect(resolveSection("home")).toEqual({ kind: "home" });
  });

  it("takes a section's label from the site tree", () => {
    expect(resolveSection("sales-process")).toEqual({ kind: "nav", titleKey: "salesProcess.title" });
    expect(resolveSection("faq")).toEqual({ kind: "nav", titleKey: "faq.title" });
  });

  it("resolves every top-level node of the site tree", () => {
    for (const node of siteTree) {
      expect(resolveSection(node.path.slice(1))).toEqual({ kind: "nav", titleKey: node.title });
    }
  });

  it("shows an unknown segment as it is", () => {
    expect(resolveSection("login")).toEqual({ kind: "raw", section: "login" });
    expect(resolveSection("sales-process/objections")).toEqual({ kind: "raw", section: "sales-process/objections" });
  });
});

describe("buildTimeline", () => {
  it("keeps the order the database sent and gives every line a distinct key", () => {
    const entries = buildTimeline(
      [event({ type: "search", meta: { query: "a" } }), event({ type: "search", meta: { query: "b" } })],
      MAPS
    );
    expect(entries.map((entry) => entry.values.query)).toEqual(["a", "b"]);
    expect(new Set(entries.map((entry) => entry.key)).size).toBe(2);
  });

  it("names a viewed item by its title, or by its id when the content has none", () => {
    expect(line({ type: "script_select", entityType: "script", entityId: "script-1" })).toEqual({
      messageKey: "script_select",
      values: { label: "Yangi mijoz" },
    });
    expect(line({ type: "stage_view", entityType: "stage", entityId: "stage-1" }).values).toEqual({
      label: "Yangi mijoz — Salomlashish",
    });
    expect(line({ type: "objection_view", entityId: "obj-qimmat" }).values).toEqual({ label: "Narx qimmat" });
    expect(line({ type: "competitor_view", entityId: "alfa-therm" }).values).toEqual({ label: "Alfa Therm" });
    expect(line({ type: "package_view", entityId: "pkg-1" }).values).toEqual({ label: "Boshlang'ich to'plam" });
    expect(line({ type: "objection_view", entityId: "obj-yangi" }).values).toEqual({ label: "obj-yangi" });
    // A FAQ's entity id is the question text itself.
    expect(line({ type: "faq_view", entityId: "Yetkazib berish qancha?" }).values).toEqual({
      label: "Yetkazib berish qancha?",
    });
  });

  it("falls back to the path when a view carries no entity", () => {
    expect(line({ type: "script_select", path: "/sales-process/scripts" }).values).toEqual({
      label: "/sales-process/scripts",
    });
  });

  it("says what a page_enter opened", () => {
    expect(line({ type: "page_enter", path: "/company/about" })).toEqual({
      messageKey: "page_enter",
      values: { path: "/company/about" },
    });
  });

  it("reads a search's query, and says when it found nothing", () => {
    expect(line({ type: "search", meta: { query: "issiq suv", resultCount: 4 } })).toEqual({
      messageKey: "search",
      values: { query: "issiq suv" },
    });
    expect(line({ type: "search", meta: { query: "kran", resultCount: 0 } }).messageKey).toBe("searchNoResults");
  });

  it("copies: the item's title when there is one, a plain line when there is not", () => {
    expect(line({ type: "copy", entityType: "objection", entityId: "obj-qimmat" })).toEqual({
      messageKey: "copy",
      values: { label: "Narx qimmat" },
    });
    // No label map for a contact: its id is shown.
    expect(line({ type: "copy", entityType: "contact", entityId: "c-1" }).values).toEqual({ label: "c-1" });
    expect(line({ type: "copy" })).toEqual({ messageKey: "copyPlain", values: {} });
    expect(line({ type: "copy", entityId: "" }).messageKey).toBe("copyPlain");
  });

  it("pin_toggle: the state after the toggle, and the pinned item", () => {
    expect(line({ type: "pin_toggle", entityType: "battleCard", entityId: "alfa-therm", meta: { pinned: true } })).toEqual({
      messageKey: "pin_toggle",
      values: { state: "on", label: "Alfa Therm" },
    });
    expect(line({ type: "pin_toggle", entityType: "product", entityId: "p-1", meta: { pinned: false } }).values).toEqual({
      state: "off",
      label: "p-1",
    });
    expect(line({ type: "pin_toggle", meta: {} }).values).toEqual({ state: "other", label: "—" });
  });

  it("checklist_toggle: which checklist and which way", () => {
    expect(line({ type: "checklist_toggle", entityType: "daily_task", entityId: "3", meta: { checked: true } }).values).toEqual({
      kind: "daily_task",
      state: "on",
    });
    expect(
      line({ type: "checklist_toggle", entityType: "onboarding_item", entityId: "x", meta: { checked: false } }).values
    ).toEqual({ kind: "onboarding_item", state: "off" });
    expect(line({ type: "checklist_toggle", entityType: "other-thing" }).values).toEqual({ kind: "other", state: "other" });
  });

  it("call_count_log: a whole number of calls, whatever the field held while being typed", () => {
    const count = (value: unknown) => line({ type: "call_count_log", meta: { count: value } }).values.count;
    expect(count("25")).toBe(25);
    expect(count(3)).toBe(3);
    expect(count("0")).toBe(0);
    expect(count("")).toBe("—");
    expect(count("12abc")).toBe("—");
    expect(count("1234567")).toBe("—");
    expect(count(-1)).toBe("—");
    expect(count(undefined)).toBe("—");
  });

  it("feedback: helpful or not", () => {
    expect(line({ type: "feedback", meta: { helpful: true } }).values).toEqual({ helpful: "yes" });
    expect(line({ type: "feedback", meta: { helpful: false } }).values).toEqual({ helpful: "no" });
    expect(line({ type: "feedback" }).values).toEqual({ helpful: "other" });
  });

  it("has a plain line for the events that carry nothing", () => {
    for (const type of ["call_mode_on", "call_mode_off", "calculator_use", "copilot_ask"] as const) {
      expect(line({ type })).toEqual({ messageKey: type, values: {} });
    }
  });

  it("shows a type this release does not know as unknown, with the type", () => {
    expect(line({ type: "legacy_event_v0" })).toEqual({ messageKey: "unknown", values: { type: "legacy_event_v0" } });
    // Even one that IS a telemetry type but has no sentence: the SQL leaves them out.
    expect(line({ type: "page_leave" }).messageKey).toBe("unknown");
  });

  it("reads meta only through the known keys: junk costs the key, never the line", () => {
    expect(line({ type: "search", meta: { query: 42, resultCount: "many", evil: "<script>", extra: { a: 1 } } })).toEqual({
      messageKey: "search",
      values: { query: "—" },
    });
    expect(line({ type: "search", meta: { query: "x".repeat(500) } }).values).toEqual({ query: "—" });
    expect(() => buildTimeline([event({ type: "feedback", meta: { helpful: "yes" } })], MAPS)).not.toThrow();
  });
});

type Messages = { [key: string]: string | Messages };

function people(messages: Messages): Messages {
  const admin = (messages.pages as Messages | undefined)?.admin as Messages | undefined;
  const found = admin?.people;
  if (typeof found !== "object") throw new Error("pages.admin.people is missing");
  return found;
}

describe("pages.admin.people.events", () => {
  it.each([
    ["uz", uz],
    ["ru", ru],
  ] as const)("%s has a message for every timeline type and variant", (_locale, messages) => {
    const events = people(messages).events;
    if (typeof events !== "object") throw new Error("no events");
    for (const key of [...TIMELINE_EVENT_TYPES, ...TIMELINE_EXTRA_MESSAGES]) {
      expect(typeof events[key], key).toBe("string");
    }
  });

  it.each([
    ["uz", uz],
    ["ru", ru],
  ] as const)("%s formats every line the builder can produce", (locale, messages) => {
    const t = createTranslator({ locale, messages: { events: people(messages).events }, namespace: "events" });
    const samples: Parameters<typeof event>[0][] = [
      { type: "page_enter", path: "/faq" },
      { type: "script_select", entityId: "script-1" },
      { type: "stage_view", entityId: "stage-1" },
      { type: "objection_view", entityId: "obj-qimmat" },
      { type: "faq_view", entityId: "Savol?" },
      { type: "competitor_view", entityId: "alfa-therm" },
      { type: "package_view", entityId: "pkg-1" },
      { type: "search", meta: { query: "kran", resultCount: 3 } },
      { type: "search", meta: { query: "kran", resultCount: 0 } },
      { type: "copy", entityType: "objection", entityId: "obj-qimmat" },
      { type: "copy" },
      { type: "call_mode_on" },
      { type: "call_mode_off" },
      { type: "checklist_toggle", entityType: "daily_task", meta: { checked: true } },
      { type: "checklist_toggle", entityType: "onboarding_item", meta: { checked: false } },
      { type: "checklist_toggle" },
      { type: "calculator_use" },
      { type: "call_count_log", meta: { count: "7" } },
      { type: "feedback", meta: { helpful: true } },
      { type: "feedback", meta: { helpful: false } },
      { type: "feedback" },
      { type: "copilot_ask" },
      { type: "pin_toggle", entityType: "script", entityId: "script-1", meta: { pinned: true } },
      { type: "pin_toggle", entityType: "script", entityId: "script-1", meta: { pinned: false } },
      { type: "pin_toggle" },
      { type: "no_such_event" },
    ];
    for (const entry of buildTimeline(samples.map(event), MAPS)) {
      const text = t(entry.messageKey, entry.values);
      expect(text, entry.messageKey).not.toBe("");
      // An unresolved argument or a message the formatter gave up on.
      expect(text, entry.messageKey).not.toMatch(/[{}]|events\./);
    }
  });

  it("puts the item into the sentence, and picks the branch of a select", () => {
    const t = createTranslator({ locale: "uz", messages: { events: people(uz).events }, namespace: "events" });
    expect(t("script_select", { label: "Yangi mijoz" })).toBe("Skript ochdi: Yangi mijoz");
    expect(t("search", { query: "kran" })).toBe("Qidirdi: «kran»");
    expect(t("pin_toggle", { state: "on", label: "X" })).toBe("Pin qo'ydi: X");
    expect(t("pin_toggle", { state: "off", label: "X" })).toBe("Pinni oldi: X");
    expect(t("feedback", { helpful: "no" })).toBe("Javobni foydasiz deb belgiladi");
  });
});
