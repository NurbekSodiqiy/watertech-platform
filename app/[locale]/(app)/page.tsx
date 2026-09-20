import { unstable_setRequestLocale, getTranslations, getFormatter } from "next-intl/server";
import { DailyTimeline, DailyDateLabel } from "@/components/DailyTimeline";
import { WidgetBoundary } from "@/components/ui/WidgetBoundary";
import { HomeGreeting } from "@/components/HomeGreeting";
import { ChangelogStrip } from "@/components/home/ChangelogStrip";
import { ContinueCard } from "@/components/home/ContinueCard";
import { Favourites } from "@/components/home/Favourites";
import { Recents } from "@/components/home/Recents";
import { getChangelog } from "@/lib/content/loader";
import { Link, type Locale } from "@/i18n/routing";
import { Headphones, Package } from "lucide-react";

export default async function HomePage({ params: { locale } }: { params: { locale: Locale } }) {
  unstable_setRequestLocale(locale);
  const [t, format, changelog] = await Promise.all([
    getTranslations("pages.home.quickAccess"),
    getFormatter({ locale }),
    getChangelog(locale),
  ]);
  // Titles and dates only: which entries are unread is per operator, decided
  // in the island. Bodies stay off the home page's payload.
  const changelogEntries = changelog.map((entry) => ({
    id: entry.id,
    title: entry.title,
    dateLabel: format.dateTime(new Date(`${entry.publishedOn}T00:00:00Z`), { dateStyle: "long", timeZone: "UTC" }),
  }));

  const quickAccess = [
    {
      icon: Headphones,
      title: t("scripts.title"),
      description: t("scripts.description"),
      href: "/sales-process/scripts",
    },
    {
      icon: Package,
      title: t("products.title"),
      description: t("products.description"),
      href: "/products",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <HomeGreeting />
        <DailyDateLabel />
      </div>

      <WidgetBoundary>
        <ContinueCard />
      </WidgetBoundary>

      <WidgetBoundary>
        <ChangelogStrip entries={changelogEntries} />
      </WidgetBoundary>

      <WidgetBoundary>
        <Favourites />
      </WidgetBoundary>

      <WidgetBoundary>
        <Recents />
      </WidgetBoundary>

      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
          {t("heading")}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickAccess.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-soft hover:bg-primary/5"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <item.icon size={24} />
              </span>
              <span>
                <span className="block text-[15px] font-semibold text-primary-dark">{item.title}</span>
                <span className="mt-0.5 block text-[13px] text-text-secondary">{item.description}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>

      <WidgetBoundary>
        <DailyTimeline />
      </WidgetBoundary>
    </div>
  );
}
