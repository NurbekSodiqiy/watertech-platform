"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface ClientNameContextValue {
  clientName: string;
  setClientName: (name: string) => void;
}

const ClientNameContext = createContext<ClientNameContextValue | null>(null);

/** Owns the confirmed client-name state itself, as a component below the
 * page that renders it — so committing a new name only re-renders this
 * provider and whatever actually reads useClientName(), never the page
 * that mounted it. */
export function ClientNameProvider({ children }: { children: ReactNode }) {
  const [clientName, setClientName] = useState("");
  const value = useMemo(() => ({ clientName, setClientName }), [clientName]);
  return <ClientNameContext.Provider value={value}>{children}</ClientNameContext.Provider>;
}

export function useClientName() {
  const ctx = useContext(ClientNameContext);
  if (!ctx) throw new Error("useClientName must be used within a ClientNameProvider");
  return ctx;
}
