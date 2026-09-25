import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { CalendarDays, Settings, ShieldCheck, Globe, type LucideIcon } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { LayersStory } from "@/components/story/LayersStory";
import type { Locale } from "@/i18n/routing";

const BADGES: { key: string; Icon: LucideIcon }[] = [
  { key: "since2021", Icon: CalendarDays },
  { key: "germanTechnology", Icon: Settings },
  { key: "internationalStandards", Icon: ShieldCheck },
  { key: "export", Icon: Globe },
];

// Reading order = ring order, outer → inner: the company's start is the
// pipe's outside wall, "why us" the layer next to the water.
const CHAPTERS = ["about", "production", "goal", "whyUs"] as const;

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.company.about" });
  return { title: t("title") };
}

export default async function AboutPage({ params: { locale } }: { params: { locale: Locale } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("pages.company.about");

  const chapters = CHAPTERS.map((key) => ({
    id: key,
    title: t(`chapters.${key}.title`),
    body: t(`chapters.${key}.body`),
    ringLabel: t(`rings.${key}`),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      {/* Header */}
      <div className="space-y-4">
        <Breadcrumbs path="/company/about" />
        <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-primary-dark">{t("title")}</h1>
        {/* Four facts, not motion: static chips on one line (wrapping on a phone). */}
        <ul className="flex flex-wrap gap-2">
          {BADGES.map(({ key, Icon }) => (
            <li
              key={key}
              className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[12.5px] font-medium text-primary-dark"
            >
              <Icon size={14} aria-hidden="true" className="shrink-0 text-accent" />
              {t(`badges.${key}`)}
            </li>
          ))}
        </ul>
      </div>

      <LayersStory chapters={chapters} finaleCaption={t("finale.caption")} />
    </div>
  );
}
