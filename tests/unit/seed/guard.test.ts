import { describe, expect, it } from "vitest";
import {
  checkSeedTarget,
  formatPlan,
  parseProdRefs,
  parseProjectRef,
  parseSeedFlags,
  type SeedEnv,
} from "@/supabase/seed/guard";

const STAGING_URL = "https://stagingref1234.supabase.co";
const PROD_REF = "prodref9876";
const PROD_URL = `https://${PROD_REF}.supabase.co`;

function env(patch: Partial<SeedEnv> = {}): SeedEnv {
  return {
    SEED_TARGET: "staging",
    NEXT_PUBLIC_SUPABASE_URL: STAGING_URL,
    PROD_PROJECT_REFS: PROD_REF,
    ...patch,
  };
}

describe("parseProjectRef", () => {
  it("reads the subdomain of a hosted project URL", () => {
    expect(parseProjectRef(PROD_URL)).toEqual({ kind: "hosted", ref: PROD_REF });
    expect(parseProjectRef("https://ABCDEF.supabase.in/rest/v1")).toEqual({ kind: "hosted", ref: "abcdef" });
  });

  it("recognises a local supabase stack", () => {
    expect(parseProjectRef("http://127.0.0.1:54321")).toEqual({ kind: "local" });
    expect(parseProjectRef("http://localhost:54321")).toEqual({ kind: "local" });
  });

  it("reports anything it cannot resolve to a ref as unknown", () => {
    expect(parseProjectRef(undefined)).toEqual({ kind: "unknown", host: "" });
    expect(parseProjectRef("not a url")).toEqual({ kind: "unknown", host: "not a url" });
    expect(parseProjectRef("https://db.example.com")).toEqual({ kind: "unknown", host: "db.example.com" });
    expect(parseProjectRef("https://supabase.co")).toEqual({ kind: "unknown", host: "supabase.co" });
    // A deeper host is not a project ref — "db.prod" must never read as "db".
    expect(parseProjectRef("https://db.prodref9876.supabase.co")).toEqual({
      kind: "unknown",
      host: "db.prodref9876.supabase.co",
    });
  });
});

describe("parseProdRefs", () => {
  it("splits on commas, trims, lowercases and drops blanks", () => {
    expect(parseProdRefs(" abc , DEF,,ghi ")).toEqual(new Set(["abc", "def", "ghi"]));
  });

  it("is empty for unset or blank", () => {
    expect(parseProdRefs(undefined).size).toBe(0);
    expect(parseProdRefs("  ,  ").size).toBe(0);
  });
});

describe("checkSeedTarget", () => {
  it("allows a staging project that is not listed as production", () => {
    expect(checkSeedTarget(env())).toEqual({ ok: true, project: { kind: "hosted", ref: "stagingref1234" } });
  });

  it("allows a local stack without consulting PROD_PROJECT_REFS", () => {
    const result = checkSeedTarget(env({ NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321", PROD_PROJECT_REFS: "" }));
    expect(result).toEqual({ ok: true, project: { kind: "local" } });
  });

  it("blocks a project ref listed in PROD_PROJECT_REFS", () => {
    const result = checkSeedTarget(env({ NEXT_PUBLIC_SUPABASE_URL: PROD_URL }));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("PROD_PROJECT_REFS");
  });

  it("blocks it whatever the case or spacing of the list", () => {
    const result = checkSeedTarget(
      env({ NEXT_PUBLIC_SUPABASE_URL: PROD_URL, PROD_PROJECT_REFS: ` other , ${PROD_REF.toUpperCase()} ` })
    );
    expect(result.ok).toBe(false);
  });

  it("blocks a missing SEED_TARGET", () => {
    const result = checkSeedTarget(env({ SEED_TARGET: undefined }));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("unset");
  });

  it("blocks any SEED_TARGET other than staging", () => {
    for (const target of ["production", "prod", "", "stagin"]) {
      expect(checkSeedTarget(env({ SEED_TARGET: target })).ok).toBe(false);
    }
  });

  it("accepts SEED_TARGET with stray case and whitespace", () => {
    expect(checkSeedTarget(env({ SEED_TARGET: " Staging " })).ok).toBe(true);
  });

  it("blocks a hosted project when PROD_PROJECT_REFS is empty — it cannot be checked", () => {
    const result = checkSeedTarget(env({ PROD_PROJECT_REFS: undefined }));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("PROD_PROJECT_REFS is empty");
  });

  it("blocks an unrecognised host rather than assuming it is safe", () => {
    const result = checkSeedTarget(env({ NEXT_PUBLIC_SUPABASE_URL: "https://db.example.com" }));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toContain("db.example.com");
  });

  it("blocks a missing NEXT_PUBLIC_SUPABASE_URL", () => {
    expect(checkSeedTarget(env({ NEXT_PUBLIC_SUPABASE_URL: undefined })).ok).toBe(false);
  });
});

describe("parseSeedFlags", () => {
  it("defaults to a real, insert-only run", () => {
    expect(parseSeedFlags([])).toEqual({ dryRun: false, force: false });
  });

  it("reads --dry-run and --force, in any order and together", () => {
    expect(parseSeedFlags(["--dry-run"])).toEqual({ dryRun: true, force: false });
    expect(parseSeedFlags(["--force"])).toEqual({ dryRun: false, force: true });
    expect(parseSeedFlags(["--force", "--dry-run"])).toEqual({ dryRun: true, force: true });
  });

  it("refuses an unknown argument instead of ignoring it", () => {
    expect(() => parseSeedFlags(["--forse"])).toThrow(/Unknown argument/);
    expect(() => parseSeedFlags(["--dry_run"])).toThrow(/Unknown argument/);
    expect(() => parseSeedFlags(["-f"])).toThrow(/Unknown argument/);
  });
});

describe("formatPlan", () => {
  const plans = [
    { table: "content_scripts", insert: 3, existing: 1 },
    { table: "content_faqs", insert: 0, existing: 12 },
  ];

  it("says what a dry run would do, per table and in total", () => {
    const text = formatPlan(plans, { dryRun: true, force: false });
    expect(text).toContain("insert-only: existing rows untouched");
    expect(text).toContain("content_scripts");
    expect(text).toMatch(/would insert\s+3, would skip\s+1/);
    expect(text).toMatch(/TOTAL\s+would insert\s+3, would skip\s+13/);
  });

  it("says rows will be overwritten under --force", () => {
    const text = formatPlan(plans, { dryRun: false, force: true });
    expect(text).toContain("--force: existing rows overwritten");
    expect(text).toMatch(/will insert\s+3, will overwrite\s+1/);
  });
});
