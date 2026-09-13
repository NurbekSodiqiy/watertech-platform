"use client";

import { useEffect, useState } from "react";

/** True only after the first client-side effect has run — lets a component
 * render the same static markup on the server and on first client paint,
 * then switch to browser-only content without a hydration mismatch. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
}
