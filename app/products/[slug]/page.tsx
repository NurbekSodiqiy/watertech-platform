import { notFound } from "next/navigation";
import { ProductCardTemplate } from "@/components/ProductCardTemplate";
import { getMockMeta } from "@/lib/site-config";
import { products } from "@/lib/mock-data/products";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export default function ProductPage({ params }: { params: { slug: string } }) {
  const product = products.find((p) => p.slug === params.slug);
  if (!product) notFound();

  const meta = getMockMeta(`/products/${params.slug}`);
  return <ProductCardTemplate product={product} meta={meta} />;
}
