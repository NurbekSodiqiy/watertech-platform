import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/PageHeader";
import { BatchCalculator } from "@/components/tools/BatchCalculator";
import { WidgetBoundary } from "@/components/ui/WidgetBoundary";
import { getProducts, getPackageGroups } from "@/lib/content/loader";
import type { Locale } from "@/i18n/routing";

export default async function CalculatorPage({ params: { locale } }: { params: { locale: Locale } }) {
  unstable_setRequestLocale(locale);

  const [products, packageGroups, t] = await Promise.all([
    getProducts(locale),
    getPackageGroups(locale),
    getTranslations("pages.tools.calculator"),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <PageHeader path="/tools/calculator" title={t("title")} description={t("description")} />
      <WidgetBoundary>
        <BatchCalculator products={products} packageGroups={packageGroups} />
      </WidgetBoundary>
    </div>
  );
}
