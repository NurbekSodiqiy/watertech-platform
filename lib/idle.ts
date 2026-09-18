/** Schedules `cb` for the browser's next idle period, falling back to a
 * timeout in browsers without `requestIdleCallback` (Safari). Hides the two
 * APIs' differing handle types behind a single cancel function instead of
 * making every call site juggle both. */
export function scheduleIdle(cb: () => void, fallbackMs = 1500): () => void {
  if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(cb);
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(cb, fallbackMs);
  return () => clearTimeout(id);
}
