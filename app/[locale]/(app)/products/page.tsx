import { unstable_setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/PageHeader";
import { ContentFade } from "@/components/motion/ContentFade";
import { ProductsCatalog } from "@/components/products/ProductsCatalog";
import { getProducts } from "@/lib/content/loader";
import type { Locale } from "@/i18n/routing";

export default async function ProductsPage({ params: { locale } }: { params: { locale: Locale } }) {
  unstable_setRequestLocale(locale);

  const products = await getProducts(locale);

  return (
    <ContentFade className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <PageHeader
        path="/products"
        title="Mahsulotlar katalogi"
        description="To'liq mahsulot bazasi. PPR va Kanalizatsiya liniyalari bo'yicha turkum, nom va o'lchamlar."
      />
      <ProductsCatalog products={products} />
    </ContentFade>
  );
}
