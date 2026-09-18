import { afterEach, describe, expect, it, vi } from "vitest";
import { scheduleIdle } from "@/lib/idle";

describe("scheduleIdle", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("falls back to setTimeout when requestIdleCallback is unavailable", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    scheduleIdle(cb, 1000);

    vi.advanceTimersByTime(999);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("cancelling the fallback timeout prevents it from firing", () => {
    vi.useFakeTimers();
    const cb = vi.fn();
    const cancel = scheduleIdle(cb, 1000);
    cancel();

    vi.advanceTimersByTime(2000);
    expect(cb).not.toHaveBeenCalled();
  });

  it("uses window.requestIdleCallback when available, and cancels via cancelIdleCallback", () => {
    const requestIdleCallback = vi.fn((idleCb: IdleRequestCallback) => {
      idleCb({ didTimeout: false, timeRemaining: () => 0 });
      return 42;
    });
    const cancelIdleCallback = vi.fn();
    vi.stubGlobal("window", { requestIdleCallback, cancelIdleCallback } as unknown as Window & typeof globalThis);

    const cb = vi.fn();
    const cancel = scheduleIdle(cb);

    expect(requestIdleCallback).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledTimes(1);

    cancel();
    expect(cancelIdleCallback).toHaveBeenCalledWith(42);
  });
});
