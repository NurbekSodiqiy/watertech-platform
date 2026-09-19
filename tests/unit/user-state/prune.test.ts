import { describe, expect, it } from "vitest";
import { DAILY_KEEP_DAYS, dailyCutoffDay, dailyCutoffKey, staleDailyKeys } from "@/lib/user-state/prune";

describe("dailyCutoffDay", () => {
  it("keeps exactly DAILY_KEEP_DAYS days, today included", () => {
    expect(dailyCutoffDay("2026-09-19")).toBe("2026-09-06");
    expect(DAILY_KEEP_DAYS).toBe(14);
  });

  it("crosses month and year boundaries", () => {
    expect(dailyCutoffDay("2026-03-05")).toBe("2026-02-20");
    expect(dailyCutoffDay("2026-01-07")).toBe("2025-12-25");
  });

  it("handles a leap day without shifting", () => {
    expect(dailyCutoffDay("2028-03-01")).toBe("2028-02-17");
  });

  it("leaves an unparseable day alone rather than pruning everything", () => {
    expect(dailyCutoffDay("not-a-day")).toBe("not-a-day");
  });

  it("prefixes the cutoff key with the daily family", () => {
    expect(dailyCutoffKey("2026-09-19")).toBe("daily.2026-09-06");
  });
});

describe("staleDailyKeys", () => {
  const keys = [
    "daily.2026-09-19",
    "daily.2026-09-06",
    "daily.2026-09-05",
    "daily.2025-12-31",
    "onboarding.v2",
    "scripts.position",
    "pins",
    "daily.whenever",
  ];

  it("returns only daily keys older than the kept window", () => {
    expect(staleDailyKeys(keys, "2026-09-19")).toEqual(["daily.2026-09-05", "daily.2025-12-31"]);
  });

  it("keeps today and the oldest kept day", () => {
    const stale = staleDailyKeys(keys, "2026-09-19");
    expect(stale).not.toContain("daily.2026-09-19");
    expect(stale).not.toContain("daily.2026-09-06");
  });

  it("never touches other key families, or a daily key that is not a date", () => {
    const stale = staleDailyKeys(keys, "2026-09-19");
    expect(stale).not.toContain("onboarding.v2");
    expect(stale).not.toContain("scripts.position");
    expect(stale).not.toContain("pins");
    expect(stale).not.toContain("daily.whenever");
  });

  it("honours a custom window", () => {
    expect(staleDailyKeys(["daily.2026-09-19", "daily.2026-09-18"], "2026-09-19", 1)).toEqual(["daily.2026-09-18"]);
  });
});
