"use client";

import { createContext, useContext } from "react";

/** Set by <MotionProvider> once the lazily loaded feature bundle is registered. */
export const MotionReadyContext = createContext(false);

/**
 * False until `m.*` elements can actually animate. With `initial={false}`,
 * framer treats the first `animate` target it sees after the features mount
 * as the initial state and skips it — so anything that changes state before
 * this is true (arming a reveal, say) would be silently dropped.
 */
export function useMotionReady(): boolean {
  return useContext(MotionReadyContext);
}
