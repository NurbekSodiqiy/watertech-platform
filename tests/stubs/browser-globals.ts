/**
 * The handful of browser globals the client-side stores touch, for the node
 * test environment (vitest.config.ts — there is no jsdom in this project and
 * this task may not add one).
 *
 * Only what lib/user-state/store.ts and lib/telemetry/client.ts actually use:
 * two Storages, and `window`/`document` event targets so their global
 * listeners can be installed and then fired by hand.
 */

type Listener = (event: { key?: string | null }) => void;

/** Insertion-ordered like a real Storage, so `key(i)` enumeration — which the
 * purge and the daily prune both rely on — behaves as it does in a browser. */
export class MemoryStorage {
  private readonly map = new Map<string, string>();

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }

  /** Every key, for assertions. */
  keys(): string[] {
    return [...this.map.keys()];
  }
}

class EventTargetStub {
  readonly listeners = new Map<string, Listener[]>();

  addEventListener(type: string, listener: Listener): void {
    const existing = this.listeners.get(type) ?? [];
    existing.push(listener);
    this.listeners.set(type, existing);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, (this.listeners.get(type) ?? []).filter((entry) => entry !== listener));
  }

  dispatch(type: string, event: { key?: string | null } = {}): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

export interface BrowserGlobals {
  local: MemoryStorage;
  session: MemoryStorage;
  window: EventTargetStub;
  document: EventTargetStub;
  /** Fires the `storage` event a write in another tab would produce. */
  dispatchStorage: (key: string) => void;
  uninstall: () => void;
}

const GLOBAL_NAMES = ["localStorage", "sessionStorage", "window", "document"] as const;

/** Installs fresh globals and hands back a way to remove them, so one test's
 * keys or listeners can never be seen by the next. */
export function installBrowserGlobals(): BrowserGlobals {
  const local = new MemoryStorage();
  const session = new MemoryStorage();
  const windowStub = new EventTargetStub();
  const documentStub = new EventTargetStub();

  const values: Record<(typeof GLOBAL_NAMES)[number], unknown> = {
    localStorage: local,
    sessionStorage: session,
    window: windowStub,
    document: documentStub,
  };
  for (const name of GLOBAL_NAMES) {
    Object.defineProperty(globalThis, name, { value: values[name], configurable: true, writable: true });
  }

  return {
    local,
    session,
    window: windowStub,
    document: documentStub,
    dispatchStorage: (key: string) => windowStub.dispatch("storage", { key }),
    uninstall: () => {
      for (const name of GLOBAL_NAMES) Reflect.deleteProperty(globalThis, name);
    },
  };
}
