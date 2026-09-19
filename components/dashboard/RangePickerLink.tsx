"use client";

import { m, useReducedMotion } from "framer-motion";
import { Link } from "@/i18n/routing";
import { noTransition, springs } from "@/lib/motion/tokens";

/** One preset link of <RangePicker>, split out so the picker itself can stay a
 * Server Component (it calls a server-only helper) while the active pill —
 * same pattern as Sidebar's ActivePill — lives in this small client island. */
export function RangePickerLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  const reduce = useReducedMotion();

  return (
    <Link
      href={href}
      className={`relative rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
        active
          ? "border-transparent text-primary-dark"
          : "border-border bg-surface text-text-secondary hover:bg-surface-alt"
      }`}
    >
      {active && (
        <m.span
          layoutId="dashboard-range-pill"
          className="absolute -inset-px rounded-lg border border-primary bg-primary/10"
          transition={reduce ? noTransition : springs.snappy}
          aria-hidden
        />
      )}
      <span className="relative">{label}</span>
    </Link>
  );
}
