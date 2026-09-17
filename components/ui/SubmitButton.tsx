"use client";

import { Loader2 } from "lucide-react";

/** Form submit button with built-in pending/offline states — used by
 * EntityForm and ScriptEditor. `min-w` keeps the button's width stable while
 * the spinner replaces the label, so the surrounding layout doesn't shift. */
export function SubmitButton({
  pending,
  disabled,
  offlineBlocked,
  pendingLabel,
  children,
  className = "",
}: {
  pending: boolean;
  disabled?: boolean;
  offlineBlocked?: boolean;
  pendingLabel: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      disabled={pending || disabled || offlineBlocked}
      aria-busy={pending}
      title={offlineBlocked ? "Internet yo'q" : undefined}
      className={`inline-flex min-w-[120px] items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-[13px] font-medium text-surface transition-colors hover:bg-accent-hover disabled:opacity-50 ${className}`}
    >
      {pending ? (
        <>
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
