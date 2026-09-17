"use client";

import { toast, dismiss } from "@/components/ui/toast-store";

/** Thin wrapper so components never import components/ui/toast-store
 * directly — only Toaster.tsx reads the list back via useSyncExternalStore. */
export function useToast() {
  return { toast, dismiss };
}
