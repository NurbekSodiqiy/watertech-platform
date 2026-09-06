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
  { slug: "product-line-a-dn32", name: "[A turkumi — DN32]", sku: "SKU-0001", category: "Quvurlar", segment: "Turar-joy", price: "$—.—", inStock: true },
  { slug: "product-line-a-dn50", name: "[A turkumi — DN50]", sku: "SKU-0002", category: "Quvurlar", segment: "Turar-joy", price: "$—.—", inStock: true },
  { slug: "product-line-b-fitting-x", name: "[B turkumi — Fitting X]", sku: "SKU-0101", category: "Fitinglar", segment: "Tijorat", price: "$—.—", inStock: false },
  { slug: "product-line-b-fitting-y", name: "[B turkumi — Fitting Y]", sku: "SKU-0102", category: "Fitinglar", segment: "Tijorat", price: "$—.—", inStock: true },
  { slug: "product-line-c-valve-1", name: "[C turkumi — Ventil 1]", sku: "SKU-0201", category: "Ventillar", segment: "Sanoat", price: "$—.—", inStock: true },
  { slug: "product-line-c-valve-2", name: "[C turkumi — Ventil 2]", sku: "SKU-0202", category: "Ventillar", segment: "Sanoat", price: "$—.—", inStock: false },
  { slug: "product-line-d-manifold", name: "[D turkumi — Kollektor]", sku: "SKU-0301", category: "Kollektorlar", segment: "Tijorat", price: "$—.—", inStock: true },
  { slug: "product-line-e-insulation", name: "[E turkumi — Izolyatsiya to'plami]", sku: "SKU-0401", category: "Aksessuarlar", segment: "Turar-joy", price: "$—.—", inStock: true },
];
