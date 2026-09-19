import { describe, expect, it } from "vitest";
import {
  dequeueWrite,
  enqueueWrite,
  MAX_QUEUED_KEYS,
  parseQueue,
  pendingWrites,
  serializeQueue,
  type WriteQueue,
} from "@/lib/user-state/queue";

const at = (day: number) => `2026-09-${String(day).padStart(2, "0")}T08:00:00.000Z`;

describe("enqueueWrite", () => {
  it("keeps one pending write per key — the newest", () => {
    let queue: WriteQueue = {};
    queue = enqueueWrite(queue, { key: "pins", value: ["a"], updatedAt: at(1) });
    queue = enqueueWrite(queue, { key: "pins", value: ["a", "b"], updatedAt: at(2) });

    expect(Object.keys(queue)).toEqual(["pins"]);
    expect(queue.pins.value).toEqual(["a", "b"]);
  });

  it("does not let a stale retry overwrite a newer queued value", () => {
    let queue: WriteQueue = {};
    queue = enqueueWrite(queue, { key: "pins", value: ["new"], updatedAt: at(2) });
    queue = enqueueWrite(queue, { key: "pins", value: ["old"], updatedAt: at(1) });

    expect(queue.pins.value).toEqual(["new"]);
  });

  it("drops the oldest keys once the cap is reached", () => {
    let queue: WriteQueue = {};
    for (let i = 1; i <= MAX_QUEUED_KEYS + 2; i += 1) {
      queue = enqueueWrite(queue, { key: `k${i}`, value: i, updatedAt: `2026-09-19T08:00:${String(i).padStart(2, "0")}.000Z` });
    }

    const keys = Object.keys(queue);
    expect(keys).toHaveLength(MAX_QUEUED_KEYS);
    expect(keys).not.toContain("k1");
    expect(keys).not.toContain("k2");
    expect(keys).toContain(`k${MAX_QUEUED_KEYS + 2}`);
  });

  it("does not mutate the queue it was given", () => {
    const queue: WriteQueue = {};
    enqueueWrite(queue, { key: "pins", value: [], updatedAt: at(1) });
    expect(queue).toEqual({});
  });
});

describe("dequeueWrite", () => {
  it("removes the write that was sent", () => {
    const queue = enqueueWrite({}, { key: "pins", value: [], updatedAt: at(1) });
    expect(dequeueWrite(queue, "pins", at(1))).toEqual({});
  });

  it("keeps a value that changed again while the request was in flight", () => {
    const queue = enqueueWrite({}, { key: "pins", value: ["newer"], updatedAt: at(2) });
    expect(dequeueWrite(queue, "pins", at(1))).toEqual(queue);
  });
});

describe("pendingWrites", () => {
  it("replays oldest first", () => {
    let queue: WriteQueue = {};
    queue = enqueueWrite(queue, { key: "b", value: 2, updatedAt: at(2) });
    queue = enqueueWrite(queue, { key: "a", value: 1, updatedAt: at(1) });

    expect(pendingWrites(queue).map((w) => w.key)).toEqual(["a", "b"]);
  });
});

describe("parseQueue", () => {
  it("round-trips a serialized queue", () => {
    const queue = enqueueWrite({}, { key: "pins", value: ["a"], updatedAt: at(1) });
    expect(parseQueue(serializeQueue(queue))).toEqual(queue);
  });

  it("starts empty instead of throwing on missing or corrupt storage", () => {
    expect(parseQueue(null)).toEqual({});
    expect(parseQueue("{not json")).toEqual({});
    expect(parseQueue("[]")).toEqual({});
  });

  it("drops entries that are not shaped like a pending write", () => {
    const raw = JSON.stringify({
      good: { key: "good", value: 1, updatedAt: at(1) },
      mismatched: { key: "other", value: 1, updatedAt: at(1) },
      undated: { key: "undated", value: 1 },
      empty: null,
    });
    expect(Object.keys(parseQueue(raw))).toEqual(["good"]);
  });
});
