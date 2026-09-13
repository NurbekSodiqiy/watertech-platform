"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PageHeader } from "./DocPageTemplate";
import { FeedbackWidget } from "./FeedbackWidget";
import { ScriptTurns, objectionToTurns } from "./ScriptTurns";
import { useScriptsContent } from "@/components/scripts/ScriptsContentContext";
import type { Script, Stage } from "@/lib/content/types";
import type { PageMeta } from "@/lib/types";

function StageSection({ stage, index, defaultOpen = false }: { stage: Stage; index: number; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const reduce = useReducedMotion();
  const { objections } = useScriptsContent();
  const stageObjections = stage.objectionIds
    .map((id) => objections.find((o) => o.id === id))
    .filter((o): o is NonNullable<typeof o> => !!o);
  const isObjectionStage = stageObjections.length > 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-primary/5"
      >
        <span className="block text-[17px] font-bold text-primary-dark">
          {index + 1}. {stage.label}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-text-secondary transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? undefined : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduce ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="max-w-prose space-y-3 border-t border-border px-5 py-4">
              {isObjectionStage ? (
                <div className="space-y-8">
                  {stageObjections.map((o) => (
                    <div key={o.id}>
                      <p className="mb-3 text-sm font-bold uppercase tracking-wider text-primary border-b border-border pb-1 w-max">
                        {o.label}
                      </p>
                      <ScriptTurns turns={objectionToTurns(o)} />
                    </div>
                  ))}
                  <Link
                    href="/sales-process/objections"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-alt px-3 py-2 text-[13px] font-medium text-primary transition-colors hover:bg-surface hover:text-primary-dark"
                  >
                    E&apos;tirozlar bo&apos;limiga qarang
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              ) : (
                <ScriptTurns turns={stage.turns} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export function ScriptTemplate({ script, meta }: { script: Script; meta?: PageMeta }) {
  return (
    <div className="mx-auto max-w-4xl space-y-5 px-6 py-8">
      <PageHeader path={`/sales-process/scripts/${script.id}`} title={script.name} description="Qo'ng'iroq skripti" meta={meta} />

      <div className="rounded-2xl border border-primary-light/40 bg-primary/5 p-5 shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Qisqacha</p>
        <p className="mt-1.5 max-w-prose text-[14px] font-bold leading-relaxed text-primary-dark">{script.cheatSheet}</p>
      </div>

      <div className="space-y-3">
        {script.stages.map((stage, i) => (
          <StageSection key={stage.id} stage={stage} index={i} defaultOpen={i === 0} />
        ))}
      </div>

      <FeedbackWidget />
    </div>
  );
}
