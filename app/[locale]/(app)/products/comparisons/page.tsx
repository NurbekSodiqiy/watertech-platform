import { unstable_setRequestLocale, getTranslations } from "next-intl/server";
import { DocPageTemplate } from "@/components/DocPageTemplate";
import { EmptyState } from "@/components/EmptyState";
import { findNode } from "@/lib/site-config";

export default async function ComparisonsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations("emptyState.comparisonsNone");

  const path = "/products/comparisons";
  const node = findNode(path);

  return (
    <DocPageTemplate
      path={path}
      title={node?.title || "Taqqoslash"}
      description={node?.description}
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
