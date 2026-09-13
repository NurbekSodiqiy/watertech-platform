import { PageHeader } from "@/components/DocPageTemplate";
import { ProductsCatalog } from "@/components/products/ProductsCatalog";
import { getProducts } from "@/lib/content/loader";

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <PageHeader
        path="/products"
        title="Mahsulotlar katalogi"
        description="To'liq mahsulot bazasi. PPR va Kanalizatsiya liniyalari bo'yicha turkum, nom va o'lchamlar."
      />
      <ProductsCatalog products={products} />
    </div>
  );
}
