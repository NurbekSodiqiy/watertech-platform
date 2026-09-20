import { describe, expect, it } from "vitest";
import { aggregateChangelogReads, unreadIds, withRead } from "@/lib/user-state/changelog";
import { CHANGELOG_READ_MAX, changelogReadKey } from "@/lib/user-state/keys";

const parse = (value: unknown): string[] | null => {
  const result = changelogReadKey.schema.safeParse(value);
  return result.success ? result.data : null;
};

describe("unreadIds", () => {
  it("keeps the published order and drops what has been read", () => {
    expect(unreadIds(["c", "b", "a"], ["b"])).toEqual(["c", "a"]);
  });

  it("ignores read ids that are no longer published", () => {
    expect(unreadIds(["a"], ["gone", "a"])).toEqual([]);
  });

  it("is everything when nothing has been read", () => {
    expect(unreadIds(["a", "b"], [])).toEqual(["a", "b"]);
  });
});

describe("withRead", () => {
  it("appends new ids once, in order", () => {
    expect(withRead(["a"], ["b", "c", "b", "a"])).toEqual(["a", "b", "c"]);
  });

  it("returns the same array when there is nothing new, so no write happens", () => {
    const read = ["a", "b"];
    expect(withRead(read, ["b", "a"])).toBe(read);
    expect(withRead(read, [])).toBe(read);
  });

  it("never exceeds the cap and drops the oldest marks first", () => {
    const read = Array.from({ length: CHANGELOG_READ_MAX }, (_, i) => `e${i}`);
    const next = withRead(read, ["new"]);
    expect(next).toHaveLength(CHANGELOG_READ_MAX);
    expect(next[0]).toBe("e1");
    expect(next.at(-1)).toBe("new");
    // The capped value is still valid for the key, i.e. it would not be discarded.
    expect(parse(next)).toEqual(next);
  });
});

describe("aggregateChangelogReads", () => {
  const operators = ["a@x.uz", "b@x.uz", "c@x.uz"];

  it("counts, per entry, the operators who read it", () => {
    const counts = aggregateChangelogReads(
      operators,
      [
        { user_email: "a@x.uz", value: ["e1", "e2"] },
        { user_email: "b@x.uz", value: ["e1"] },
      ],
      parse
    );
    expect(counts.total).toBe(3);
    expect(counts.readBy.get("e1")).toBe(2);
    expect(counts.readBy.get("e2")).toBe(1);
    expect(counts.readBy.get("e3")).toBeUndefined();
  });

  it("ignores people who are not operators, so a count never exceeds the total", () => {
    const counts = aggregateChangelogReads(
      operators,
      [
        { user_email: "boss@x.uz", value: ["e1"] },
        { user_email: "removed@x.uz", value: ["e1"] },
      ],
      parse
    );
    expect(counts.readBy.size).toBe(0);
    expect(counts.total).toBe(3);
  });

  it("counts an operator once even with a repeated row or a repeated id", () => {
    const counts = aggregateChangelogReads(
      operators,
      [
        { user_email: "a@x.uz", value: ["e1", "e1"] },
        { user_email: "a@x.uz", value: ["e1"] },
      ],
      parse
    );
    expect(counts.readBy.get("e1")).toBe(1);
  });

  it("treats an invalid stored value as having read nothing", () => {
    const counts = aggregateChangelogReads(
      operators,
      [
        { user_email: "a@x.uz", value: "not-an-array" },
        { user_email: "b@x.uz", value: [1, 2] },
      ],
      parse
    );
    expect(counts.readBy.size).toBe(0);
  });

  it("has a total of 0 and no counts with no operators", () => {
    const counts = aggregateChangelogReads([], [{ user_email: "a@x.uz", value: ["e1"] }], parse);
    expect(counts.total).toBe(0);
    expect(counts.readBy.size).toBe(0);
  });
});
