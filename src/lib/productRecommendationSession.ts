import { readStoredRecommendation } from "@/lib/recommendationSession";
import type { ProductRecommendationResult } from "@/types/productRecommendation";

const STORAGE_KEY = "skinDiscoveryProductRecommendations";
const STORAGE_VERSION = 2;

type StoredProductRecommendation = {
  version: number;
  fingerprint: string;
  result: ProductRecommendationResult;
};

export function readStoredProductRecommendation(
  expectedFingerprint: string,
): ProductRecommendationResult | null {
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
  typeof parsed.fingerprint !== "string" ||
  parsed.fingerprint !== expectedFingerprint ||
  !parsed.result
) {
  return null;
}

  return parsed.result;
} catch {
  return null;
}
}

export function writeProductRecommendationToStorage(
  result: ProductRecommendationResult,
  fingerprint: string,
) {
  if (typeof window === "undefined") {
    return;
  }

  const storedRecommendation: StoredProductRecommendation = {
    version: STORAGE_VERSION,
    fingerprint,
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
