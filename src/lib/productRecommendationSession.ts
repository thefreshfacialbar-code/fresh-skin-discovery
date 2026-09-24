import { readStoredRecommendation } from "@/lib/recommendationSession";
import type { ProductRecommendationResult } from "@/types/productRecommendation";

const STORAGE_KEY = "skinDiscoveryProductRecommendations";
const STORAGE_VERSION = 1;

type StoredProductRecommendation = {
  version: number;
  result: ProductRecommendationResult;
};

export function readStoredProductRecommendation(): ProductRecommendationResult | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

try {
  const parsed = JSON.parse(rawValue) as StoredProductRecommendation;

  if (
    !parsed ||
    typeof parsed !== "object" ||
    parsed.version !== STORAGE_VERSION ||
    !parsed.result
  ) {
    return null;
  }

  return parsed.result;
} catch {
  return null;
}
}

export function writeProductRecommendationToStorage(result: ProductRecommendationResult) {
  if (typeof window === "undefined") {
    return;
  }

  const storedRecommendation: StoredProductRecommendation = {
    version: STORAGE_VERSION,
    result,
  };

  window.sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(storedRecommendation),
  );
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
