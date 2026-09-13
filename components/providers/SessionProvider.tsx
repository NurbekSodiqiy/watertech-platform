"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { toSessionUser, type SessionUser } from "@/lib/auth/session-user";

interface SessionContextValue {
  user: SessionUser | null;
  status: "loading" | "ready";
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** Single client-side source of the signed-in user — reads the cookie
 * session once via getSession() (no network unless the token needs
 * refreshing) and stays in sync via onAuthStateChange, so consumers stop
 * each calling their own auth.getUser(). */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<SessionContextValue>({ user: null, status: "loading" });

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      setValue({ user: toSessionUser(data.session?.user), status: "ready" });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setValue({ user: toSessionUser(session?.user), status: "ready" });
    });

    return () => subscription.unsubscribe();
  }, []);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext(): SessionContextValue | null {
  return useContext(SessionContext);
}
