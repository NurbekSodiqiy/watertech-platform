import type { Json } from "@/lib/supabase/database.types";
import { BOOKKEEPING_COLUMNS, type SnapshotRow } from "@/lib/admin/snapshot";

// Field-level diff between a content_versions snapshot and the row as it is
// now, for components/admin/VersionDiff.tsx. Pure and dependency-free: the
// line diff below is a plain LCS table, not a diff library — the inputs are a
// handful of content columns, and a new dependency needs a reason (CLAUDE.md
// section 11).
//
// Nothing here knows which table it is looking at. A column is diffed by the
// shape of its value: text goes through the line diff, a JSONB array of
// objects (a script's stages, an SOP's steps) is matched per item and diffed
// inside, everything else is shown as before -> after.

export type DiffOp = "same" | "added" | "removed";

export interface DiffLine {
  op: DiffOp;
  text: string;
}

export type ItemStatus = "added" | "removed" | "changed";

/** One stage / step / turn-bearing object inside a JSONB array column. */
export interface DiffItem {
  /** The item's own id when it has one, otherwise its 1-based position. */
  key: string;
  /** What names the item in the panel: its label/title/name, or its key. */
  label: string;
  status: ItemStatus;
  lines: DiffLine[];
}

export type FieldDiff =
  | { kind: "text"; column: string; lines: DiffLine[] }
  | { kind: "value"; column: string; before: string | null; after: string | null }
  | { kind: "items"; column: string; items: DiffItem[] };

/** Above this many lines on either side the LCS table is not worth building
 * (it is O(n*m) in cells); such a field is reported as a wholesale replace,
 * which is what a 600-line change reads as anyway. */
const MAX_LCS_LINES = 600;

/** How the two sides of a text field line up, as an LCS over whole lines.
 * Unchanged lines are kept so the panel can show context around a change. */
export function diffLines(before: readonly string[], after: readonly string[]): DiffLine[] {
  if (before.length === 0 && after.length === 0) return [];
  if (before.length > MAX_LCS_LINES || after.length > MAX_LCS_LINES) {
    return [
      ...before.map((text): DiffLine => ({ op: "removed", text })),
      ...after.map((text): DiffLine => ({ op: "added", text })),
    ];
  }

  // lengths[i][j] = length of the longest common subsequence of before[i..] and after[j..].
  const lengths: number[][] = Array.from({ length: before.length + 1 }, () =>
    new Array<number>(after.length + 1).fill(0)
  );
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      const row = lengths[i];
      const next = lengths[i + 1];
      if (!row || !next) continue;
      row[j] = before[i] === after[j] ? (next[j + 1] ?? 0) + 1 : Math.max(next[j] ?? 0, row[j + 1] ?? 0);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length) {
    const beforeLine = before[i] ?? "";
    const afterLine = after[j] ?? "";
    if (beforeLine === afterLine) {
      out.push({ op: "same", text: beforeLine });
      i++;
      j++;
      continue;
    }
    if ((lengths[i + 1]?.[j] ?? 0) >= (lengths[i]?.[j + 1] ?? 0)) {
      out.push({ op: "removed", text: beforeLine });
      i++;
    } else {
      out.push({ op: "added", text: afterLine });
      j++;
    }
  }
  for (; i < before.length; i++) out.push({ op: "removed", text: before[i] ?? "" });
  for (; j < after.length; j++) out.push({ op: "added", text: after[j] ?? "" });
  return out;
}

function splitLines(text: string): string[] {
  return text === "" ? [] : text.split("\n");
}

/** The same diff for two multi-line strings. A field that is empty on one
 * side comes out as a pure add or delete, not as an empty line pair. */
export function diffText(before: string, after: string): DiffLine[] {
  return diffLines(splitLines(before), splitLines(after));
}

function isJsonObject(value: Json | undefined): value is { [key: string]: Json | undefined } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A column whose value is an array of objects — a script's stages, an SOP's
 * steps. An empty array counts, so emptying `stages` still diffs per item. */
function isItemList(value: Json | undefined): value is Json[] {
  return Array.isArray(value) && value.every(isJsonObject);
}

/** Every scalar leaf of an item as `path: value`, which is what gives the
 * per-turn / per-step granularity: a rewritten reply reads as
 * `turns[2].text: …`, not as "the whole stage changed". */
function flattenJson(value: Json | undefined, path: string, out: string[]): void {
  if (value === undefined || value === null) {
    out.push(`${path}: —`);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) out.push(`${path}: []`);
    else value.forEach((item, index) => flattenJson(item, `${path}[${index}]`, out));
    return;
  }
  if (isJsonObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) out.push(`${path}: {}`);
    else for (const [key, child] of entries) flattenJson(child, path === "" ? key : `${path}.${key}`, out);
    return;
  }
  if (typeof value === "string" && value.includes("\n")) {
    out.push(`${path}:`);
    for (const line of value.split("\n")) out.push(line);
    return;
  }
  out.push(`${path}: ${String(value)}`);
}

/** Fields that name an item, in the order they are tried. Covers every JSONB
 * list the CMS stores today (a stage's label, an SOP step's title) and
 * degrades to the item's position for anything else. */
const LABEL_KEYS = ["label", "title", "name", "question"] as const;

interface ListEntry {
  key: string;
  label: string;
  lines: string[];
}

function listEntries(value: Json[]): ListEntry[] {
  const seen = new Set<string>();
  return value.map((item, index) => {
    const position = String(index + 1);
    const object = isJsonObject(item) ? item : {};
    const id = typeof object.id === "string" && object.id !== "" ? object.id : null;
    // A duplicate id would make two items match the same counterpart, so the
    // second one falls back to its position.
    const key = id !== null && !seen.has(id) ? id : position;
    seen.add(key);
    const named = LABEL_KEYS.map((field) => object[field]).find(
      (candidate): candidate is string => typeof candidate === "string" && candidate.trim() !== ""
    );
    const lines: string[] = [];
    flattenJson(item, "", lines);
    return { key, label: named ?? id ?? position, lines };
  });
}

/** Items matched by id (or by position where there is none): one marker per
 * stage/step, with the line diff of its own fields underneath. */
function diffItemLists(before: Json[], after: Json[]): DiffItem[] {
  const beforeEntries = listEntries(before);
  const afterEntries = listEntries(after);
  const afterByKey = new Map(afterEntries.map((entry) => [entry.key, entry]));
  const beforeKeys = new Set(beforeEntries.map((entry) => entry.key));

  const items: DiffItem[] = [];
  for (const entry of beforeEntries) {
    const counterpart = afterByKey.get(entry.key);
    if (!counterpart) {
      items.push({
        key: entry.key,
        label: entry.label,
        status: "removed",
        lines: entry.lines.map((text): DiffLine => ({ op: "removed", text })),
      });
      continue;
    }
    if (entry.lines.join("\n") === counterpart.lines.join("\n")) continue;
    items.push({
      key: entry.key,
      label: counterpart.label,
      status: "changed",
      lines: diffLines(entry.lines, counterpart.lines),
    });
  }
  for (const entry of afterEntries) {
    if (beforeKeys.has(entry.key)) continue;
    items.push({
      key: entry.key,
      label: entry.label,
      status: "added",
      lines: entry.lines.map((text): DiffLine => ({ op: "added", text })),
    });
  }
  return items;
}

/** Deep equality by value, so a JSONB object whose keys come back in another
 * order is not reported as a change. */
function sameJson(a: Json | undefined, b: Json | undefined): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => sameJson(item, b[index]));
  }
  if (isJsonObject(a) && isJsonObject(b)) {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    return keys.every((key) => sameJson(a[key], b[key]));
  }
  return false;
}

function asText(value: Json | undefined): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => asText(item) ?? "—").join(", ");
  return JSON.stringify(value);
}

/** True when the column reads as prose on both sides. A null counts as empty
 * text, so filling in a Russian twin is a text diff, not a value swap. */
function isTextColumn(before: Json | undefined, after: Json | undefined): boolean {
  const textOrEmpty = (value: Json | undefined): boolean =>
    typeof value === "string" || value === null || value === undefined;
  return textOrEmpty(before) && textOrEmpty(after) && (typeof before === "string" || typeof after === "string");
}

/**
 * What changed between a snapshot and the row as it is now, column by column.
 * Bookkeeping columns are skipped (they always differ and mean nothing to a
 * manager) and equal columns are left out entirely — the panel lists changes,
 * not the whole row.
 */
export function diffRows(before: SnapshotRow, after: SnapshotRow): FieldDiff[] {
  const columns = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((column) => !BOOKKEEPING_COLUMNS.has(column))
    .sort();

  const diffs: FieldDiff[] = [];
  for (const column of columns) {
    const left = before[column];
    const right = after[column];
    if (sameJson(left, right)) continue;

    if (isItemList(left) || isItemList(right)) {
      const items = diffItemLists(isItemList(left) ? left : [], isItemList(right) ? right : []);
      if (items.length > 0) diffs.push({ kind: "items", column, items });
      continue;
    }
    if (isTextColumn(left, right)) {
      diffs.push({ kind: "text", column, lines: diffText(asText(left) ?? "", asText(right) ?? "") });
      continue;
    }
    diffs.push({ kind: "value", column, before: asText(left), after: asText(right) });
  }
  return diffs;
}
