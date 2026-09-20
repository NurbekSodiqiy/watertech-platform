"use client";

import { useCallback } from "react";
import { useUserState, type UserStateStatus } from "@/hooks/useUserState";
import { pinsKey, type PinRef, type PinsState } from "@/lib/user-state/keys";
import { togglePin } from "@/lib/user-state/pins";

/** The operator's pins, with a toggle that reads the latest list rather than
 * the one from the render that created the handler. Shared by PinButton, the
 * home page's Favourites and the command palette. */
export function usePins(): {
  pins: PinsState;
  setPins: (next: PinsState | ((prev: PinsState) => PinsState)) => void;
  toggle: (ref: PinRef) => void;
  status: UserStateStatus;
} {
  const [pins, setPins, status] = useUserState(pinsKey.key, pinsKey.schema, pinsKey.defaultValue, pinsKey);
  const toggle = useCallback((ref: PinRef) => setPins((prev) => togglePin(prev, ref)), [setPins]);
  return { pins, setPins, toggle, status };
}
