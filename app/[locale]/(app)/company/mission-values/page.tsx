import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PipelineChapter } from "@/components/story/PipelineChapter";
import { PipelineStory } from "@/components/story/PipelineStory";
import type { FittingKind } from "@/components/story/fittings";
import type { Locale } from "@/i18n/routing";

// Icons are inlined (stroke="currentColor") rather than referenced via
// <img src>, because currentColor in an externally-loaded SVG resolves
// inside that SVG's own isolated document — it can't see this page's CSS —
// so <img> would just render black in both themes. Inlining lets `text-accent`
// on the wrapping badge flow into the stroke via normal color inheritance.
function MissiyaIcon({ size = 40 }: { size?: number | string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24,4 C14,17 6,28 6,37 A18,18 0 1,0 42,37 C42,28 34,17 24,4 Z" />
        <path d="M13,33 Q19,29 24,33 Q29,37 35,33" />
        <path d="M13,39 Q19,35 24,39 Q29,43 35,39" />
      </g>
    </svg>
  );
}

function Vizyon2030Icon({ size = 40 }: { size?: number | string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="26" width="10" height="18" rx="2" />
        <rect x="19" y="12" width="10" height="32" rx="2" />
        <rect x="34" y="0" width="10" height="44" rx="2" />
        <circle cx="39" cy="14" r="7" />
      </g>
    </svg>
  );
}

function No1Icon({ size = 40 }: { size?: number | string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="26" width="12" height="18" rx="2" />
        <rect x="18" y="6" width="12" height="38" rx="2" />
        <rect x="34" y="30" width="12" height="14" rx="2" />
      </g>
    </svg>
  );
}

function SifatIcon({ size = 40 }: { size?: number | string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M24,3 L4,12 L4,24 Q4,38 24,45 Q44,38 44,24 L44,12 Z" />
        <path d="M14,24 L21,31 L35,15" />
      </g>
    </svg>
  );
}

function InnovatsiyaIcon({ size = 40 }: { size?: number | string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="24" cy="20" r="15" />
        <path d="M17,34 L17,40 Q24,45 31,40 L31,34" />
        <path d="M20,44 L28,44" />
        <path d="M24,4 L24,0" />
        <path d="M40,20 L44,20" />
        <path d="M4,20 L8,20" />
      </g>
    </svg>
  );
}

function XavfsizlikIcon({ size = 40 }: { size?: number | string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <g stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="10" y="22" width="28" height="22" rx="4" />
        <path d="M14,22 L14,14 A10,10 0 0,1 34,14 L34,22" />
        <circle cx="24" cy="30" r="3" />
        <path d="M24,33 L24,38" />
      </g>
    </svg>
  );
}

// Reading order down the pipeline; the scene alternates card sides itself.
const CHAPTERS: { key: string; fitting: FittingKind; Icon: (props: { size?: number | string }) => JSX.Element }[] = [
  { key: "missiya", fitting: "coupling", Icon: MissiyaIcon },
  { key: "vizyon2030", fitting: "elbow", Icon: Vizyon2030Icon },
  { key: "no1", fitting: "tee", Icon: No1Icon },
  { key: "sifat", fitting: "valve", Icon: SifatIcon },
  { key: "innovatsiya", fitting: "tee", Icon: InnovatsiyaIcon },
  { key: "xavfsizlik", fitting: "coupling", Icon: XavfsizlikIcon },
];

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

      <PipelineStory finale={{ kind: "tank", caption: t("finale.caption") }}>
        {CHAPTERS.map(({ key, fitting, Icon }) => (
          <PipelineChapter key={key} fitting={fitting} title={t(`chapters.${key}.title`)}>
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-accent/20 bg-accent/[0.08] text-accent dark:bg-accent/[0.12]">
              <Icon size={20} />
            </span>
            <p>{t(`chapters.${key}.body`)}</p>
          </PipelineChapter>
        ))}
      </PipelineStory>
    </div>
  );
}
