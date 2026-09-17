/** Thrown by the dev-only content validation (validateContentBundle). It is the
 * one error safeContent never swallows — a content typo must still fail loudly
 * in dev/CI; that check never runs in production. */
export class ContentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContentValidationError";
  }
}

/** Runs a content read and degrades to `fallback` on failure, so a Supabase
 * outage renders empty sections instead of a 500. The fallback is returned
 * from outside any unstable_cache callback (fn itself still throws), so a
 * failed read is never cached. */
export async function safeContent<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ContentValidationError) throw error;
    console.error(`[content:${label}]`, error instanceof Error ? error.message : String(error));
    return fallback;
  }
}
