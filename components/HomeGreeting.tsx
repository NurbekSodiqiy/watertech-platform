"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Loads the display name client-side (same lookup AvatarMenu.tsx already
 * does) instead of the page doing it server-side — a server-side
 * supabase.auth.getUser() call forces the whole route to opt into dynamic
 * rendering, which this one line was the only reason for. */
export function HomeGreeting() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      const displayName =
        (u?.user_metadata?.full_name as string | undefined) ||
        (u?.user_metadata?.name as string | undefined) ||
        "Operator";
      setName(displayName);
    });
  }, []);

  return (
    <h1 className="text-[32px] font-extrabold tracking-tight text-primary-dark">
      {name ? `Salom, ${name}` : "Salom!"}
    </h1>
  );
}
