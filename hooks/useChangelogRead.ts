"use client";

import { useCallback, useRef } from "react";
import { useUserState, type UserStateStatus } from "@/hooks/useUserState";
import { changelogReadKey } from "@/lib/user-state/keys";
import { withRead } from "@/lib/user-state/changelog";

/** The operator's changelog read marks. `markRead` works from the latest list
 * (not the one from the render that created the handler) and does nothing when
 * every id is already marked — reopening a card must not write to the database
 * again. It also does nothing until the stored marks have loaded: a mark made
 * against the empty default would be newer than the operator's real list and
 * win the sync (lib/user-state/merge.ts). Shared by the changelog page, the
 * home strip and the app shell's nav badge. */
export function useChangelogRead(): {
  read: string[];
  markRead: (ids: readonly string[]) => void;
  status: UserStateStatus;
} {
  const [read, setRead, status] = useUserState(
    changelogReadKey.key,
    changelogReadKey.schema,
    changelogReadKey.defaultValue,
    changelogReadKey
  );
  const readRef = useRef(read);
  readRef.current = read;
  const statusRef = useRef(status);
  statusRef.current = status;

  const markRead = useCallback(
    (ids: readonly string[]) => {
      if (statusRef.current === "loading") return;
      if (withRead(readRef.current, ids) === readRef.current) return;
      setRead((prev) => withRead(prev, ids));
    },
    [setRead]
  );
  return { read, markRead, status };
}
