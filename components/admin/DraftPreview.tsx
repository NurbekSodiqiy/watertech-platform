"use client";

import { useId, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Dialog } from "@/components/ui/Dialog";
import { ScriptTurnList } from "@/components/ScriptTurnList";
import { objectionToTurns } from "@/components/ScriptTurns";
import { ScriptsContentProvider } from "@/components/scripts/ScriptsContentContext";
import { ClientNameProvider } from "@/components/ClientNameContext";
import type { ContentBundle } from "@/lib/content/loader";
import type { Faq, Objection, Script, Sop } from "@/lib/content/types";

export type DraftPreviewProps =
  | { kind: "script"; open: boolean; onClose: () => void; title: string; script: Script; bundle: ContentBundle }
  | { kind: "objection"; open: boolean; onClose: () => void; title: string; objection: Objection; bundle: ContentBundle }
  | { kind: "faq"; open: boolean; onClose: () => void; title: string; faq: Faq }
  | { kind: "sop"; open: boolean; onClose: () => void; title: string; sop: Sop };

/** A script's stages, exactly as `ScriptEditor`'s own inline preview renders
 * one, but with a picker across every stage instead of just the selected
 * one — this is the "full preview" the editor's toggle opens. */
function ScriptPreviewBody({ script, bundle }: { script: Script; bundle: ContentBundle }) {
  const t = useTranslations("admin.preview");
  const [stageIndex, setStageIndex] = useState(0);
  const stage = script.stages[stageIndex];

  return (
    <div className="space-y-4">
      {script.cheatSheet && (
        <p className="rounded-xl border border-border bg-surface-alt/60 p-3 text-[12.5px] text-text-secondary">
          {script.cheatSheet}
        </p>
      )}
      {script.stages.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {script.stages.map((s, index) => (
            <button
              key={s.id || index}
              type="button"
              onClick={() => setStageIndex(index)}
              className={`rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors ${
                index === stageIndex
                  ? "bg-primary text-on-accent"
                  : "border border-border bg-surface text-text-secondary hover:bg-surface-alt"
              }`}
            >
              {s.label || t("stageFallback", { index: index + 1 })}
            </button>
          ))}
        </div>
      )}
      <ClientNameProvider>
        <ScriptsContentProvider value={bundle}>
          <ScriptTurnList turns={stage?.turns ?? []} large={false} />
        </ScriptsContentProvider>
      </ClientNameProvider>
    </div>
  );
}

/** An objection reads identically whether reached from a script's accordion
 * or shown on its own — `objectionToTurns` (components/ScriptTurns.tsx) is
 * the same conversion the operator scripts page uses, fed through the same
 * `ScriptTurnList` ScriptEditor's own preview already reuses. */
function ObjectionPreviewBody({ objection, bundle }: { objection: Objection; bundle: ContentBundle }) {
  return (
    <ClientNameProvider>
      <ScriptsContentProvider value={bundle}>
        <ScriptTurnList turns={objectionToTurns(objection)} large={false} />
      </ScriptsContentProvider>
    </ClientNameProvider>
  );
}

/** FaqTab (components/FaqTab.tsx) owns page-level state (search params, a
 * shared left panel ref, pins/recents) and isn't extractable as a standalone
 * item — this mirrors its question/answer visual with DESIGN LOCK tokens
 * only, rather than importing it wholesale. */
function FaqPreviewBody({ faq }: { faq: Faq }) {
  return (
    <div className="space-y-3">
      {faq.category && (
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
          {faq.category}
        </span>
      )}
      <h3 className="text-[15px] font-semibold text-primary-dark">{faq.question}</h3>
      <p className="whitespace-pre-line text-[13px] text-text-secondary">{faq.answer}</p>
    </div>
  );
}

/** The exact step markup `app/[locale]/(app)/tools/amocrm/[slug]/page.tsx`
 * renders for a published SOP — copied, not reinvented. */
function SopPreviewBody({ sop }: { sop: Sop }) {
  return (
    <div className="space-y-3">
      {sop.summary && <p className="text-[13px] text-text-secondary">{sop.summary}</p>}
      <ol className="space-y-3">
        {sop.steps.map((step, index) => (
          <li key={index} className="flex gap-3 rounded-2xl border border-border bg-surface p-4 shadow-soft">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[13px] font-semibold text-primary">
              {index + 1}
            </span>
            <div>
              <p className="text-[13.5px] text-primary-dark">{step.title}</p>
              {step.body && (
                <p className="mt-0.5 whitespace-pre-line text-[12.5px] italic text-text-secondary">{step.body}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Read-only "as the operator sees it" drawer — fed by a draft's current
 * (unsaved) form values, not the database, so a manager can check a draft
 * before publishing it. No public route reads drafts; this is the only place
 * one renders. Built on the existing `Dialog` primitive (focus trap/restore,
 * Escape, motion tokens already come from there) positioned as a right-side
 * panel rather than a centered modal. */
export function DraftPreview(props: DraftPreviewProps) {
  const t = useTranslations("admin.preview");
  const titleId = useId();

  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      labelledBy={titleId}
      containerClassName="z-50 flex justify-end"
      panelClassName="flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-soft"
      motionStyle="fade"
    >
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{t("badge")}</p>
          <p id={titleId} className="truncate text-[14px] font-semibold text-primary-dark">
            {props.title}
          </p>
        </div>
        <button
          type="button"
          onClick={props.onClose}
          aria-label={t("close")}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-alt"
        >
          <X size={14} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {props.kind === "script" && <ScriptPreviewBody script={props.script} bundle={props.bundle} />}
        {props.kind === "objection" && <ObjectionPreviewBody objection={props.objection} bundle={props.bundle} />}
        {props.kind === "faq" && <FaqPreviewBody faq={props.faq} />}
        {props.kind === "sop" && <SopPreviewBody sop={props.sop} />}
      </div>
    </Dialog>
  );
}
