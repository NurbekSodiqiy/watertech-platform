import { PageHeader } from "@/components/DocPageTemplate";
import { BatchCalculator } from "@/components/tools/BatchCalculator";
import { getProducts, getPackageGroups } from "@/lib/content/loader";

export default async function CalculatorPage() {
  const [products, packageGroups] = await Promise.all([getProducts(), getPackageGroups()]);

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
