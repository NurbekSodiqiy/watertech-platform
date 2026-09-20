import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { getFormatter, getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { ChangelogEntryCard } from "@/components/changelog/ChangelogEntryCard";
import { getChangelog } from "@/lib/content/loader";
import { Link, type Locale } from "@/i18n/routing";

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "nav.changelog" });
  return { title: t("title") };
}

export default async function ChangelogPage({ params: { locale } }: { params: { locale: Locale } }) {
  unstable_setRequestLocale(locale);
  const [t, tNav, tEmpty, format, entries] = await Promise.all([
    getTranslations("pages.changelog"),
    getTranslations("nav.changelog"),
    getTranslations("emptyState.changelogNone"),
    getFormatter({ locale }),
    getChangelog(locale),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <PageHeader path="/changelog" title={tNav("title")} description={tNav("description")} />

      {entries.length === 0 ? (
        <EmptyState
          stateKey="changelogNone"
          title={tEmpty("title")}
          reason={tEmpty("reason")}
          action={{ label: tEmpty("cta"), href: "/" }}
        />
      ) : (
        <ol>
          {entries.map((entry, i) => (
            <ChangelogEntryCard
              key={entry.id}
              id={entry.id}
              title={entry.title}
              // The date has no time or zone — read it as UTC midnight and format
              // it as UTC so no time zone can move it to a neighbouring day.
              dateLabel={format.dateTime(new Date(`${entry.publishedOn}T00:00:00Z`), {
                dateStyle: "long",
                timeZone: "UTC",
              })}
              approvedBy={t("approvedBy", { name: entry.approvedBy })}
              isLast={i === entries.length - 1}
            >
              <p className="whitespace-pre-line text-[14px] leading-relaxed text-text-secondary">{entry.body}</p>
              {entry.linkedPath && (
                <Link
                  href={entry.linkedPath}
                  className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
                >
                  {t("openPage")}
                  <ArrowRight size={13} />
                </Link>
              )}
            </ChangelogEntryCard>
          ))}
        </ol>
      )}
    </div>
  );
}
