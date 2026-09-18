"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTrack } from "@/hooks/useTrack";

/** Copy-to-clipboard button — the same icon-only pattern DatabaseTemplate's
 * "longtext" cells have used since it was first added there (1.5s "copied"
 * state, `track("copy")`), extracted here so the live-script bubbles, FAQ
 * answers, package cards and "copy all" buttons reuse it instead of each
 * reimplementing their own. Pass `label` for a labeled variant (e.g.
 * "Barchasini nusxalash"); omit it for the original icon-only button. */
export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const track = useTrack();
  const t = useTranslations("common");

  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          track("copy");
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard API unavailable — nothing to fall back to silently
        }
      }}
      aria-label={label ?? t("copy")}
      className={
        className ??
        (label
          ? "flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[13px] font-medium text-text-secondary transition-colors hover:bg-surface-alt hover:text-accent"
          : "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-text-secondary transition-colors hover:bg-surface-alt hover:text-accent")
      }
    >
      {copied ? <Check size={13} className="text-status-ok" /> : <Copy size={13} />}
      {label && <span>{copied ? t("copied") : label}</span>}
    </button>
  );
}
