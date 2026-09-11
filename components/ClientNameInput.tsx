"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useClientName } from "./ClientNameContext";

/** The draft text lives here, not in the page — so every keystroke only
 * re-renders this small input, never the page's ~500-line tree. Only the
 * confirmed value (on Enter/click) reaches the ClientNameContext. */
export function ClientNameInput() {
  const { setClientName } = useClientName();
  const [draft, setDraft] = useState("");
  const confirm = () => setClientName(draft.trim());

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="client-name-input" className="text-sm font-medium text-text-secondary whitespace-nowrap">
        Mijoz ismi:
      </label>
      <div className="flex items-center gap-1.5">
        <input
          id="client-name-input"
          type="text"
          autoComplete="off"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirm();
          }}
          placeholder="Masalan: Aziz"
          className="w-32 rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] text-primary-dark placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-light"
        />
        <button
          onClick={confirm}
          aria-label="Ismni tasdiqlash"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-alt hover:text-accent"
        >
          <Check size={16} />
        </button>
      </div>
    </div>
  );
}
