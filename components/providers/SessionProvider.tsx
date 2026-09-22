"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { purgeLocalUserData } from "@/lib/auth/purge";
import { toSessionUser, type SessionUser } from "@/lib/auth/session-user";
import { setTelemetryOwner } from "@/lib/telemetry/client";
import { deriveOwnerId } from "@/lib/user-state/owner";
import { setUserStateSession } from "@/lib/user-state/store";

interface SessionContextValue {
  user: SessionUser | null;
  status: "loading" | "ready";
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** The account the local stores currently hold data for. The id, not the
 * email, decides whether this is a different operator — it is the field
 * guaranteed to be stable and unique. The address is kept beside it because
 * the storage sweep is scoped by the *previous* owner's id, and that can only
 * be derived from their address. */
interface LocalOwner {
  id: string;
  email: string | null;
}

/** Single client-side source of the signed-in user — reads the cookie
 * session once via getSession() (no network unless the token needs
 * refreshing) and stays in sync via onAuthStateChange, so consumers stop
 * each calling their own auth.getUser().
 *
 * It is also where the client-side stores learn whose data they are holding.
 * Supabase broadcasts auth changes to every tab on the origin, so a sign-out
 * or a sign-in as someone else in another tab reaches this one: that is the
 * moment the previous account's pins, recents, onboarding, script position,
 * pending uploads and buffered telemetry have to go — before the new session
 * can read them, and before anything queued under the old JWT can be sent
 * under the new one. The same purge as lib/auth/sign-out.ts, minus the
 * navigation: this tab stays where it is, and every mounted key re-hydrates
 * under whoever is signed in now. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<SessionContextValue>({ user: null, status: "loading" });
  const owner = useRef<LocalOwner | null>(null);
  const seen = useRef(false);
  /** Auth events can arrive while an earlier one is still deriving an owner
   * id; only the newest may touch the stores. */
  const generation = useRef(0);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    /** Purges first when the account changed, then points the stores at the
     * session that is current now. Every step re-checks that no newer auth
     * event has overtaken it. */
    async function apply(token: number, email: string | null, previousEmail: string | null | undefined) {
      if (previousEmail !== undefined) {
        // resumeSends: this tab is not navigating away, so the new session
        // has to be able to write once the old one's data is gone.
        await purgeLocalUserData({ email: previousEmail, resumeSends: true });
        if (!active || token !== generation.current) return;
      }

      const ownerId = await deriveOwnerId(email);
      if (!active || token !== generation.current) return;

      // Ahead of the store's own lazy resolution, so the owner guard has
      // already run by the time the first key hydrates.
      setTelemetryOwner(ownerId);
      await setUserStateSession(email);
    }

    function handle(user: { id?: string; email?: string } | null, signedOut: boolean) {
      if (!active) return;

      const id = user?.id ?? null;
      const email = user?.email ?? null;
      const previous = owner.current;
      // The first observation is this page's own load, not a change — there
      // is nothing of a previous account in memory yet to drop.
      const changed = seen.current && (previous?.id ?? null) !== id;

      seen.current = true;
      owner.current = id ? { id, email } : null;
      setValue({ user: toSessionUser(user), status: "ready" });

      // A purge needs both a reason — the account ended or changed — and an
      // account to scope it to. With no previous owner there is nothing of
      // anyone's in memory, and an unscoped sweep would take a colleague's
      // queued offline writes with it. `undefined` means "no purge".
      const leaving = previous !== null && (signedOut || changed);
      void apply((generation.current += 1), email, leaving ? previous.email : undefined);
    }

    supabase.auth.getSession().then(({ data }) => handle(data.session?.user ?? null, false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      handle(session?.user ?? null, event === "SIGNED_OUT");
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext(): SessionContextValue | null {
  return useContext(SessionContext);
}
