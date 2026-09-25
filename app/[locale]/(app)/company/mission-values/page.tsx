import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ManifestStory } from "@/components/story/ManifestStory";
import {
  InnovatsiyaIcon,
  MissiyaIcon,
  No1Icon,
  SifatIcon,
  Vizyon2030Icon,
  XavfsizlikIcon,
} from "@/components/story/value-icons";
import type { Locale } from "@/i18n/routing";

// The values, in reading order — stacked like commitments by ManifestStory.
const VALUES = [
  { key: "no1", Icon: No1Icon },
  { key: "sifat", Icon: SifatIcon },
  { key: "innovatsiya", Icon: InnovatsiyaIcon },
  { key: "xavfsizlik", Icon: XavfsizlikIcon },
] as const;

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.company.missionValues" });
  return { title: t("title") };
}

export default async function MissionValuesPage({ params: { locale } }: { params: { locale: Locale } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("pages.company.missionValues");

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      {/* Header */}
      <div className="space-y-4">
        <Breadcrumbs path="/company/mission-values" />
        <div>
          <h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-primary-dark">{t("title")}</h1>
        </div>
      </div>

      {/* The icons render here, on the server; the scene receives the elements. */}
      <ManifestStory
        mission={{
          title: t("chapters.missiya.title"),
          sentence: t("chapters.missiya.body"),
          icon: <MissiyaIcon size={20} />,
        }}
        vision={{
          title: t("chapters.vizyon2030.title"),
          body: t("chapters.vizyon2030.body"),
          icon: <Vizyon2030Icon size={20} />,
          labels: {
            today: t("vision.today"),
            target: t("vision.target"),
            exportCaption: t("vision.exportCaption"),
            houses: t("vision.houses"),
          },
        }}
        values={VALUES.map(({ key, Icon }) => ({
          id: key,
          title: t(`chapters.${key}.title`),
          body: t(`chapters.${key}.body`),
          icon: <Icon size={20} />,
        }))}
        closing={t("finale.caption")}
      />
    </div>
  );
}
