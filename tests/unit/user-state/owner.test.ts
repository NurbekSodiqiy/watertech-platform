import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  deriveOwnerId,
  isLegacyStorageKey,
  isOwnerId,
  legacyStorageKeys,
  OWNER_ID_LENGTH,
  ownerBufferKey,
  ownerCacheKey,
  ownerCachePrefix,
  ownerQueueKey,
  parseOwnerCacheKey,
  parseOwnerQueueKey,
  purgeableStorageKeys,
  USER_STATE_QUEUE_KEY,
} from "@/lib/user-state/owner";
import {
  LEGACY_DAILY_CALLCOUNT_PREFIX,
  LEGACY_DAILY_CHECKLIST_PREFIX,
  LEGACY_ONBOARDING_KEY,
  LEGACY_OWNER_MARKER_KEY,
  LEGACY_SCRIPT_KEY,
} from "@/lib/user-state/legacy";

/** Independent reference: the same digest computed with node's crypto. */
function expectedOwnerId(email: string): string {
  return createHash("sha256").update(email).digest("hex").slice(0, OWNER_ID_LENGTH);
}

const A = expectedOwnerId("operator.a@watertech.uz");
const B = expectedOwnerId("operator.b@watertech.uz");
const TELEMETRY_BUFFER = "wt-events-buffer";

describe("deriveOwnerId", () => {
  it("is the first 16 hex chars of SHA-256 over the address", async () => {
    await expect(deriveOwnerId("operator.a@watertech.uz")).resolves.toBe(A);
    expect(A).toHaveLength(16);
    expect(isOwnerId(A)).toBe(true);
  });

  it("normalises case and surrounding whitespace, so one account is one namespace", async () => {
    await expect(deriveOwnerId("  Operator.A@WaterTech.UZ  ")).resolves.toBe(A);
  });

  it("tells two accounts apart", async () => {
    expect(A).not.toBe(B);
  });

  it("is null for anything that is not an address — the fail-closed answer", async () => {
    await expect(deriveOwnerId(null)).resolves.toBeNull();
    await expect(deriveOwnerId(undefined)).resolves.toBeNull();
    await expect(deriveOwnerId("")).resolves.toBeNull();
    await expect(deriveOwnerId("   ")).resolves.toBeNull();
  });

  it("rejects anything that is not 16 lowercase hex characters as an owner id", () => {
    expect(isOwnerId(A.toUpperCase())).toBe(false);
    expect(isOwnerId(A.slice(0, 15))).toBe(false);
    expect(isOwnerId(`${A}0`)).toBe(false);
    expect(isOwnerId("pins")).toBe(false);
    expect(isOwnerId(null)).toBe(false);
  });
});

describe("namespaced keys", () => {
  it("scopes every cache key and the queue to the owner", () => {
    expect(ownerCachePrefix(A)).toBe(`wt-us:${A}:`);
    expect(ownerCacheKey(A, "pins")).toBe(`wt-us:${A}:pins`);
    expect(ownerQueueKey(A)).toBe(`wt-us-queue:${A}`);
    expect(ownerBufferKey(TELEMETRY_BUFFER, A)).toBe(`wt-events-buffer:${A}`);
  });

  it("gives two accounts disjoint keys for the same user_state key", () => {
    expect(ownerCacheKey(A, "pins")).not.toBe(ownerCacheKey(B, "pins"));
    expect(ownerQueueKey(A)).not.toBe(ownerQueueKey(B));
    expect(ownerBufferKey(TELEMETRY_BUFFER, A)).not.toBe(ownerBufferKey(TELEMETRY_BUFFER, B));
  });

  it("round-trips a cache key back to its owner and key", () => {
    expect(parseOwnerCacheKey(ownerCacheKey(A, "daily.2026-09-22"))).toEqual({ ownerId: A, key: "daily.2026-09-22" });
    expect(parseOwnerQueueKey(ownerQueueKey(B))).toBe(B);
  });

  it("never reads a pre-namespacing key as a namespaced one", () => {
    expect(parseOwnerCacheKey("wt-us:pins")).toBeNull();
    expect(parseOwnerCacheKey("wt-us:daily.2026-09-22")).toBeNull();
    expect(parseOwnerCacheKey(`wt-us:${A}:`)).toBeNull();
    expect(parseOwnerCacheKey("wt-us:notanownerid:pins")).toBeNull();
    expect(parseOwnerCacheKey("watertech-theme")).toBeNull();
    expect(parseOwnerQueueKey(USER_STATE_QUEUE_KEY)).toBeNull();
    expect(parseOwnerQueueKey("wt-us-queue:nope")).toBeNull();
  });
});

describe("isLegacyStorageKey", () => {
  it("covers every un-namespaced family", () => {
    expect(isLegacyStorageKey("wt-us:pins")).toBe(true);
    expect(isLegacyStorageKey(USER_STATE_QUEUE_KEY)).toBe(true);
    expect(isLegacyStorageKey(LEGACY_ONBOARDING_KEY)).toBe(true);
    expect(isLegacyStorageKey(LEGACY_SCRIPT_KEY)).toBe(true);
    expect(isLegacyStorageKey(`${LEGACY_DAILY_CHECKLIST_PREFIX}2026-09-22`)).toBe(true);
    expect(isLegacyStorageKey(`${LEGACY_DAILY_CALLCOUNT_PREFIX}2026-09-22`)).toBe(true);
  });

  it("leaves namespaced entries and unrelated keys alone", () => {
    expect(isLegacyStorageKey(ownerCacheKey(A, "pins"))).toBe(false);
    expect(isLegacyStorageKey(ownerQueueKey(A))).toBe(false);
    expect(isLegacyStorageKey("watertech-theme")).toBe(false);
    expect(isLegacyStorageKey(LEGACY_DAILY_CHECKLIST_PREFIX)).toBe(false);
  });

  it("collects only the legacy keys out of a mixed storage", () => {
    const all = [ownerCacheKey(A, "pins"), "wt-us:pins", USER_STATE_QUEUE_KEY, "watertech-theme", LEGACY_SCRIPT_KEY];
    expect(legacyStorageKeys(all)).toEqual(["wt-us:pins", USER_STATE_QUEUE_KEY, LEGACY_SCRIPT_KEY]);
  });
});

describe("purgeableStorageKeys", () => {
  const all = [
    ownerCacheKey(A, "pins"),
    ownerCacheKey(A, "recents"),
    ownerQueueKey(A),
    ownerBufferKey(TELEMETRY_BUFFER, A),
    ownerCacheKey(B, "pins"),
    ownerQueueKey(B),
    ownerBufferKey(TELEMETRY_BUFFER, B),
    "wt-us:pins",
    USER_STATE_QUEUE_KEY,
    TELEMETRY_BUFFER,
    LEGACY_OWNER_MARKER_KEY,
    LEGACY_ONBOARDING_KEY,
    `${LEGACY_DAILY_CHECKLIST_PREFIX}2026-09-22`,
    "watertech-theme",
    "wt-session-id",
  ];

  it("takes the signing-out owner's entries and every un-namespaced one", () => {
    const purged = purgeableStorageKeys(all, A, [TELEMETRY_BUFFER]);

    expect(purged).toContain(ownerCacheKey(A, "pins"));
    expect(purged).toContain(ownerCacheKey(A, "recents"));
    expect(purged).toContain(ownerQueueKey(A));
    expect(purged).toContain(ownerBufferKey(TELEMETRY_BUFFER, A));
    expect(purged).toContain("wt-us:pins");
    expect(purged).toContain(USER_STATE_QUEUE_KEY);
    expect(purged).toContain(TELEMETRY_BUFFER);
    expect(purged).toContain(LEGACY_OWNER_MARKER_KEY);
    expect(purged).toContain(LEGACY_ONBOARDING_KEY);
    expect(purged).toContain(`${LEGACY_DAILY_CHECKLIST_PREFIX}2026-09-22`);
  });

  it("leaves the other operator's namespaced entries and their queued writes", () => {
    const purged = purgeableStorageKeys(all, A, [TELEMETRY_BUFFER]);

    expect(purged).not.toContain(ownerCacheKey(B, "pins"));
    expect(purged).not.toContain(ownerQueueKey(B));
    expect(purged).not.toContain(ownerBufferKey(TELEMETRY_BUFFER, B));
  });

  it("leaves keys that are not account data", () => {
    const purged = purgeableStorageKeys(all, A, [TELEMETRY_BUFFER]);
    expect(purged).not.toContain("watertech-theme");
    expect(purged).not.toContain("wt-session-id");
  });

  it("widens to every account when the signing-out owner cannot be identified", () => {
    const purged = purgeableStorageKeys(all, null, [TELEMETRY_BUFFER]);

    expect(purged).toContain(ownerCacheKey(A, "pins"));
    expect(purged).toContain(ownerCacheKey(B, "pins"));
    expect(purged).toContain(ownerQueueKey(B));
    expect(purged).toContain(ownerBufferKey(TELEMETRY_BUFFER, B));
    expect(purged).not.toContain("watertech-theme");
  });

  it("ignores buffer bases that were not named", () => {
    const purged = purgeableStorageKeys(all, A);
    expect(purged).not.toContain(ownerBufferKey(TELEMETRY_BUFFER, A));
    expect(purged).not.toContain(TELEMETRY_BUFFER);
  });
});
