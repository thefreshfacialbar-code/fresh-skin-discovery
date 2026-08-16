import { readStoredRecommendation } from "@/lib/recommendationSession";
import type { ProductRecommendationResult } from "@/types/productRecommendation";

const STORAGE_KEY = "skinDiscoveryProductRecommendations";

export function readStoredProductRecommendation(): ProductRecommendationResult | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    return parsed && typeof parsed === "object" ? (parsed as ProductRecommendationResult) : null;
  } catch {
    return null;
  }
}

export function writeProductRecommendationToStorage(result: ProductRecommendationResult) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
}

export function readStoredJourneyRecommendation() {
  return readStoredRecommendation();
}

export function clearProductRecommendationSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(STORAGE_KEY);
}
