import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { DocPageTemplate } from "@/components/DocPageTemplate";
import { findNode } from "@/lib/site-config";
import { Clock } from "lucide-react";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("products.roadmap.title") };
}

export default async function RoadmapPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const [tNav, t] = await Promise.all([getTranslations("nav"), getTranslations("pages.products.roadmap")]);

  const path = "/products/roadmap";
  const node = findNode(path);

  return (
    <DocPageTemplate
      path={path}
      title={tNav("products.roadmap.title")}
      description={node?.description ? tNav(node.description) : undefined}
      locked={node?.locked}
    >
      <div className="flex flex-col items-center justify-center space-y-4 py-20 text-center">
        <div className="rounded-full bg-primary/10 p-5 text-primary">
          <Clock size={40} />
        </div>
        <h2 className="text-[22px] font-bold text-primary-dark">{t("soonTitle")}</h2>
        <p className="max-w-md text-[15px] leading-relaxed text-text-secondary">{t("soonBody")}</p>
      </div>
    </DocPageTemplate>
  );
}
