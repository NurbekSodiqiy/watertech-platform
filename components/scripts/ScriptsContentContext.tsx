"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ContentBundle } from "@/lib/content/loader";

const ScriptsContentContext = createContext<ContentBundle | null>(null);

/** Makes the server-loaded content bundle (scripts/objections/faqs/
 * competitors/packageGroups) available to client components without each
 * one importing the raw arrays directly — see CLAUDE.md section 8. */
export function ScriptsContentProvider({ value, children }: { value: ContentBundle; children: ReactNode }) {
  return <ScriptsContentContext.Provider value={value}>{children}</ScriptsContentContext.Provider>;
}

export function useScriptsContent(): ContentBundle {
  const ctx = useContext(ScriptsContentContext);
  if (!ctx) throw new Error("useScriptsContent must be used within a ScriptsContentProvider");
  return ctx;
}
