"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { SendHorizontal, Sparkles, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useCopilot } from "@/hooks/useCopilot";
import { durations, easings } from "@/lib/motion/tokens";
import { CopilotMessage } from "@/components/copilot/CopilotMessage";

const TITLE_ID = "copilot-panel-title";

export interface CopilotPrefill {
  text: string;
  /** Bumped on every request so asking the same query twice still refills. */
  key: number;
}

interface CopilotPanelProps {
  open: boolean;
  onClose: () => void;
  prefill: CopilotPrefill | null;
}

/** Right-side Copilot sheet. Stays mounted after the first open (AppShell
 * only unmounts it with the whole operator app), so the conversation held by
 * useCopilot survives closing and reopening within the session. */
export function CopilotPanel({ open, onClose, prefill }: CopilotPanelProps) {
  const t = useTranslations("copilot");
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState("");
  const { messages, pending, ask, cancel, clear } = useCopilot();

  useFocusTrap(panelRef, open);

  // Closing abandons the in-flight answer (and with it the upstream call).
  useEffect(() => {
    if (!open) cancel();
  }, [open, cancel]);

  useEffect(() => {
    if (prefill) setDraft(prefill.text);
  }, [prefill]);

  // After useFocusTrap's own first-focus frame, so the textarea wins.
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, prefill]);

  // Capture phase on window, stopped there: Call Mode's <Dialog> also closes
  // on a document-level Escape, and one press must only close this sheet.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, onClose]);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages]);

  const submit = useCallback(() => {
    if (pending || draft.trim().length < 3) return;
    void ask(draft);
    setDraft("");
  }, [ask, draft, pending]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end lg:pointer-events-none" role="presentation">
          {/* Full-width on mobile, so the page behind is dimmed there; on lg
              the sheet sits beside the page, which stays readable. */}
          <m.div
            className="absolute inset-0 bg-primary-dark/30 lg:hidden"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : durations.instant }}
          />
          <m.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={TITLE_ID}
            className="pointer-events-auto relative flex h-full w-full flex-col border-l border-border bg-surface shadow-soft lg:w-[380px]"
            initial={reduce ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reduce ? undefined : { x: "100%" }}
            transition={{ duration: reduce ? 0 : durations.fast, ease: easings.standard }}
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Sparkles size={16} className="shrink-0 text-accent" aria-hidden="true" />
              <h2 id={TITLE_ID} className="flex-1 text-[15px] font-semibold text-primary-dark">
                {t("title")}
              </h2>
              <button
                type="button"
                onClick={clear}
                disabled={messages.length === 0}
                className="rounded-lg px-2 py-1 text-[12.5px] font-medium text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary-dark disabled:opacity-40 disabled:hover:bg-transparent"
              >
                {t("clear")}
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label={t("close")}
                className="rounded-lg p-1 text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary-dark"
              >
                <X size={18} />
              </button>
            </div>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
              {messages.length === 0 ? (
                <p className="px-1 py-6 text-center text-[13px] text-text-secondary">{t("hint")}</p>
              ) : (
                messages.map((message) => <CopilotMessage key={message.id} message={message} onNavigate={onClose} />)
              )}
            </div>

            <form onSubmit={handleSubmit} className="border-t border-border px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  maxLength={400}
                  placeholder={t("placeholder")}
                  aria-label={t("placeholder")}
                  className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-border px-3 py-2 text-[13.5px] text-primary-dark bg-surface-alt placeholder:text-text-secondary focus:border-accent focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={pending || draft.trim().length < 3}
                  aria-label={t("send")}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-surface bg-primary transition-colors hover:bg-primary-hover disabled:opacity-40 disabled:hover:bg-primary"
                >
                  <SendHorizontal size={16} />
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-text-secondary">{pending ? t("pending") : t("keyHint")}</p>
            </form>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
