import { unstable_setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/PageHeader";
import { BatchCalculator } from "@/components/tools/BatchCalculator";
import { getProducts, getPackageGroups } from "@/lib/content/loader";
import type { Locale } from "@/i18n/routing";

export default async function CalculatorPage({ params: { locale } }: { params: { locale: Locale } }) {
  unstable_setRequestLocale(locale);

  const [products, packageGroups] = await Promise.all([getProducts(locale), getPackageGroups(locale)]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <PageHeader
        path="/tools/calculator"
        title="Partiya kalkulyatori"
        description="Miqdor, birlik narxi va hamkorlik paketiga qarab yakuniy summani hisoblang — narxni operator o'zi kiritadi, chegirma va avans foizlari mavjud paketlar ma'lumotidan olinadi."
      />
      <BatchCalculator products={products} packageGroups={packageGroups} />
    </div>
  );
}
