export interface MockProduct {
  slug: string;
  name: string;
  sku: string;
  category: string;
  segment: string;
  price: string;
  inStock: boolean;
}

export const products: MockProduct[] = [
  { slug: "product-line-a-dn32", name: "[Product Line A — DN32]", sku: "SKU-0001", category: "Pipes", segment: "Residential", price: "$—.—", inStock: true },
  { slug: "product-line-a-dn50", name: "[Product Line A — DN50]", sku: "SKU-0002", category: "Pipes", segment: "Residential", price: "$—.—", inStock: true },
  { slug: "product-line-b-fitting-x", name: "[Product Line B — Fitting X]", sku: "SKU-0101", category: "Fittings", segment: "Commercial", price: "$—.—", inStock: false },
  { slug: "product-line-b-fitting-y", name: "[Product Line B — Fitting Y]", sku: "SKU-0102", category: "Fittings", segment: "Commercial", price: "$—.—", inStock: true },
  { slug: "product-line-c-valve-1", name: "[Product Line C — Valve 1]", sku: "SKU-0201", category: "Valves", segment: "Industrial", price: "$—.—", inStock: true },
  { slug: "product-line-c-valve-2", name: "[Product Line C — Valve 2]", sku: "SKU-0202", category: "Valves", segment: "Industrial", price: "$—.—", inStock: false },
  { slug: "product-line-d-manifold", name: "[Product Line D — Manifold]", sku: "SKU-0301", category: "Manifolds", segment: "Commercial", price: "$—.—", inStock: true },
  { slug: "product-line-e-insulation", name: "[Product Line E — Insulation Kit]", sku: "SKU-0401", category: "Accessories", segment: "Residential", price: "$—.—", inStock: true },
];
