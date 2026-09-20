"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useChangelogRead } from "@/hooks/useChangelogRead";

interface ChangelogEntryCardProps {
  id: string;
  title: string;
  /** Already formatted for the locale on the server — a client-side Intl call
   * could format differently from the server's and cause a hydration mismatch. */
  dateLabel: string;
  approvedBy: string;
  isLast: boolean;
  /** The entry's body and linked page, rendered on the server. */
  children: ReactNode;
}

/** One changelog entry: a collapsible card on the timeline rail. It counts as
 * read when the operator expands it or presses "Tanishdim" (useChangelogRead →
 * the `changelog.read` user-state key). The body is a native <details>, so it
 * is in the DOM and readable without JavaScript. */
export function ChangelogEntryCard({ id, title, dateLabel, approvedBy, isLast, children }: ChangelogEntryCardProps) {
  const t = useTranslations("pages.changelog");
  const { read, markRead, status } = useChangelogRead();
  // Nothing is claimed about read state until the stored marks have loaded —
  // the server and the first client paint cannot know them. The dot keeps its
  // size either way, so nothing shifts when it appears.
  const unread = status !== "loading" && !read.includes(id);

  return (
    <li id={`entry-${id}`} className="flex scroll-mt-24 gap-4">
      <div className="flex flex-col items-center">
        <span className="mt-4 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
        {!isLast && <span className="my-1 w-px flex-1 bg-border" />}
      </div>
      <div className="min-w-0 flex-1 pb-6">
        <details
          className="group rounded-2xl border border-border bg-surface shadow-soft"
          onToggle={(e) => {
            if (e.currentTarget.open) markRead([id]);
          }}
        >
          <summary className="flex cursor-pointer list-none items-start gap-3 rounded-2xl px-4 py-3 hover:bg-primary/5 [&::-webkit-details-marker]:hidden">
            <span
              aria-hidden
              className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${unread ? "bg-status-warning" : "bg-transparent"}`}
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-medium text-text-secondary">{dateLabel}</span>
              <span className="block text-[14px] font-semibold text-primary-dark">
                {unread && <span className="sr-only">{t("unread")}: </span>}
                {title}
              </span>
            </span>
            <ChevronRight
              size={14}
              aria-hidden
              className="mt-2 shrink-0 text-text-secondary transition-transform group-open:rotate-90 motion-reduce:transition-none"
            />
          </summary>
          <div className="space-y-3 border-t border-border px-4 py-3">{children}</div>
        </details>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-1 text-[12px] text-text-secondary">
          <span>{approvedBy}</span>
          {unread && (
            <button
              type="button"
              onClick={() => markRead([id])}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[12px] font-medium text-text-secondary transition-colors hover:bg-primary/5 hover:text-primary-dark"
            >
              {t("markRead")}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
