"use client";

import { Info, User, Headset } from "lucide-react";
import type { ScriptTurn, Objection } from "@/lib/content/types";

const CLIENT_NAME_PLACEHOLDER = /_{2,}\s*aka\b/g;

export function withClientName(text: string, clientName?: string) {
  if (!clientName) return text;
  return text.replace(CLIENT_NAME_PLACEHOLDER, `${clientName} aka`);
}

/** Turns a shared Objection record into the same mijoz → operator → (note)
 * turn sequence a script's own turns[] would carry, so an objection looks
 * identical whether it's reached from a script's accordion or shown on its
 * own — one rendering path, one canonical wording. */
export function objectionToTurns(o: Objection): ScriptTurn[] {
  const turns: ScriptTurn[] = [
    { speaker: "mijoz", text: o.clientSays },
    { speaker: "operator", text: o.response },
  ];
  if (o.followUp) turns.push({ speaker: "note", text: o.followUp });
  return turns;
}

export function ScriptTurns({ turns, clientName }: { turns: ScriptTurn[]; clientName?: string }) {
  return (
    <div className="space-y-4">
      {turns.map((turn, idx) => {
        if (turn.speaker === "note") {
          const text = turn.condition
            ? `(agar ${turn.condition}, ${turn.text})`
            : turn.text;
          return (
            <div key={idx} className="flex gap-2 text-sm italic text-text-secondary mt-1 ml-10">
              <Info size={16} className="shrink-0 mt-0.5 opacity-70" />
              <span>{withClientName(text, clientName)}</span>
            </div>
          );
        }

        const isOperator = turn.speaker === "operator";

        return (
          <div key={idx} className={`flex flex-col gap-1.5 ${!isOperator ? "pl-8" : ""}`}>
            {turn.subStepHeader && (
              <div className={`${idx === 0 ? "mt-0" : "mt-8"} mb-3 text-sm font-bold uppercase tracking-wider text-primary border-b border-border pb-1 w-max`}>
                {turn.subStepHeader}
              </div>
            )}
            <div className="flex gap-3">
              <div className={`flex shrink-0 h-8 w-8 items-center justify-center rounded-full border ${isOperator ? "bg-surface border-border text-text-secondary" : "bg-surface-alt border-primary/20 text-accent"}`}>
                {isOperator ? <Headset size={16} /> : <User size={16} />}
              </div>
              <div className={`flex flex-col flex-1 px-4 py-3 rounded-2xl rounded-tl-sm border ${isOperator ? "bg-surface border-border border-l-[3px] border-l-primary" : "bg-primary-light/25 border-primary/20"}`}>
                <span className="text-[11px] font-bold uppercase tracking-widest mb-1 text-text-secondary">
                  {isOperator ? "Operator" : "Mijoz"}
                </span>
                <div className="text-base leading-relaxed text-primary-dark whitespace-pre-wrap">
                  {withClientName(turn.text, clientName)}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
