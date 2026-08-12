import {
  allKnownAnswerIds,
  desiredOutcomeMatrix,
  primaryMotivationMatrix,
  skinExperienceMatrix,
} from "../data/scoringMatrix";
import type {
  RecommendationInput,
  RecommendationResult,
} from "../types/recommendation";

function parseStoredStringArray(rawValue: string | null): string[] {
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return [...new Set(parsed.filter((value): value is string => typeof value === "string"))];
  } catch {
    return [];
  }
}

export function readRecommendationInputFromStorage(): RecommendationInput | null {
  if (typeof window === "undefined") {
    return null;
  }

  const primaryMotivationValue = window.sessionStorage.getItem("skinDiscoveryPrimaryMotivation");
  const skinExperience = parseStoredStringArray(
    window.sessionStorage.getItem("skinDiscoverySkinExperience"),
  ).filter((answerId) => Boolean(skinExperienceMatrix[answerId]));
  const desiredOutcomes = parseStoredStringArray(
    window.sessionStorage.getItem("skinDiscoveryDesiredOutcomes"),
  ).filter((answerId) => Boolean(desiredOutcomeMatrix[answerId]));

  const primaryMotivation =
    primaryMotivationValue && primaryMotivationMatrix[primaryMotivationValue]
      ? primaryMotivationValue
      : null;

  if (!primaryMotivation && skinExperience.length === 0 && desiredOutcomes.length === 0) {
    return null;
  }

  return {
    primaryMotivation,
    skinExperience,
    desiredOutcomes,
  };
}

export function writeRecommendationToStorage(result: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem("skinDiscoveryRecommendation", JSON.stringify(result));
}

function isRecommendationResult(value: unknown): value is RecommendationResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.resultType === "string" &&
    Array.isArray(candidate.primaryJourneys) &&
    Array.isArray(candidate.scores) === false &&
    Array.isArray(candidate.supports) === false &&
    typeof candidate.selectedAnswers === "object" &&
    candidate.selectedAnswers !== null
  );
}

export function readStoredRecommendation(): RecommendationResult | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem("skinDiscoveryRecommendation");

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    return isRecommendationResult(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function isKnownAnswerId(answerId: string | null | undefined) {
  return Boolean(answerId && allKnownAnswerIds.has(answerId));
}
