import { AdminActionError } from "@/lib/admin/errors";

/** Thrown by lib/admin/actions/concurrency.ts when an optimistic-concurrency
 * write matched no row, i.e. another manager saved first. Split out of
 * concurrency.ts because that file `import`s "server-only" and would otherwise
 * poison any client component that needs to recognise the failure.
 *
 * It is an AdminActionError, so the action boundary turns it into
 * `{ ok: false, code: "version_conflict" }` with no message comparison
 * anywhere — the client matches on the code and shows `toast.conflict`. */
export class VersionConflictError extends AdminActionError {
  constructor() {
    super("version_conflict");
    this.name = "VersionConflictError";
  }
}
