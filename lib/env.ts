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

const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
});

let serverEnv: z.infer<typeof serverEnvSchema> | undefined;

export function getServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() must not be called in the browser");
  }
  if (!serverEnv) {
    serverEnv = parseEnv(serverEnvSchema, {
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
  }
  return serverEnv;
}
