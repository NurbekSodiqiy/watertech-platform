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
  if (!match) return <p className="text-[13px] text-text-secondary">{line}</p>;
  const [, speaker, text] = match;
  const isOperator = speaker === "Operator";
  return (
    <div
      className={`rounded-lg border-l-2 px-3 py-2 text-[13px] leading-relaxed ${
        isOperator ? "border-primary bg-primary/5 text-primary-dark" : "border-border bg-surface-alt text-text-secondary"
      }`}
    >
      <span className={`font-semibold ${isOperator ? "text-primary" : "text-primary-dark"}`}>{speaker}:</span> {text}
    </div>
  );
}

function Block({ block }: { block: ScriptBlock }) {
  switch (block.kind) {
    case "subheading":
      return <p className="text-[13px] font-semibold text-primary-dark">{block.text}</p>;
    case "dialogue":
      return (
        <div className="space-y-1.5">
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

function Section({ section, defaultOpen = false }: { section: ScriptSection; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const reduce = useReducedMotion();

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-primary/5"
      >
        <span className="min-w-0">
          <span className="block text-[17px] font-bold text-primary-dark">{section.heading}</span>
          {section.note && <span className="mt-0.5 block text-[12.5px] italic text-text-secondary">{section.note}</span>}
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
              {section.blocks.map((block, i) => (
                <Block key={i} block={block} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export function ScriptTemplate({ script, meta }: { script: SalesScript; meta: PageMeta }) {
  return (
    <div className="mx-auto max-w-4xl space-y-5 px-6 py-8">
      <PageHeader path={`/sales-process/scripts/${script.slug}`} title={script.title} description="Qo'ng'iroq skripti" meta={meta} />

      <div className="rounded-2xl border border-primary-light/40 bg-primary/5 p-5 shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Qisqacha</p>
        <p className="mt-1.5 max-w-prose text-[14px] font-bold leading-relaxed text-primary-dark">{script.cheatSheet}</p>
      </div>

      <div className="space-y-3">
        {script.sections.map((section, i) => (
          <Section key={i} section={section} defaultOpen={i === 0} />
        ))}
      </div>

      <FeedbackWidget />
    </div>
  );
}
