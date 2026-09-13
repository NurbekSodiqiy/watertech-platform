"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Info, User, Headset, Package, Building2, HelpCircle, ChevronDown, ArrowUpRight } from "lucide-react";
import type { ScriptTurn, ScriptTurnLink, Objection } from "@/lib/content/types";
import type { ContentBundle } from "@/lib/content/loader";
import { useScriptsContent } from "@/components/scripts/ScriptsContentContext";
import { CopyButton } from "@/components/CopyButton";
import { useNow } from "@/hooks/useNow";

const CLIENT_NAME_PLACEHOLDER = /_{2,}\s*aka\b/g;

const UZ_WEEKDAYS = ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"];
const UZ_MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];

function formatUzDate(d: Date) {
  return `${UZ_WEEKDAYS[d.getDay()]}, ${d.getDate()}-${UZ_MONTHS[d.getMonth()]}`;
}

export type SuggestedSlots = {
  slot1: string;
  slot2: string;
  hour1: string;
  hour2: string;
};

/** Derived from a caller-supplied `now` (never computed internally) — same
 * approach as DailyTimeline's date/time — so a script proposing a follow-up
 * always suggests real near-future slots instead of a frozen placeholder.
 * This is a mechanical default (next two calendar days, two fixed business
 * hours) for the operator to read out and adjust verbally, not a scheduling
 * rule. */
export function getSuggestedSlots(now: Date): SuggestedSlots {
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const dayAfter = new Date(now);
  dayAfter.setDate(now.getDate() + 2);
  return {
    slot1: `${formatUzDate(tomorrow)}, soat 10:00`,
    slot2: `${formatUzDate(dayAfter)}, soat 15:00`,
    hour1: "10:00",
    hour2: "15:00",
  };
}

/** `"use client"` hook: resolves the current suggested follow-up slots from
 * the viewer's own clock, `null` until mounted (see `useNow`). */
export function useSuggestedSlots(): SuggestedSlots | null {
  const now = useNow();
  return useMemo(() => (now ? getSuggestedSlots(now) : null), [now]);
}

export function withClientName(text: string, clientName?: string, slots?: SuggestedSlots | null) {
  let out = clientName ? text.replace(CLIENT_NAME_PLACEHOLDER, `${clientName} aka`) : text;
  if (out.includes("[Kun va Vaqt]") || out.includes("[Boshqa Kun va Vaqt]") || out.includes("[soat]")) {
    if (slots) {
      out = out.split("[Boshqa Kun va Vaqt]").join(slots.slot2);
      out = out.split("[Kun va Vaqt]").join(slots.slot1);
      let soatSeen = 0;
      out = out.replace(/\[soat\]/g, () => (soatSeen++ === 0 ? slots.hour1 : slots.hour2));
    } else {
      out = out.split("[Boshqa Kun va Vaqt]").join("boshqa kun va vaqt");
      out = out.split("[Kun va Vaqt]").join("kun va vaqt");
      out = out.replace(/\[soat\]/g, "soat");
    }
  }
  return out;
}

const LINK_TYPE_ICON: Record<ScriptTurnLink["type"], typeof Package> = {
  package: Package,
  competitor: Building2,
  faq: HelpCircle,
};

/** Looks up the linked package/competitor/FAQ from the content bundle — links
 * only ever reference ids that already exist, no new content is introduced
 * here. */
function resolveLinkDetail(
  link: ScriptTurnLink,
  content: Pick<ContentBundle, "packageGroups" | "competitors" | "faqs">
): { title: string; body: string; href?: string } | null {
  if (link.type === "competitor") {
    const c = content.competitors.find((c) => c.id === link.id);
    if (!c) return null;
    return {
      title: c.name,
      body: `Maks. chegirma: ${c.maxDiscount} · Raqobat darajasi: ${c.threatLevel}`,
      href: `/sales-process/battle-cards/${c.id}`,
    };
  }
  if (link.type === "package") {
    const p = content.packageGroups.flatMap((g) => g.packages).find((p) => p.id === link.id);
    if (!p) return null;
    return { title: p.name, body: `${p.orderVolume} · ${p.estimatedDiscount} chegirma` };
  }
  const f = content.faqs.find((f) => f.id === link.id);
  if (!f) return null;
  return { title: f.question, body: f.answer, href: "/faq" };
}

/** Small inline chip for a ScriptTurn.links entry — toggles a compact
 * preview of the linked package/competitor/FAQ using data that already
 * exists, with a link to the full page where one exists (battle-cards,
 * faq). No navigation state is shared with the host page, so this works
 * the same whether it's rendered from the interactive scripts view or the
 * static per-script page. */
function LinkChip({ link }: { link: ScriptTurnLink }) {
  const [open, setOpen] = useState(false);
  const content = useScriptsContent();
  const detail = resolveLinkDetail(link, content);
  if (!detail) return null;
  const Icon = LINK_TYPE_ICON[link.type];

  return (
    <div className="inline-flex flex-col">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
          open
            ? "border-primary bg-primary/10 text-primary-dark"
            : "border-border bg-surface text-text-secondary hover:border-primary/40 hover:text-primary-dark"
        }`}
      >
        <Icon size={12} />
        {link.label}
        <ChevronDown size={12} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-1.5 max-w-sm rounded-xl border border-border bg-surface-alt p-3">
          <p className="text-[13px] font-semibold text-primary-dark">{detail.title}</p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-text-secondary">{detail.body}</p>
          {detail.href && (
            <Link
              href={detail.href}
              className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:text-primary-hover"
            >
              Batafsil
              <ArrowUpRight size={11} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function TurnLinks({ links }: { links: ScriptTurnLink[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {links.map((link, i) => (
        <LinkChip key={`${link.type}-${link.id}-${i}`} link={link} />
      ))}
    </div>
  );
}

/** A conditional note ("agar ismini yozmagan bo'lsa...") is now something
 * the operator explicitly picks a state for, rather than always-shown
 * auto-formatted text — closed by default, click to reveal which of the
 * two situations applies and what to say. No new content: still just
 * `turn.condition` and `turn.text` as already written. */
function ConditionNote({
  condition,
  text,
  clientName,
  slots,
}: {
  condition: string;
  text: string;
  clientName?: string;
  slots: SuggestedSlots | null;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="mt-1 ml-10 flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
          show
            ? "border-primary bg-primary/10 text-primary-dark"
            : "border-border bg-surface text-text-secondary hover:border-primary/40 hover:text-primary-dark"
        }`}
      >
        <Info size={12} />
        Agar {condition}
        <ChevronDown size={12} className={`transition-transform ${show ? "rotate-180" : ""}`} />
      </button>
      {show && (
        <div className="flex gap-2 text-sm italic text-text-secondary">
          <span>{withClientName(text, clientName, slots)}</span>
        </div>
      )}
    </div>
  );
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

/** Every operator line in `turns`, client-name filled in, joined with a
 * blank line between each — the same "copy everything for Telegram" shape
 * as an individual bubble's own copy button, just concatenated. Notes
 * (operator-only instructions like a condition's alternate text) are
 * `speaker: "note"`, never "operator", so they're excluded automatically —
 * nothing to filter out separately. */
export function collectOperatorText(turns: ScriptTurn[], clientName?: string): string {
  // Event time (invoked from a copy-button click handler), not render time.
  const slots = getSuggestedSlots(new Date());
  return turns
    .filter((t) => t.speaker === "operator")
    .map((t) => withClientName(t.text, clientName, slots))
    .join("\n\n");
}

export function ScriptTurns({
  turns,
  clientName,
  large = false,
}: {
  turns: ScriptTurn[];
  clientName?: string;
  /** Call Mode reads this at arm's length during a live call — roughly
   * 1.6x the normal turn text size, nothing else scales. */
  large?: boolean;
}) {
  const slots = useSuggestedSlots();

  return (
    <div className="space-y-4">
      {turns.map((turn, idx) => {
        if (turn.speaker === "note") {
          if (turn.condition) {
            return (
              <ConditionNote key={idx} condition={turn.condition} text={turn.text} clientName={clientName} slots={slots} />
            );
          }
          return (
            <div key={idx} className="flex gap-2 text-sm italic text-text-secondary mt-1 ml-10">
              <Info size={16} className="shrink-0 mt-0.5 opacity-70" />
              <span>{withClientName(turn.text, clientName, slots)}</span>
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
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-text-secondary">
                    {isOperator ? "Operator" : "Mijoz"}
                  </span>
                  {isOperator && (
                    <CopyButton
                      value={withClientName(turn.text, clientName, slots)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-alt hover:text-accent"
                    />
                  )}
                </div>
                <div
                  className={`leading-relaxed text-primary-dark whitespace-pre-wrap ${large ? "text-[26px]" : "text-base"}`}
                >
                  {withClientName(turn.text, clientName, slots)}
                </div>
              </div>
            </div>
            {turn.links && turn.links.length > 0 && <TurnLinks links={turn.links} />}
          </div>
        );
      })}
    </div>
  );
}
