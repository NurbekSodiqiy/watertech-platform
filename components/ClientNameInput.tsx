"use client";

import { useClientName } from "./ClientNameContext";

/** Writes straight into ClientNameContext on every keystroke — no separate
 * draft/confirm step. This stays cheap because only ScriptTurnList (and
 * whatever else calls useClientName()) re-renders on each change, never the
 * page itself; the context split is exactly what makes live-as-you-type
 * safe here. */
export function ClientNameInput() {
  const { clientName, setClientName } = useClientName();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="client-name-input" className="text-sm font-medium text-text-secondary whitespace-nowrap">
        Mijoz ismi:
      </label>
      <input
        id="client-name-input"
        type="text"
        autoComplete="off"
        value={clientName}
        onChange={(e) => setClientName(e.target.value)}
        placeholder="Masalan: Aziz"
        className="w-32 rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light"
      />
    </div>
  );
}
