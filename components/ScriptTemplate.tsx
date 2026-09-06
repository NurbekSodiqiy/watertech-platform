"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PageHeader } from "./DocPageTemplate";
import { FeedbackWidget } from "./FeedbackWidget";
import type { SalesScript, ScriptBlock, ScriptSection } from "@/lib/mock-data/scripts";
import type { PageMeta } from "@/lib/types";

function DialogueLine({ line }: { line: string }) {
  const match = line.match(/^(Operator|Mijoz):\s*([\s\S]*)$/);
  if (!match) return <p>{line}</p>;
  return (
    <p>
      <span className="font-semibold text-primary-dark">{match[1]}:</span> {match[2]}
    </p>
  );
}

function Block({ block }: { block: ScriptBlock }) {
  switch (block.kind) {
    case "subheading":
      return <p className="text-[13px] font-semibold text-primary-dark">{block.text}</p>;
    case "dialogue":
      return (
        <div className="space-y-1.5 rounded-lg border border-border bg-surface-alt p-3 text-[13px] leading-relaxed text-text-secondary">
          {block.lines.map((line, i) => (
            <DialogueLine key={i} line={line} />
          ))}
        </div>
      );
    case "paragraph":
      return <p className="text-[13.5px] text-text-secondary">{block.text}</p>;
    case "list":
      return block.ordered ? (
        <ol className="list-decimal space-y-1.5 pl-5 text-[13.5px] text-text-secondary">
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ol>
      ) : (
        <ul className="list-disc space-y-1.5 pl-5 text-[13.5px] text-text-secondary">
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      );
    case "labeled-list":
      return (
        <div className="space-y-2.5">
          {block.items.map((it, i) => (
            <p key={i} className="text-[13.5px] text-text-secondary">
              <span className="font-semibold text-primary-dark">{it.label}:</span> {it.text}
            </p>
          ))}
        </div>
      );
    case "callout":
      return (
        <div className="rounded-lg border border-status-warning/40 bg-status-warning/10 p-3 text-[13px] text-primary-dark">
          {block.text}
          {block.linkHref && (
            <Link href={block.linkHref} className="ml-1.5 font-medium text-primary hover:underline">
              {block.linkLabel ?? "Batafsil →"}
            </Link>
          )}
        </div>
      );
  }
}

function Section({ section }: { section: ScriptSection }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-5 shadow-soft">
      <div>
        <h2 className="text-[16px] font-semibold text-primary-dark">{section.heading}</h2>
        {section.note && <p className="mt-0.5 text-[12.5px] italic text-text-secondary">{section.note}</p>}
      </div>
      <div className="space-y-3">
        {section.blocks.map((block, i) => (
          <Block key={i} block={block} />
        ))}
      </div>
    </section>
  );
}

export function ScriptTemplate({ script, meta }: { script: SalesScript; meta: PageMeta }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-6 py-8">
      <PageHeader path={`/sales-process/scripts/${script.slug}`} title={script.title} description="Qo'ng'iroq skripti" meta={meta} />

      <div className="rounded-2xl border border-primary-light/40 bg-primary/5 p-5 shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Qisqacha</p>
        <p className="mt-1.5 text-[14px] font-bold leading-relaxed text-primary-dark">{script.cheatSheet}</p>

        <button
          onClick={() => setOpen((v) => !v)}
          className="mt-4 flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[13px] font-medium text-primary-dark shadow-softer hover:bg-primary/5"
        >
          {open ? "Yopish" : "Batafsil"}
          <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={reduce ? undefined : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduce ? undefined : { opacity: 0, height: 0 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
            className="space-y-4 overflow-hidden"
          >
            {script.sections.map((section, i) => (
              <Section key={i} section={section} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <FeedbackWidget />
    </div>
  );
}
