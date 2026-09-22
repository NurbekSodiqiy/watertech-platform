import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// lib/env.ts parses `clientEnv` eagerly at module load time, so every test
// here — even ones only exercising a server-side getter — must supply valid
// client vars before importing it. Each test calls `loadEnv()`, which resets
// the module registry first: lib/env.ts's per-secret caches
// (`supabaseServiceEnv`, `copilotEnv`, `cronEnv`) are module-scoped, so a
// fresh import is the only way to get an unparsed getter to test against.
const VALID_CLIENT_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-anon-key-anon-key",
};

const VALID_SERVICE_KEY = "service-role-key-service-role-key"; // 34 chars, >= 20
const VALID_GEMINI_KEY = "gemini-api-key-gemini-key"; // >= 20
const VALID_CRON_SECRET = "cron-secret-cron-secret-cron-secret-32plus"; // >= 32

type EnvModule = typeof import("@/lib/env");

async function loadEnv(vars: Record<string, string | undefined>): Promise<EnvModule> {
  for (const [key, value] of Object.entries({ ...VALID_CLIENT_ENV, ...vars })) {
    if (value === undefined) {
      vi.stubEnv(key, "");
      delete process.env[key];
    } else {
      vi.stubEnv(key, value);
    }
  }
  vi.resetModules();
  return import("@/lib/env");
}

beforeEach(() => {
  // Start from a clean slate: no leftover real .env.local values should leak
  // into a test that means to exercise a "missing" case.
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.COPILOT_MODEL;
  delete process.env.CRON_SECRET;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("getSupabaseServiceEnv", () => {
  it("succeeds on a legacy-JWT-shaped key regardless of CRON_SECRET", async () => {
    const env = await loadEnv({ SUPABASE_SERVICE_ROLE_KEY: VALID_SERVICE_KEY, CRON_SECRET: undefined });
    expect(env.getSupabaseServiceEnv()).toEqual({ SUPABASE_SERVICE_ROLE_KEY: VALID_SERVICE_KEY });
  });

  it("succeeds on an sb_secret_ shaped key", async () => {
    const key = "sb_secret_abcdefghijklmnop";
    const env = await loadEnv({ SUPABASE_SERVICE_ROLE_KEY: key });
    expect(env.getSupabaseServiceEnv()).toEqual({ SUPABASE_SERVICE_ROLE_KEY: key });
  });

  it("fails when the key is too short, without mentioning its value", async () => {
    const shortSecret = "too-short-value";
    const env = await loadEnv({ SUPABASE_SERVICE_ROLE_KEY: shortSecret });
    expect(() => env.getSupabaseServiceEnv()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
    try {
      env.getSupabaseServiceEnv();
      expect.unreachable();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain(shortSecret);
    }
  });

  it("is unaffected by a missing/invalid CRON_SECRET", async () => {
    const env = await loadEnv({ SUPABASE_SERVICE_ROLE_KEY: VALID_SERVICE_KEY, CRON_SECRET: "short" });
    expect(env.getSupabaseServiceEnv()).toEqual({ SUPABASE_SERVICE_ROLE_KEY: VALID_SERVICE_KEY });
    expect(() => env.getCronEnv()).toThrow();
  });

  it("caches the parsed value across calls", async () => {
    const env = await loadEnv({ SUPABASE_SERVICE_ROLE_KEY: VALID_SERVICE_KEY });
    const first = env.getSupabaseServiceEnv();
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "a-different-service-role-key-value");
    const second = env.getSupabaseServiceEnv();
    expect(second).toBe(first);
    expect(second.SUPABASE_SERVICE_ROLE_KEY).toBe(VALID_SERVICE_KEY);
  });

  it("throws when called in a browser context", async () => {
    const env = await loadEnv({ SUPABASE_SERVICE_ROLE_KEY: VALID_SERVICE_KEY });
    vi.stubGlobal("window", {});
    expect(() => env.getSupabaseServiceEnv()).toThrow(/browser/);
  });
});

describe("getCopilotEnv", () => {
  it("succeeds with a valid key regardless of CRON_SECRET or the service key", async () => {
    const env = await loadEnv({ GEMINI_API_KEY: VALID_GEMINI_KEY, CRON_SECRET: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined });
    expect(env.getCopilotEnv()).toEqual({ GEMINI_API_KEY: VALID_GEMINI_KEY, COPILOT_MODEL: "gemini-2.5-flash" });
  });

  it("treats an unset key as disabled rather than an error", async () => {
    const env = await loadEnv({ GEMINI_API_KEY: undefined });
    expect(env.getCopilotEnv()).toEqual({ GEMINI_API_KEY: undefined, COPILOT_MODEL: "gemini-2.5-flash" });
  });

  it("treats a blank key the same as unset", async () => {
    const env = await loadEnv({ GEMINI_API_KEY: "" });
    expect(env.getCopilotEnv().GEMINI_API_KEY).toBeUndefined();
  });

  it("honors a custom COPILOT_MODEL and falls back on blank", async () => {
    const withModel = await loadEnv({ COPILOT_MODEL: "gemini-1.5-pro" });
    expect(withModel.getCopilotEnv().COPILOT_MODEL).toBe("gemini-1.5-pro");

    const blankModel = await loadEnv({ COPILOT_MODEL: "" });
    expect(blankModel.getCopilotEnv().COPILOT_MODEL).toBe("gemini-2.5-flash");
  });

  it("fails when set but too short, without mentioning its value", async () => {
    const shortKey = "short-key-value";
    const env = await loadEnv({ GEMINI_API_KEY: shortKey });
    try {
      env.getCopilotEnv();
      expect.unreachable();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain("GEMINI_API_KEY");
      expect(message).not.toContain(shortKey);
    }
  });

  it("is unaffected by a missing/invalid CRON_SECRET", async () => {
    const env = await loadEnv({ GEMINI_API_KEY: VALID_GEMINI_KEY, CRON_SECRET: undefined });
    expect(env.getCopilotEnv().GEMINI_API_KEY).toBe(VALID_GEMINI_KEY);
    expect(() => env.getCronEnv()).toThrow();
  });

  it("caches the parsed value across calls", async () => {
    const env = await loadEnv({ GEMINI_API_KEY: VALID_GEMINI_KEY });
    const first = env.getCopilotEnv();
    vi.stubEnv("GEMINI_API_KEY", "a-totally-different-key-value");
    expect(env.getCopilotEnv()).toBe(first);
  });

  it("throws when called in a browser context", async () => {
    const env = await loadEnv({ GEMINI_API_KEY: VALID_GEMINI_KEY });
    vi.stubGlobal("window", {});
    expect(() => env.getCopilotEnv()).toThrow(/browser/);
  });
});

describe("getCronEnv", () => {
  it("succeeds with a >=32 char secret regardless of the other secrets", async () => {
    const env = await loadEnv({
      CRON_SECRET: VALID_CRON_SECRET,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      GEMINI_API_KEY: undefined,
    });
    expect(env.getCronEnv()).toEqual({ CRON_SECRET: VALID_CRON_SECRET });
  });

  it("fails when missing, without breaking the other two getters", async () => {
    const env = await loadEnv({
      CRON_SECRET: undefined,
      SUPABASE_SERVICE_ROLE_KEY: VALID_SERVICE_KEY,
      GEMINI_API_KEY: VALID_GEMINI_KEY,
    });
    expect(() => env.getCronEnv()).toThrow(/CRON_SECRET/);
    expect(env.getSupabaseServiceEnv()).toEqual({ SUPABASE_SERVICE_ROLE_KEY: VALID_SERVICE_KEY });
    expect(env.getCopilotEnv().GEMINI_API_KEY).toBe(VALID_GEMINI_KEY);
  });

  it("fails when shorter than 32 chars, without mentioning its value", async () => {
    const shortSecret = "only-24-characters-long!"; // < 32 chars, human-readable
    const env = await loadEnv({ CRON_SECRET: shortSecret });
    try {
      env.getCronEnv();
      expect.unreachable();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).toContain("CRON_SECRET");
      expect(message).not.toContain(shortSecret);
    }
  });

  it("caches the parsed value across calls", async () => {
    const env = await loadEnv({ CRON_SECRET: VALID_CRON_SECRET });
    const first = env.getCronEnv();
    vi.stubEnv("CRON_SECRET", "a-different-cron-secret-that-is-also-32-chars-plus");
    expect(env.getCronEnv()).toBe(first);
  });

  it("throws when called in a browser context", async () => {
    const env = await loadEnv({ CRON_SECRET: VALID_CRON_SECRET });
    vi.stubGlobal("window", {});
    expect(() => env.getCronEnv()).toThrow(/browser/);
  });
});
