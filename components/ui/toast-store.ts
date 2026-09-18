/** Tiny external store (useSyncExternalStore-compatible) for app-wide toast
 * notifications — no library, since framer-motion in Toaster.tsx already
 * covers the animation and this list never needs more than a subscribe/
 * snapshot pair. hooks/useToast.ts is the only supported way components fire
 * a toast; Toaster.tsx is the only place that reads the list back. */

export type ToastKind = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastInput {
  kind: ToastKind;
  title: string;
  description?: string;
  durationMs?: number;
  action?: ToastAction;
}

export interface ToastItem extends ToastInput {
  id: string;
}

const MAX_VISIBLE = 3;
const DEFAULT_DURATION_MS = 4000;
const ERROR_DURATION_MS = 7000;

let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let nextId = 0;

function emit(): void {
  listeners.forEach((listener) => listener());
}

function clearTimer(id: string): void {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
}

export function dismiss(id: string): void {
  if (!toasts.some((t) => t.id === id)) return;
  clearTimer(id);
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function toast(input: ToastInput): string {
  const id = `toast-${++nextId}`;
  const durationMs = input.durationMs ?? (input.kind === "error" ? ERROR_DURATION_MS : DEFAULT_DURATION_MS);

  toasts = [...toasts, { ...input, id }];
  while (toasts.length > MAX_VISIBLE) {
    const [oldest, ...rest] = toasts;
    clearTimer(oldest.id);
    toasts = rest;
  }
  emit();

  if (durationMs > 0) {
    timers.set(
      id,
      setTimeout(() => dismiss(id), durationMs)
    );
  }
  return id;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): ToastItem[] {
  return toasts;
}

// One shared instance: useSyncExternalStore requires a stable server snapshot
// and warns ("should be cached") when each call returns a fresh array.
const SERVER_SNAPSHOT: ToastItem[] = [];

export function getServerSnapshot(): ToastItem[] {
  return SERVER_SNAPSHOT;
}
