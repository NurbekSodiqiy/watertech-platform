"use client";

import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/Dialog";

const TITLE_ID = "shortcuts-help-title";

// Keys are rendered verbatim (they're glyphs, not prose) while the
// descriptions come from the message catalogue. The list mirrors the handlers
// that actually exist: Ctrl+K and Ctrl+J in AppShell, the rest in ScriptsWorkspace and
// CallModeOverlay.
const SHORTCUTS: { keys: string[]; descriptionKey: string }[] = [
  { keys: ["Ctrl", "K"], descriptionKey: "search" },
  { keys: ["Ctrl", "J"], descriptionKey: "copilot" },
  { keys: ["/"], descriptionKey: "searchSlash" },
  { keys: ["1–6"], descriptionKey: "stageNumber" },
  { keys: ["←", "→"], descriptionKey: "stageArrows" },
  { keys: ["F2"], descriptionKey: "callMode" },
  { keys: ["Esc"], descriptionKey: "close" },
  { keys: ["?"], descriptionKey: "help" },
];

export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("chrome.shortcuts");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy={TITLE_ID}
      containerClassName="z-50 flex items-start justify-center px-4 pt-[12vh]"
      panelClassName="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-soft"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <h2 id={TITLE_ID} className="text-[15px] font-semibold text-primary-dark">
          {t("title")}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border bg-surface-alt px-1.5 py-0.5 text-[11px] font-medium text-text-secondary hover:bg-primary/10"
        >
          ESC
        </button>
      </div>

      <dl className="divide-y divide-border">
        {SHORTCUTS.map(({ keys, descriptionKey }) => (
          <div key={descriptionKey} className="flex items-center justify-between gap-4 px-5 py-2.5">
            <dt className="flex shrink-0 items-center gap-1">
              {keys.map((key) => (
                <kbd
                  key={key}
                  className="rounded-md border border-border bg-surface-alt px-1.5 py-0.5 text-[11px] font-medium text-text-secondary"
                >
                  {key}
                </kbd>
              ))}
            </dt>
            <dd className="min-w-0 text-right text-[13px] text-primary-dark">{t(descriptionKey)}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}
