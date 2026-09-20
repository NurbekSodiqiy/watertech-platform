"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useChangelogRead } from "@/hooks/useChangelogRead";

/** Most unread entries the strip shows; the rest are one click away on /changelog. */
const MAX_SHOWN = 3;

export interface ChangelogStripEntry {
  id: string;
  title: string;
  /** Formatted on the server — see ChangelogEntryCard. */
  dateLabel: string;
}

/** "Yangiliklar": the newest changelog entries the operator has not read yet.
 * Renders nothing when there are none — and, since the server cannot know
 * which are unread, nothing until the stored read marks have loaded. Entries
 * arrive newest first (getChangelog). */
export function ChangelogStrip({ entries }: { entries: ChangelogStripEntry[] }) {
  const t = useTranslations("pages.home.changelog");
  const { read, status } = useChangelogRead();

  if (status === "loading") return null;
  const seen = new Set(read);
  const unread = entries.filter((entry) => !seen.has(entry.id));
  if (unread.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{t("heading")}</p>
        <Link href="/changelog" className="text-[12px] font-medium text-accent hover:underline">
          {t("all")}
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {unread.slice(0, MAX_SHOWN).map((entry) => (
          <Link
            key={entry.id}
            href={`/changelog#entry-${entry.id}`}
            className="flex items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-soft hover:bg-primary/5"
          >
            <span aria-hidden className="mt-[7px] h-2 w-2 shrink-0 rounded-full bg-status-warning" />
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-medium text-text-secondary">{entry.dateLabel}</span>
              <span className="line-clamp-2 block text-[14px] font-semibold text-primary-dark">
                <span className="sr-only">{t("unread")}: </span>
                {entry.title}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
