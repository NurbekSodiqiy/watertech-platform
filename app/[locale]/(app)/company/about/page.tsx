import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { CalendarDays, Settings, ShieldCheck, Globe, type LucideIcon } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Stagger } from "@/components/motion/Stagger";
import { StaggerItem } from "@/components/motion/StaggerItem";
import { PipelineChapter } from "@/components/story/PipelineChapter";
import { PipelineStory } from "@/components/story/PipelineStory";
import type { FittingKind } from "@/components/story/fittings";
import type { Locale } from "@/i18n/routing";

const BADGES: { key: string; Icon: LucideIcon }[] = [
  { key: "since2021", Icon: CalendarDays },
  { key: "germanTechnology", Icon: Settings },
  { key: "internationalStandards", Icon: ShieldCheck },
  { key: "export", Icon: Globe },
];

// Reading order down the pipeline; the scene alternates card sides itself.
const CHAPTERS: { key: string; fitting: FittingKind }[] = [
  { key: "about", fitting: "coupling" },
  { key: "production", fitting: "elbow" },
  { key: "goal", fitting: "tee" },
  { key: "whyUs", fitting: "valve" },
];

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.company.about" });
  return { title: t("title") };
}

export default async function AboutPage({ params: { locale } }: { params: { locale: Locale } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("pages.company.about");

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      {/* Header */}
      <div className="space-y-4">
        <Breadcrumbs path="/company/about" />
        <div>
          <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-primary-dark">{t("title")}</h1>
        </div>
      </div>

      {/* Compact badge row */}
      <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {BADGES.map(({ key, Icon }) => (
          <StaggerItem
            key={key}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-4 text-center shadow-soft"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent/[0.08] text-accent dark:bg-accent/[0.12]">
              <Icon size={20} />
            </span>
            <span className="text-[13px] font-semibold leading-tight text-primary-dark">{t(`badges.${key}`)}</span>
          </StaggerItem>
        ))}
      </Stagger>

      <PipelineStory finale={{ kind: "tank", caption: t("finale.caption") }}>
        {CHAPTERS.map(({ key, fitting }) => (
          <PipelineChapter key={key} fitting={fitting} title={t(`chapters.${key}.title`)}>
            <p>{t(`chapters.${key}.body`)}</p>
          </PipelineChapter>
        ))}
      </PipelineStory>
    </div>
  );
}
