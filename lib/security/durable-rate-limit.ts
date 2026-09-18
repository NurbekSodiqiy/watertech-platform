import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Cross-instance fixed-window limiter backed by public.rate_limit_hit()
 * (supabase/migrations/0008_rate_limits.sql). Use it for endpoints where an
 * unenforced limit costs money; lib/security/rate-limit.ts stays the cheap
 * per-instance first layer in front of it.
 *
 * Returns true when this hit is within the limit. Throws when the check
 * itself fails — callers decide whether to fail open or closed. */
export async function durableRateLimitHit(key: string, opts: { limit: number; windowSeconds: number }): Promise<boolean> {
  // Admin client: rate_limit_hit is executable by service_role only, so
  // callers can't reset or inspect their own counters with their session.
  const { data, error } = await createAdminClient().rpc("rate_limit_hit", {
    p_key: key,
    p_limit: opts.limit,
    p_window_seconds: opts.windowSeconds,
  });
  if (error) throw new Error(`rate_limit_hit failed: ${error.message}`);
  if (typeof data !== "boolean") throw new Error("rate_limit_hit returned a non-boolean");
  return data;
}
