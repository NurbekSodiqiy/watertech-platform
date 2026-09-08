export interface MockProduct {
  slug: string;
  name: string;
  sku: string;
  category: string;
  segment: string;
  price: string;
  inStock: boolean;
  material?: string;
}

export const products: MockProduct[] = [];
