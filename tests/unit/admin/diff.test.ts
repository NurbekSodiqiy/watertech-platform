import { describe, expect, it } from "vitest";
import { diffLines, diffRows, diffText } from "@/lib/admin/diff";
import type { SnapshotRow } from "@/lib/admin/snapshot";

// The version diff is what a manager reads before deciding to restore, so the
// two things that matter are that it never invents a change (equal columns are
// absent, reordered JSONB keys are not a change) and that it points at the
// stage or step that actually moved.

describe("diffLines", () => {
  it("keeps the common lines and marks the rest", () => {
    expect(diffLines(["a", "b", "c"], ["a", "x", "c"])).toEqual([
      { op: "same", text: "a" },
      { op: "removed", text: "b" },
      { op: "added", text: "x" },
      { op: "same", text: "c" },
    ]);
  });

  it("finds the longest common subsequence rather than comparing by position", () => {
    expect(diffLines(["a", "b", "c"], ["b", "c"])).toEqual([
      { op: "removed", text: "a" },
      { op: "same", text: "b" },
      { op: "same", text: "c" },
    ]);
  });

  it("is empty for identical input and one-sided for an empty side", () => {
    expect(diffLines(["a"], ["a"])).toEqual([{ op: "same", text: "a" }]);
    expect(diffLines([], [])).toEqual([]);
    expect(diffLines([], ["a"])).toEqual([{ op: "added", text: "a" }]);
    expect(diffLines(["a"], [])).toEqual([{ op: "removed", text: "a" }]);
  });

  it("falls back to a wholesale replace past the LCS budget", () => {
    const before = Array.from({ length: 601 }, (_, i) => `line ${i}`);
    const lines = diffLines(before, ["line 0"]);
    expect(lines.filter((line) => line.op === "same")).toEqual([]);
    expect(lines).toHaveLength(602);
  });

  it("splits multi-line text before diffing it", () => {
    expect(diffText("bir\nikki", "bir\nuch")).toEqual([
      { op: "same", text: "bir" },
      { op: "removed", text: "ikki" },
      { op: "added", text: "uch" },
    ]);
    expect(diffText("", "bir")).toEqual([{ op: "added", text: "bir" }]);
  });
});

describe("diffRows", () => {
  const snapshot: SnapshotRow = {
    id: "faq-kafolat",
    question: "Kafolat muddati qancha?",
    answer: "10 yil.",
    answer_ru: null,
    // Bookkeeping: always different, never a content change.
    status: "published",
    version: 3,
    sort_order: 1,
    updated_at: "2026-01-01T00:00:00Z",
    updated_by: "someone@watertech.uz",
  };

  it("reports only the columns that changed", () => {
    const current: SnapshotRow = { ...snapshot, answer: "5 yil.", status: "draft", version: 9 };

    expect(diffRows(snapshot, current)).toEqual([
      {
        kind: "text",
        column: "answer",
        lines: [
          { op: "removed", text: "10 yil." },
          { op: "added", text: "5 yil." },
        ],
      },
    ]);
  });

  it("treats a filled-in Russian twin as a text diff, not a value swap", () => {
    const diffs = diffRows(snapshot, { ...snapshot, answer_ru: "10 лет." });
    expect(diffs).toEqual([{ kind: "text", column: "answer_ru", lines: [{ op: "added", text: "10 лет." }] }]);
  });

  it("is empty when only bookkeeping moved", () => {
    expect(diffRows(snapshot, { ...snapshot, status: "draft", version: 99, updated_by: "other@watertech.uz" })).toEqual(
      []
    );
  });

  it("does not report a JSONB object whose keys came back in another order", () => {
    const before: SnapshotRow = { id: "x", stages: [{ id: "stg", label: "Salom", turns: [], objectionIds: [] }] };
    const after: SnapshotRow = { id: "x", stages: [{ objectionIds: [], turns: [], label: "Salom", id: "stg" }] };
    expect(diffRows(before, after)).toEqual([]);
  });

  it("shows a scalar column as before → after", () => {
    const diffs = diffRows({ id: "pkg", discount_pct: 5 }, { id: "pkg", discount_pct: 10 });
    expect(diffs).toEqual([{ kind: "value", column: "discount_pct", before: "5", after: "10" }]);
  });

  it("joins an array of scalars into one value", () => {
    const diffs = diffRows({ id: "obj", keywords: ["qimmat"] }, { id: "obj", keywords: ["qimmat", "narx"] });
    expect(diffs).toEqual([{ kind: "value", column: "keywords", before: "qimmat", after: "qimmat, narx" }]);
  });
});

describe("diffRows on JSONB item lists", () => {
  const stage = (id: string, label: string, text: string) => ({
    id,
    label,
    turns: [{ speaker: "operator", text }],
    objectionIds: [],
  });

  it("marks a stage as changed and points at the turn that moved", () => {
    const before: SnapshotRow = { id: "scr", stages: [stage("stg-salom", "Salomlashish", "Assalomu alaykum")] };
    const after: SnapshotRow = { id: "scr", stages: [stage("stg-salom", "Salomlashish", "Xayrli kun")] };

    const [diff] = diffRows(before, after);
    expect(diff).toMatchObject({ kind: "items", column: "stages" });
    if (diff?.kind !== "items") throw new Error("expected an item diff");
    expect(diff.items).toHaveLength(1);
    expect(diff.items[0]).toMatchObject({ key: "stg-salom", label: "Salomlashish", status: "changed" });
    expect(diff.items[0]?.lines).toContainEqual({ op: "removed", text: "turns[0].text: Assalomu alaykum" });
    expect(diff.items[0]?.lines).toContainEqual({ op: "added", text: "turns[0].text: Xayrli kun" });
  });

  it("matches items by id, so an inserted stage is one added marker", () => {
    const before: SnapshotRow = { id: "scr", stages: [stage("stg-salom", "Salomlashish", "Salom")] };
    const after: SnapshotRow = {
      id: "scr",
      stages: [stage("stg-salom", "Salomlashish", "Salom"), stage("stg-etiroz", "E'tiroz", "Tushundim")],
    };

    const [diff] = diffRows(before, after);
    if (diff?.kind !== "items") throw new Error("expected an item diff");
    expect(diff.items).toHaveLength(1);
    expect(diff.items[0]).toMatchObject({ key: "stg-etiroz", label: "E'tiroz", status: "added" });
    expect(diff.items[0]?.lines.every((line) => line.op === "added")).toBe(true);
  });

  it("marks a deleted stage as removed", () => {
    const before: SnapshotRow = {
      id: "scr",
      stages: [stage("stg-salom", "Salomlashish", "Salom"), stage("stg-etiroz", "E'tiroz", "Tushundim")],
    };
    const after: SnapshotRow = { id: "scr", stages: [stage("stg-salom", "Salomlashish", "Salom")] };

    const [diff] = diffRows(before, after);
    if (diff?.kind !== "items") throw new Error("expected an item diff");
    expect(diff.items).toEqual([
      expect.objectContaining({ key: "stg-etiroz", label: "E'tiroz", status: "removed" }),
    ]);
  });

  it("falls back to positions for a list whose items have no id (SOP steps)", () => {
    const before: SnapshotRow = { id: "sop", steps: [{ title: "Lidni oching", body: "amoCRM" }] };
    const after: SnapshotRow = {
      id: "sop",
      steps: [
        { title: "Lidni oching", body: "amoCRM" },
        { title: "Mas'ulni tayinlang", body: "" },
      ],
    };

    const [diff] = diffRows(before, after);
    if (diff?.kind !== "items") throw new Error("expected an item diff");
    expect(diff.items).toEqual([
      expect.objectContaining({ key: "2", label: "Mas'ulni tayinlang", status: "added" }),
    ]);
  });

  it("reads an emptied list as every item removed", () => {
    const before: SnapshotRow = { id: "scr", stages: [stage("stg-salom", "Salomlashish", "Salom")] };
    const [diff] = diffRows(before, { id: "scr", stages: [] });
    if (diff?.kind !== "items") throw new Error("expected an item diff");
    expect(diff.items).toEqual([expect.objectContaining({ key: "stg-salom", status: "removed" })]);
  });
});
