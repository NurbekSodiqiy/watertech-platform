import { describe, expect, it } from "vitest";
import {
  internalLinksResolve,
  placeholderText,
  requiredNotBlank,
  ruTranslationPresent,
  runChecks,
  schemaValid,
  targetTitle,
} from "@/lib/agents/publish-gate/checks";
import type { GateIssue, GateTarget } from "@/lib/agents/publish-gate/types";
import { changelogToRow } from "@/lib/content/db";
import type { ChangelogEntry } from "@/lib/content/types";
import { gateContext } from "../../fixtures/content";

const ctx = gateContext();

const entry: ChangelogEntry = {
  id: "2026-09-chegirmalar",
  publishedOn: "2026-09-02",
  title: "Chegirma darajalari yangilandi",
  body: "Yangi chegirma jadvali kuchga kirdi.",
  linkedPath: "/sales-process/battle-cards",
  approvedBy: "Savdo bo'limi boshlig'i",
  titleRu: "Уровни скидок обновлены",
  bodyRu: "Вступила в силу новая таблица скидок.",
};

function target(patch: Partial<ChangelogEntry> = {}): GateTarget {
  return { table: "content_changelog", row: changelogToRow({ ...entry, ...patch }) };
}

function codes(issues: GateIssue[]): string[] {
  return issues.map((i) => i.code);
}

describe("publish gate on content_changelog", () => {
  it("passes a complete entry with no issues at all", () => {
    expect(runChecks(target(), ctx)).toEqual({ passed: true, issues: [] });
  });

  it("uses the title as the row's display title", () => {
    expect(targetTitle(target())).toBe(entry.title);
  });

  it("blocks a blank title, body or approver", () => {
    const issues = requiredNotBlank(target({ title: " ", body: "", approvedBy: "" }), ctx);
    expect(issues.map((i) => i.field)).toEqual(["title", "body", "approved_by"]);
    expect(runChecks(target({ body: "" }), ctx).passed).toBe(false);
  });

  it("blocks an impossible date", () => {
    expect(codes(schemaValid(target({ publishedOn: "2026-02-30" }), ctx))).toEqual(["schema_invalid"]);
  });

  it("blocks a linked page in a linkable section that does not exist", () => {
    const issues = internalLinksResolve(target({ linkedPath: "/faq/yoq-sahifa" }), ctx);
    expect(codes(issues)).toEqual(["internal_link_broken"]);
    expect(issues[0].field).toBe("linked_path");
  });

  it("accepts a linked page that exists", () => {
    expect(internalLinksResolve(target({ linkedPath: "/faq" }), ctx)).toEqual([]);
  });

  it("blocks leftover placeholder text", () => {
    expect(codes(placeholderText(target({ body: "TODO: matn yoziladi" }), ctx))).toEqual(["placeholder_text"]);
  });

  it("only warns about a missing Russian translation, which does not block", () => {
    const result = runChecks(target({ titleRu: undefined, bodyRu: undefined }), ctx);
    expect(result.passed).toBe(true);
    expect(ruTranslationPresent(target({ titleRu: undefined, bodyRu: undefined }), ctx).map((i) => i.field)).toEqual([
      "title_ru",
      "body_ru",
    ]);
  });
});
