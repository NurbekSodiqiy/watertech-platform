"use client";

import { useSessionContext } from "@/components/providers/SessionProvider";

/** Reads the session from the nearest SessionProvider — throws instead of
 * silently returning an empty session when a component renders outside it. */
export function useSessionUser() {
  const context = useSessionContext();
  if (!context) {
    throw new Error("useSessionUser must be used within a <SessionProvider>");
  }
  return context;
}
