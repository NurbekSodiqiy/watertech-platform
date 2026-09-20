import type { Metadata } from "next";
import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { DocPageTemplate } from "@/components/DocPageTemplate";
import { EmptyState } from "@/components/EmptyState";
import { findNode } from "@/lib/site-config";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("products.comparisons.title") };
}

export default async function ComparisonsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const [tNav, t] = await Promise.all([getTranslations("nav"), getTranslations("emptyState.comparisonsNone")]);

  const path = "/products/comparisons";
  const node = findNode(path);

  return (
    <DocPageTemplate
      path={path}
      title={tNav("products.comparisons.title")}
      description={node?.description ? tNav(node.description) : undefined}
      locked={node?.locked}
    >
      <EmptyState
        stateKey="comparisonsNone"
        title={t("title")}
        reason={t("reason")}
        action={{ label: t("cta"), href: "/products" }}
      />
    </DocPageTemplate>
  );
}
