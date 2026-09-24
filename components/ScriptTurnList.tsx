"use client";

import { memo } from "react";
import { ScriptTurns } from "./ScriptTurns";
import { useClientName } from "./ClientNameContext";
import type { ScriptTurn } from "@/lib/content/types";
import type { ContentEntityType } from "@/lib/telemetry/types";

interface ScriptTurnListProps {
  turns: ScriptTurn[];
  large?: boolean;
  /** Forwarded to ScriptTurns — the stage or objection being copied from. */
  copyEntityType?: ContentEntityType;
  copyEntityId?: string;
}

/** Memoized so this (potentially long) turn list only re-renders when
 * `turns` itself actually changes or the confirmed client name changes —
 * not on every unrelated state change elsewhere on the page. Callers must
 * pass a stable `turns` reference (e.g. via useMemo) for the memo to pay
 * off. */
export const ScriptTurnList = memo(function ScriptTurnList({
  turns,
  large = false,
  copyEntityType,
  copyEntityId,
}: ScriptTurnListProps) {
  const { clientName } = useClientName();
  return (
    <ScriptTurns
      turns={turns}
      clientName={clientName}
      large={large}
      copyEntityType={copyEntityType}
      copyEntityId={copyEntityId}
    />
  );
});
