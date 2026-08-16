import type { RecommendedEnhancement } from "@/types/enhancementRecommendation";

const STORAGE_KEY = "skinDiscoveryEnhancementRecommendations";

export function readStoredEnhancementRecommendation(): RecommendedEnhancement[] {
  if (typeof window === "undefined") {
    return [];
  }

  const rawValue = window.sessionStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item): item is RecommendedEnhancement =>
        item && typeof item === "object" && typeof item.enhancementId === "string" && typeof item.name === "string",
    );
  } catch {
    return [];
  }
}

export function writeEnhancementRecommendationToStorage(result: RecommendedEnhancement[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
}

export function clearEnhancementRecommendationSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(STORAGE_KEY);
}
