import { describe, expect, it } from "vitest";
import { isPinned, pruneRefs, recordRecent, togglePin } from "@/lib/user-state/pins";
import type { PinKind, PinRef } from "@/lib/user-state/keys";

const faq = (id: string): PinRef => ({ kind: "faq", id });

describe("togglePin", () => {
  it("pins at the front, newest first", () => {
    expect(togglePin([faq("a")], faq("b"))).toEqual([faq("b"), faq("a")]);
  });

  it("unpins when already pinned", () => {
    const pins = [faq("b"), faq("a")];
    expect(isPinned(pins, faq("a"))).toBe(true);
    expect(togglePin(pins, faq("a"))).toEqual([faq("b")]);
  });

  it("tells kinds apart: the same id under another kind is a different pin", () => {
    expect(isPinned([faq("x")], { kind: "objection", id: "x" })).toBe(false);
  });

  it("keeps at most 24, dropping the oldest", () => {
    const full = Array.from({ length: 24 }, (_, i) => faq(`f${i}`));
    const next = togglePin(full, faq("new"));
    expect(next).toHaveLength(24);
    expect(next[0]).toEqual(faq("new"));
    expect(isPinned(next, faq("f23"))).toBe(false);
  });
});

describe("recordRecent", () => {
  it("moves a reopened item to the front with a fresh timestamp, without duplicating it", () => {
    const recents = [{ ...faq("b"), at: 2 }, { ...faq("a"), at: 1 }];
    expect(recordRecent(recents, faq("a"), 3)).toEqual([{ ...faq("a"), at: 3 }, { ...faq("b"), at: 2 }]);
  });

  it("returns the same array when the item is already the newest", () => {
    const recents = [{ ...faq("a"), at: 1 }];
    expect(recordRecent(recents, faq("a"), 9)).toBe(recents);
  });

  it("keeps at most 8, dropping the oldest", () => {
    const recents = Array.from({ length: 8 }, (_, i) => ({ ...faq(`f${i}`), at: i }));
    const next = recordRecent(recents, faq("new"), 99);
    expect(next).toHaveLength(8);
    expect(next.map((r) => r.id)).not.toContain("f7");
  });
});

describe("pruneRefs", () => {
  const known = new Set(["faq:a"]);
  const isKnown = (r: PinRef) => known.has(`${r.kind}:${r.id}`);

  it("drops unknown ids of a kind whose content loaded", () => {
    expect(pruneRefs([faq("a"), faq("gone")], isKnown, new Set<PinKind>(["faq"]))).toEqual([faq("a")]);
  });

  it("keeps everything of a kind that resolved nothing (an outage looks the same as a deletion)", () => {
    const refs = [faq("a"), { kind: "product", id: "p" } as const];
    expect(pruneRefs(refs, isKnown, new Set<PinKind>(["faq"]))).toEqual(refs);
  });

  it("returns the same array when nothing is dropped", () => {
    const refs = [faq("a")];
    expect(pruneRefs(refs, isKnown, new Set<PinKind>(["faq"]))).toBe(refs);
  });
});
