"use client";

import { memo, type MouseEvent, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { CopyButton } from "@/components/CopyButton";
import { answerForClipboard, citedNumbers, stripMarkdown } from "@/lib/copilot/protocol";
import type { CopilotMessageData } from "@/hooks/useCopilot";

const CITATION_SPLIT = /(\[\d{1,2}\])/;
const CITATION_EXACT = /^\[(\d{1,2})\]$/;

function renderInline(paragraph: string): ReactNode[] {
  return paragraph.split(CITATION_SPLIT).map((part, i) => {
    const match = CITATION_EXACT.exec(part);
    if (!match) return part;
    return (
      <sup
        key={i}
        className="mx-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-md px-1 text-[11px] font-semibold text-accent bg-primary/10"
      >
        {match[1]}
      </sup>
    );
  });
}

export const CopilotMessage = memo(function CopilotMessage({
  message,
  onNavigate,
}: {
  message: CopilotMessageData;
  onNavigate: () => void;
}) {
  const t = useTranslations("copilot");
  const locale = useLocale();
  const pathname = usePathname();

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-[13.5px] text-primary-dark bg-primary/10">
          <span className="sr-only">{t("you")}: </span>
          {message.content}
        </p>
      </div>
    );
  }

  const paragraphs = stripMarkdown(message.content)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Only sources the answer actually cites get a chip — when the model says
  // the answer isn't in the base, the retrieved-but-unused blocks would
  // otherwise read as if they backed that statement.
  const cited = citedNumbers(message.content);
  const chips =
    message.status === "done"
      ? cited
          .map((n) => message.sources.find((s) => s.n === n))
          .filter((s): s is NonNullable<typeof s> => s !== undefined)
      : [];

  function handleChipClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    // Same route, only search params changing → pushState instead of a
    // router navigation (CLAUDE.md section 4), as CommandPalette does. The
    // locale prefix is re-added by hand because `pathname` is locale-less.
    if (href.startsWith(`${pathname}?`)) {
      event.preventDefault();
      window.history.pushState(null, "", locale === "ru" ? `/ru${href}` : href);
    }
    onNavigate();
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="w-full rounded-2xl border border-border px-3 py-2.5 text-[13.5px] text-primary-dark bg-surface-alt">
        {paragraphs.length === 0 && message.status === "streaming" && (
          <p className="text-text-secondary">{t("pending")}</p>
        )}
        <div className="space-y-2">
          {paragraphs.map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {renderInline(p)}
            </p>
          ))}
        </div>
        {message.status === "error" && message.error && (
          <p
            className={`flex items-center gap-1.5 text-[12.5px] text-text-secondary ${paragraphs.length > 0 ? "mt-2" : ""}`}
          >
            <AlertTriangle size={13} className="shrink-0 text-status-outdated" aria-hidden="true" />
            {t(`errors.${message.error}`)}
          </p>
        )}
      </div>

      {message.status === "done" && (chips.length > 0 || paragraphs.length > 0) && (
        <div className="flex w-full items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5" aria-label={t("sources")}>
            {chips.map((source) => (
              <Link
                key={source.n}
                href={source.href}
                onClick={(e) => handleChipClick(e, source.href)}
                className="flex max-w-full items-center gap-1 rounded-lg border border-border px-2 py-1 text-[12px] font-medium text-text-secondary bg-surface transition-colors hover:text-accent hover:bg-primary/5"
              >
                <span className="text-accent">{source.n}</span>
                <span className="truncate">{source.title}</span>
              </Link>
            ))}
          </div>
          <CopyButton value={answerForClipboard(message.content)} />
        </div>
      )}
    </div>
  );
});
