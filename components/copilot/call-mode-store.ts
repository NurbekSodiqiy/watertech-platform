/** Whether Call Mode is currently on screen — a tiny useSyncExternalStore
 * source (same pattern as components/ui/toast-store.ts). CallModeOverlay
 * lives deep inside the scripts page while the Copilot button is mounted by
 * AppShell, so they share this flag instead of threading a prop through the
 * page. CallModeOverlay is the only writer. */

let callModeOpen = false;
const listeners = new Set<() => void>();

export function setCallModeOpen(open: boolean): void {
  if (callModeOpen === open) return;
  callModeOpen = open;
  listeners.forEach((listener) => listener());
}

export function subscribeCallMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCallModeSnapshot(): boolean {
  return callModeOpen;
}

export function getCallModeServerSnapshot(): boolean {
  return false;
}
