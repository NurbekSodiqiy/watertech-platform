"use client";

import { Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/routing";
import { EMPTY_STATES, type EmptyStateKey } from "@/lib/empty-states";

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  /** Only for the CommandPalette "Copilot'dan so'rash" CTA (S22 wires it up). */
  disabled?: boolean;
  title?: string;
}

export interface EmptyStateProps {
  /** Direct icon reference — only safe from a Client Component caller
   * (passing a component reference as a prop across the Server->Client RSC
   * boundary throws "Functions cannot be passed directly to Client
   * Components"). Server Component callers must use `stateKey` instead, so
   * the icon is resolved here, client-side, from a plain string. */
  icon?: LucideIcon;
  /** Resolves the icon from lib/empty-states.ts by key — the only
   * boundary-safe way for a Server Component to choose an icon. Wins over
   * `icon` if both are given. */
  stateKey?: EmptyStateKey;
  title: string;
  reason?: string;
  action?: EmptyStateAction;
  secondary?: { label: string; href: string };
  variant?: "page" | "inline" | "compact";
}

/** Copy is always resolved by the caller (getTranslations on the server,
 * useTranslations on the client) from `lib/empty-states.ts` — this component
 * only lays the pieces out. See CLAUDE.md section 6 for the token set. */
export function EmptyState({ icon, stateKey, title, reason, action, secondary, variant = "page" }: EmptyStateProps) {
  const Icon = stateKey ? EMPTY_STATES[stateKey].icon : (icon ?? Inbox);
  if (variant === "compact") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-surface px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon size={16} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-semibold text-primary-dark">{title}</p>
            {reason && <p className="truncate text-[12.5px] text-text-secondary">{reason}</p>}
          </div>
        </div>
        {action && <EmptyStateActionButton action={action} compact />}
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-surface px-6 text-center ${
        variant === "inline" ? "py-8" : "py-12"
      }`}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon size={20} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-primary-dark">{title}</p>
        {reason && <p className="max-w-sm text-[13px] text-text-secondary">{reason}</p>}
      </div>
      {(action || secondary) && (
        <div className="mt-1 flex flex-col items-center gap-2 sm:flex-row">
          {action && <EmptyStateActionButton action={action} />}
          {secondary && (
            <Link href={secondary.href} className="text-[13px] font-medium text-accent hover:underline">
              {secondary.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyStateActionButton({ action, compact = false }: { action: EmptyStateAction; compact?: boolean }) {
  const Icon = action.icon;
  const className = compact
    ? "flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12.5px] font-medium text-surface transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
    : "flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-medium text-surface shadow-softer transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50";
  const iconSize = compact ? 13 : 15;

  if (action.href && !action.disabled) {
    return (
      <Link href={action.href} className={className}>
        {Icon && <Icon size={iconSize} />}
        {action.label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={action.onClick} disabled={action.disabled} title={action.title} className={className}>
      {Icon && <Icon size={iconSize} />}
      {action.label}
    </button>
  );
}
