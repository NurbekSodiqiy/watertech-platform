import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  // Optional and unvalidated as a URL: unset/empty means Sentry is disabled
  // (checked via truthiness in the sentry.*.config.ts files), not an error.
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

function parseEnv<T extends z.ZodRawShape>(schema: z.ZodObject<T>, values: Record<string, string | undefined>) {
  const result = schema.safeParse(values);
  if (!result.success) {
    // Variable names only — never include `values` or the zod issue's
    // `received`, either of which could put a real secret in a log line.
    const missing = result.error.issues.map((issue) => issue.path.join("."));
    throw new Error(`Missing or invalid environment variables: ${missing.join(", ")}`);
  }
  return result.data;
}

export const clientEnv = parseEnv(clientEnvSchema, {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
});

// A blank `KEY=` line in .env arrives as "" rather than undefined — treated as
// unset so an empty placeholder disables Copilot instead of failing validation.
const blankAsUnset = (value: unknown) => (value === "" ? undefined : value);

// Three independent secrets used to live behind one getServerEnv(): a missing
// CRON_SECRET failed the whole parse, which took down SUPABASE_SERVICE_ROLE_KEY
// with it — and with it every content getter in lib/content/loader.ts (they all
// go through createAdminClient()). Each secret below is its own schema, its own
// module-level cache and its own getter, so a problem with one never blocks the
// others.

// Accepts both the legacy Supabase JWT format (`eyJ...`) and the newer
// `sb_secret_...` format — this only bounds length, it does not pin a prefix,
// so either format (or a future one of similar length) validates.
const supabaseServiceEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
});

let supabaseServiceEnv: z.infer<typeof supabaseServiceEnvSchema> | undefined;

/** Server-only. Bypasses RLS — see lib/supabase/admin.ts for the one place
 * this key is used to build a client. */
export function getSupabaseServiceEnv(): z.infer<typeof supabaseServiceEnvSchema> {
  if (typeof window !== "undefined") {
    throw new Error("getSupabaseServiceEnv() must not be called in the browser");
  }
  if (!supabaseServiceEnv) {
    supabaseServiceEnv = parseEnv(supabaseServiceEnvSchema, {
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
  }
  return supabaseServiceEnv;
}

const copilotEnvSchema = z.object({
  // Server-only by construction: never add a NEXT_PUBLIC_ twin or a clientEnv
  // entry. Unset means Copilot is disabled (the route answers 503).
  GEMINI_API_KEY: z.preprocess(blankAsUnset, z.string().min(20).optional()),
  COPILOT_MODEL: z.preprocess(blankAsUnset, z.string().default("gemini-2.5-flash")),
});

let copilotEnv: z.infer<typeof copilotEnvSchema> | undefined;

/** Server-only. `GEMINI_API_KEY` unset is a valid, expected state — callers
 * check for it and answer 503 rather than treating it as a config error. */
export function getCopilotEnv(): z.infer<typeof copilotEnvSchema> {
  if (typeof window !== "undefined") {
    throw new Error("getCopilotEnv() must not be called in the browser");
  }
  if (!copilotEnv) {
    copilotEnv = parseEnv(copilotEnvSchema, {
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      COPILOT_MODEL: process.env.COPILOT_MODEL,
    });
  }
  return copilotEnv;
}

const cronEnvSchema = z.object({
  // Bearer secret for /api/cron/content-scan. Server-only, never NEXT_PUBLIC_.
  CRON_SECRET: z.string().min(32),
});

let cronEnv: z.infer<typeof cronEnvSchema> | undefined;

/** Server-only. */
export function getCronEnv(): z.infer<typeof cronEnvSchema> {
  if (typeof window !== "undefined") {
    throw new Error("getCronEnv() must not be called in the browser");
  }
  if (!cronEnv) {
    cronEnv = parseEnv(cronEnvSchema, {
      CRON_SECRET: process.env.CRON_SECRET,
    });
  }
  return cronEnv;
}

// Build-time escape hatch for lib/content/safe.ts, not a secret: it only
// decides whether a failed content read fails the build or degrades to empty.
// Unset (production, Vercel) means strict. CI sets `allow-empty` because it
// builds against a placeholder Supabase project — see docs/TESTING.md.
export type ContentBuildMode = "strict" | "allow-empty";

/** Not cached, and its schema is built inside the call rather than at module
 * scope: `safeContent` only reads this on a failed read, the parse is a single
 * enum check, and keeping the schema out of the module body keeps it out of
 * the browser bundles that import `clientEnv` from here.
 *
 * `.catch` instead of a hard parse error, deliberately fail-closed: an
 * unreadable value (a typo, a blank `CONTENT_BUILD_MODE=` line) resolves to
 * `strict`, so a misspelled flag can only ever make a build stricter, never
 * silently re-open the empty-knowledge-base hole the guard exists to close.
 * Safe to evaluate anywhere — a browser bundle has no `CONTENT_BUILD_MODE`
 * inlined, which reads as `strict`. */
export function getContentBuildEnv(): { CONTENT_BUILD_MODE: ContentBuildMode } {
  return parseEnv(z.object({ CONTENT_BUILD_MODE: z.enum(["strict", "allow-empty"]).catch("strict") }), {
    CONTENT_BUILD_MODE: process.env.CONTENT_BUILD_MODE,
  });
}
