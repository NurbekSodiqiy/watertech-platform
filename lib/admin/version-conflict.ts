/** Shared between lib/admin/actions/concurrency.ts (throws it server-side)
 * and every client form/table that needs to recognize the message to show a
 * "Yangilash" action — split out of concurrency.ts because that file
 * `import`s "server-only" and would otherwise poison any client component
 * that imports this constant from it. */
export const VERSION_CONFLICT_MESSAGE = "Bu yozuvni boshqa menejer o'zgartirgan. Sahifani yangilang.";

export class VersionConflictError extends Error {
  constructor() {
    super(VERSION_CONFLICT_MESSAGE);
    this.name = "VersionConflictError";
  }
}
