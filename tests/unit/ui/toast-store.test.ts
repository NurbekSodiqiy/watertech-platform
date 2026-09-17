import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// toast-store keeps its list and timers in module scope, so each test imports
// a fresh copy of the module instead of sharing state across tests.
type ToastStore = typeof import("@/components/ui/toast-store");

let store: ToastStore;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  store = await import("@/components/ui/toast-store");
});

afterEach(() => {
  vi.useRealTimers();
});

function titles(): string[] {
  return store.getSnapshot().map((t) => t.title);
}

describe("toast-store", () => {
  it("keeps at most 3 toasts visible, dropping the oldest first", () => {
    for (const title of ["1", "2", "3", "4", "5"]) store.toast({ kind: "info", title });

    expect(titles()).toEqual(["3", "4", "5"]);
    // Timers of dropped toasts are cleared too, not left to fire later.
    expect(vi.getTimerCount()).toBe(3);
  });

  it("auto-dismisses success/info after 4 s", () => {
    store.toast({ kind: "success", title: "Saqlandi" });

    vi.advanceTimersByTime(3999);
    expect(titles()).toEqual(["Saqlandi"]);
    vi.advanceTimersByTime(1);
    expect(titles()).toEqual([]);
  });

  it("keeps errors up longer: 7 s", () => {
    store.toast({ kind: "error", title: "Xatolik" });

    vi.advanceTimersByTime(6999);
    expect(titles()).toEqual(["Xatolik"]);
    vi.advanceTimersByTime(1);
    expect(titles()).toEqual([]);
  });

  it("honours a custom duration, and never auto-dismisses with durationMs 0", () => {
    store.toast({ kind: "info", title: "Tez", durationMs: 1000 });
    store.toast({ kind: "error", title: "Doimiy", durationMs: 0 });

    vi.advanceTimersByTime(1000);
    expect(titles()).toEqual(["Doimiy"]);
    vi.advanceTimersByTime(60_000);
    expect(titles()).toEqual(["Doimiy"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("each toast's timer is independent of the ones around it", () => {
    store.toast({ kind: "info", title: "A", durationMs: 1000 });
    vi.advanceTimersByTime(500);
    store.toast({ kind: "info", title: "B", durationMs: 1000 });

    vi.advanceTimersByTime(500);
    expect(titles()).toEqual(["B"]);
    vi.advanceTimersByTime(500);
    expect(titles()).toEqual([]);
  });

  it("dismiss(id) removes that toast, clears its timer and notifies subscribers", () => {
    const listener = vi.fn();
    store.subscribe(listener);
    const first = store.toast({ kind: "info", title: "Birinchi" });
    store.toast({ kind: "info", title: "Ikkinchi" });
    listener.mockClear();

    store.dismiss(first);

    expect(titles()).toEqual(["Ikkinchi"]);
    expect(vi.getTimerCount()).toBe(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("dismiss of an unknown or already-dismissed id is a silent no-op", () => {
    const listener = vi.fn();
    const id = store.toast({ kind: "info", title: "Bir marta" });
    store.dismiss(id);
    store.subscribe(listener);

    store.dismiss(id);
    store.dismiss("toast-404");

    expect(listener).not.toHaveBeenCalled();
    expect(titles()).toEqual([]);
  });

  it("returns unique ids and stops notifying after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const a = store.toast({ kind: "info", title: "A" });
    const b = store.toast({ kind: "info", title: "B" });
    expect(a).not.toBe(b);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    store.toast({ kind: "info", title: "C" });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("renders nothing on the server", () => {
    store.toast({ kind: "info", title: "Faqat mijozda" });
    expect(store.getServerSnapshot()).toEqual([]);
  });
});
