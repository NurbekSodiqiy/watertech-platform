import { PageHeader } from "@/components/DocPageTemplate";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { getMockMeta } from "@/lib/site-config";
import { products } from "@/lib/mock-data/products";

const columns: DbColumn[] = [
  { key: "name", label: "Mahsulot", sortable: true },
  { key: "sku", label: "SKU" },
  { key: "category", label: "Toifa", sortable: true },
  { key: "segment", label: "Segment" },
  { key: "price", label: "Narx" },
  { key: "inStock", label: "Ombor", type: "stock" },
];

export default function ProductsPage() {
  const meta = getMockMeta("/products");
  const categories = Array.from(new Set(products.map((p) => p.category)));
  const segments = Array.from(new Set(products.map((p) => p.segment)));

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <PageHeader
        path="/products"
        title="Mahsulotlar katalogi"
        description="To'liq mahsulot va narx bazasi. Toifa, segment yoki ombor holati bo'yicha filtrlang."
        meta={meta}
      />
      <DatabaseTemplate
        columns={columns}
        rows={products}
        filters={[
          { key: "category", label: "Toifa", options: categories },
          { key: "segment", label: "Segment", options: segments },
        ]}
        linkBase="/products"
        linkKey="slug"
      />
    </div>
  );
}
