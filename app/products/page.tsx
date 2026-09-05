import { PageHeader } from "@/components/DocPageTemplate";
import { DatabaseTemplate, DbColumn } from "@/components/DatabaseTemplate";
import { getMockMeta } from "@/lib/site-config";
import { products } from "@/lib/mock-data/products";

const columns: DbColumn[] = [
  { key: "name", label: "Product", sortable: true },
  { key: "sku", label: "SKU" },
  { key: "category", label: "Category", sortable: true },
  { key: "segment", label: "Segment" },
  { key: "price", label: "Price" },
  { key: "inStock", label: "Stock", type: "stock" },
];

export default function ProductsPage() {
  const meta = getMockMeta("/products");
  const categories = Array.from(new Set(products.map((p) => p.category)));
  const segments = Array.from(new Set(products.map((p) => p.segment)));

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <PageHeader
        path="/products"
        title="Product Catalog"
        description="Full product & pricing database. Filter by category, segment, or stock status."
        meta={meta}
      />
      <DatabaseTemplate
        columns={columns}
        rows={products}
        filters={[
          { key: "category", label: "Category", options: categories },
          { key: "segment", label: "Segment", options: segments },
        ]}
        linkBase="/products"
        linkKey="slug"
      />
    </div>
  );
}
