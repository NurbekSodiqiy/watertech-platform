"use client";

import { useSessionUser } from "@/hooks/useSessionUser";

/** Reads the display name from SessionProvider instead of calling
 * auth.getUser() itself — avoids a duplicate session read per component. */
export function HomeGreeting() {
  const { user } = useSessionUser();

  return (
    <h1 className="text-[32px] font-extrabold tracking-tight text-primary-dark">
      {user ? `Salom, ${user.name}` : "Salom!"}
    </h1>
  );
}
