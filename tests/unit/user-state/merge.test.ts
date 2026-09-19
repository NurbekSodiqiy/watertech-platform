import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  mergeUserState,
  parseCacheEntry,
  parseStoredValue,
  serializeCacheEntry,
  UNKNOWN_UPDATED_AT,
} from "@/lib/user-state/merge";

const schema = z.object({ checked: z.record(z.string(), z.boolean()) });
const fallback = { checked: {} };

const OLD = "2026-09-18T08:00:00.000Z";
const NEW = "2026-09-19T08:00:00.000Z";
const NOW = "2026-09-19T12:00:00.000Z";

describe("mergeUserState", () => {
  it("falls back to the default when neither side has anything", () => {
    expect(mergeUserState(null, null, fallback, NOW)).toEqual({
      value: fallback,
      updatedAt: UNKNOWN_UPDATED_AT,
      winner: "default",
      needsUpload: false,
    });
  });

  it("takes the server value on a device that has nothing cached", () => {
    const remote = { value: { checked: { "1": true } }, updatedAt: OLD };
    expect(mergeUserState(null, remote, fallback, NOW)).toEqual({
      value: remote.value,
      updatedAt: OLD,
      winner: "remote",
      needsUpload: false,
    });
  });

  it("uploads a local value the server does not have yet", () => {
    const local = { value: { checked: { "1": true } }, updatedAt: NEW };
    expect(mergeUserState(local, null, fallback, NOW)).toEqual({
      value: local.value,
      updatedAt: NEW,
      winner: "local",
      needsUpload: true,
    });
  });

  it("stamps an imported legacy value with the current time when it is adopted", () => {
    const local = { value: { checked: { "1": true } }, updatedAt: UNKNOWN_UPDATED_AT };
    const merged = mergeUserState(local, null, fallback, NOW);
    expect(merged.updatedAt).toBe(NOW);
    expect(merged.needsUpload).toBe(true);
  });

  it("lets a server row beat an imported legacy value of unknown age", () => {
    const local = { value: { checked: { "1": true } }, updatedAt: UNKNOWN_UPDATED_AT };
    const remote = { value: { checked: { "2": true } }, updatedAt: OLD };
    const merged = mergeUserState(local, remote, fallback, NOW);
    expect(merged.winner).toBe("remote");
    expect(merged.value).toEqual(remote.value);
    expect(merged.needsUpload).toBe(false);
  });

  it("gives the newer side the win in both directions", () => {
    const older = { value: { checked: { "1": true } }, updatedAt: OLD };
    const newer = { value: { checked: { "2": true } }, updatedAt: NEW };

    expect(mergeUserState(newer, older, fallback, NOW)).toMatchObject({ winner: "local", needsUpload: true });
    expect(mergeUserState(older, newer, fallback, NOW)).toMatchObject({ winner: "remote", needsUpload: false });
  });

  it("gives an exact tie to the server, so nothing is written back", () => {
    const local = { value: { checked: { "1": true } }, updatedAt: NEW };
    const remote = { value: { checked: { "2": true } }, updatedAt: NEW };
    const merged = mergeUserState(local, remote, fallback, NOW);
    expect(merged.winner).toBe("remote");
    expect(merged.needsUpload).toBe(false);
  });
});

describe("parseStoredValue", () => {
  it("treats a value that does not match the schema as absent", () => {
    expect(parseStoredValue({ value: { checked: "not an object" }, updatedAt: NEW }, schema)).toBeNull();
    expect(parseStoredValue(null, schema)).toBeNull();
  });

  it("keeps a valid value and its timestamp", () => {
    expect(parseStoredValue({ value: { checked: { a: true } }, updatedAt: NEW }, schema)).toEqual({
      value: { checked: { a: true } },
      updatedAt: NEW,
    });
  });

  it("falls back to an unknown age when the timestamp is missing or not a string", () => {
    expect(parseStoredValue({ value: { checked: {} }, updatedAt: 1234 }, schema)?.updatedAt).toBe(UNKNOWN_UPDATED_AT);
  });
});

describe("cache entries", () => {
  it("round-trips through serialize/parse", () => {
    const entry = { value: { checked: { a: true } }, updatedAt: NEW };
    expect(parseCacheEntry(serializeCacheEntry(entry), schema)).toEqual(entry);
  });

  it("returns null for missing, corrupt, and schema-violating content", () => {
    expect(parseCacheEntry(null, schema)).toBeNull();
    expect(parseCacheEntry("{not json", schema)).toBeNull();
    expect(parseCacheEntry('"a string"', schema)).toBeNull();
    expect(parseCacheEntry(JSON.stringify({ v: { checked: 5 }, t: NEW }), schema)).toBeNull();
  });
});
