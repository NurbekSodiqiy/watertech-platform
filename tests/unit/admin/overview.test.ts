import { describe, expect, it } from "vitest";
import type { PersonOverview } from "@/lib/admin/people";
import {
  averagePer,
  displayName,
  hasActivity,
  onboardingPercent,
  overviewDeltas,
  overviewPeople,
  overviewTotals,
  rankPeople,
  toMinutes,
} from "@/lib/admin/overview";

function person(overrides: Partial<PersonOverview> & Pick<PersonOverview, "email">): PersonOverview {
  return {
    fullName: null,
    role: "operator",
    isActive: true,
    addedAt: "2026-09-01T00:00:00.000Z",
    firstSeenAt: null,
    lastSeenAt: null,
    activeMs: 0,
    activeDays: 0,
    sessions: 0,
    contentViews: 0,
    copies: 0,
    searches: 0,
    zeroResultSearches: 0,
    copilotAsks: 0,
    callsLogged: 0,
    checklistCompleted: 0,
    daily: [],
    ...overrides,
  };
}

const CHECKLIST = 20;

const ali = person({ email: "ali@x.uz", fullName: "Ali Valiyev", activeMs: 3_600_000, activeDays: 3, contentViews: 10, copies: 4, checklistCompleted: 10 });
const vali = person({ email: "vali@x.uz", role: "manager", activeMs: 1_800_000, activeDays: 1, contentViews: 5, copies: 1, checklistCompleted: 5 });
const idle = person({ email: "idle@x.uz" });
const owner = person({ email: "owner@x.uz", role: "admin" });
const gone = person({ email: "gone@x.uz", isActive: false });
const goneButActive = person({ email: "left@x.uz", isActive: false, activeMs: 600_000, activeDays: 1 });

describe("overviewPeople", () => {
  it("keeps operators and managers, never the admin", () => {
    expect(overviewPeople([ali, vali, owner]).map((p) => p.email)).toEqual(["ali@x.uz", "vali@x.uz"]);
  });

  it("drops a deactivated person unless they were active in the window", () => {
    expect(overviewPeople([gone, goneButActive, idle]).map((p) => p.email)).toEqual(["left@x.uz", "idle@x.uz"]);
  });
});

describe("onboardingPercent", () => {
  it("is completed / total, capped at 100, null without a checklist", () => {
    expect(onboardingPercent({ checklistCompleted: 5 }, 20)).toBe(25);
    expect(onboardingPercent({ checklistCompleted: 25 }, 20)).toBe(100);
    expect(onboardingPercent({ checklistCompleted: 5 }, 0)).toBeNull();
  });
});

describe("overviewTotals", () => {
  it("sums the reported people only and counts who was active", () => {
    const totals = overviewTotals([ali, vali, idle, owner, gone], CHECKLIST);
    expect(totals).toEqual({
      people: 3,
      activePeople: 2,
      activeMs: 5_400_000,
      contentViews: 15,
      copies: 5,
      // (50 + 25 + 0) / 3 = 25
      onboardingAverage: 25,
    });
  });

  it("has no onboarding average with nobody to average", () => {
    expect(overviewTotals([owner], CHECKLIST)).toMatchObject({ people: 0, activePeople: 0, onboardingAverage: null });
  });
});

describe("overviewDeltas", () => {
  const current = overviewTotals([ali, vali, idle], CHECKLIST);

  it("is null everywhere without a previous window", () => {
    expect(overviewDeltas(current, null)).toEqual({
      activePeople: null,
      activeMs: null,
      contentViews: null,
      copies: null,
      onboardingAverage: null,
    });
  });

  it("gives people as a count, volumes in %, onboarding in points", () => {
    const previous = overviewTotals(
      [person({ email: "ali@x.uz", activeMs: 2_700_000, activeDays: 2, contentViews: 15, copies: 5, checklistCompleted: 2 }), vali, idle],
      CHECKLIST
    );
    // previous: 2 active, 4.5 h, 20 views, 6 copies, onboarding (10 + 25 + 0) / 3 = 12
    expect(overviewDeltas(current, previous)).toEqual({
      activePeople: 0,
      activeMs: 20,
      contentViews: -25,
      copies: -17,
      onboardingAverage: 13,
    });
  });

  it("has no % change against a zero previous window", () => {
    const previous = overviewTotals([idle], CHECKLIST);
    expect(overviewDeltas(current, previous)).toMatchObject({ activePeople: 2, activeMs: null, contentViews: null });
  });
});

describe("helpers", () => {
  it("averagePer rounds and refuses to divide by nobody", () => {
    expect(averagePer(10, 3)).toBe(3);
    expect(averagePer(10, 0)).toBeNull();
  });

  it("hasActivity looks for any active day", () => {
    expect(hasActivity([idle, gone])).toBe(false);
    expect(hasActivity([idle, vali])).toBe(true);
  });

  it("rankPeople sorts by score, ties by name, without mutating", () => {
    const tied = person({ email: "aziz@x.uz", activeMs: 1_800_000 });
    const input = [vali, idle, tied, ali];
    expect(rankPeople(input, (p) => p.activeMs).map((p) => p.email)).toEqual([
      "ali@x.uz",
      "aziz@x.uz",
      "vali@x.uz",
      "idle@x.uz",
    ]);
    expect(input[0]).toBe(vali);
  });

  it("displayName prefers the full name, else the email", () => {
    expect(displayName(ali)).toBe("Ali Valiyev");
    expect(displayName(vali)).toBe("vali@x.uz");
    expect(displayName(person({ email: "b@x.uz", fullName: "   " }))).toBe("b@x.uz");
  });

  it("toMinutes rounds to whole minutes", () => {
    expect(toMinutes(89_000)).toBe(1);
    expect(toMinutes(91_000)).toBe(2);
  });
});
