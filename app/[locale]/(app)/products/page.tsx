import type { Metadata } from "next";
import { getTranslations, unstable_setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/PageHeader";
import { ContentFade } from "@/components/motion/ContentFade";
import { ProductsCatalog } from "@/components/products/ProductsCatalog";
import { getProducts } from "@/lib/content/loader";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "pages.products.catalog" });
  return { title: t("title") };
}

export default async function ProductsPage({ params: { locale } }: { params: { locale: Locale } }) {
  unstable_setRequestLocale(locale);

  const [t, products] = await Promise.all([getTranslations("pages.products.catalog"), getProducts(locale)]);

  return (
    <ContentFade className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <PageHeader path="/products" title={t("title")} description={t("description")} />
      <ProductsCatalog products={products} />
    </ContentFade>
  );
}
