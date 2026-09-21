import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { DocPageTemplate } from "@/components/DocPageTemplate";
import { findNode } from "@/lib/site-config";
import { CheckCircle2, FileSpreadsheet } from "lucide-react";

const TOPICS = ["orders", "formulas", "filters", "reports"] as const;

export default async function GoogleSheetsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("pages.tools.googleSheets");

  const path = "/tools/google-sheets";
  const node = findNode(path);

  return (
    <DocPageTemplate
      path={path}
      title={t("title")}
      description={node?.description}
    >
      <div className="space-y-6">
        
        {/* Video Player */}
        <div className="rounded-2xl overflow-hidden border border-border bg-surface p-2 shadow-soft">
          <div className="relative aspect-video w-full h-full rounded-xl overflow-hidden bg-surface-alt">
            <iframe
              src="https://www.youtube-nocookie.com/embed/RSpQXvnXe8E?rel=0"
              title={t("videoTitle")}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full border-0"
            />
          </div>
        </div>

        {/* Asosiy mavzular va Shablon */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Mavzular ro'yxati */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft space-y-4">
            <h3 className="text-[17px] font-bold text-primary-dark border-b border-border pb-3">
              {t("topicsHeading")}
            </h3>
            <ul className="space-y-3">
              {TOPICS.map((topic) => (
                <li key={topic} className="flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="text-primary mt-0.5 shrink-0" />
                  <span className="text-[14.5px] text-text-secondary leading-snug">{t(`topics.${topic}`)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Havola */}
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-soft flex flex-col justify-center items-center text-center space-y-4">
            <div className="rounded-full bg-primary/10 p-4 text-primary">
              <FileSpreadsheet size={32} />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-primary-dark">{t("templateHeading")}</h3>
              <p className="text-[13.5px] text-text-secondary mt-1.5 max-w-[260px] mx-auto leading-relaxed">
                {t("templateText")}
              </p>
            </div>
          </div>

        </div>

      </div>
    </DocPageTemplate>
  );
}
