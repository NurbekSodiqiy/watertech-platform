"use client";

import { useRecordRecent } from "@/hooks/useRecordRecent";
import type { PinKind } from "@/lib/user-state/keys";

/** Renders nothing; records that the page it sits on was opened. For pages
 * that are Server Components and so cannot call useRecordRecent themselves. */
export function RecentRecorder({ kind, id }: { kind: PinKind; id: string }) {
  useRecordRecent({ kind, id });
  return null;
}
