import type { Product } from "@/types/productRecommendation";

type ProductCatalogResponse = {
  success: boolean;
  productCount: number;
  products: Product[];
};

export async function fetchProductCatalog(): Promise<Product[]> {
  const response = await fetch("/api/product-catalog", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Could not load Fresh Method product catalog.");
  }

  const data = (await response.json()) as ProductCatalogResponse;

  if (!data.success || !Array.isArray(data.products)) {
    throw new Error("Fresh Method product catalog response was invalid.");
  }

  return data.products;
}