import { enhancementCatalog } from "@/data/enhancementCatalog";
import type { Enhancement, RecommendedEnhancement } from "@/types/enhancementRecommendation";
import type { RecommendationResult } from "@/types/recommendation";

export const seasonalEnhancementsEnabled = false;

type SelectedAnswers = {
  primaryMotivation: string | null;
  skinExperience: string[];
  desiredOutcomes: string[];
};

const minimumRelevanceScore = 24;

const sensitivitySignals = new Set([
  "sensitive",
  "easily-irritated",
  "reacts-to-products",
  "feel-calmer",
  "sensitivity",
  "reactivity",
]);

const signalBonuses: Record<string, Partial<Record<string, number>>> = {
  aging: {
    microcurrent: 12,
    "decollate-treatment": 10,
    "farmhouse-fresh-peel": 9,
    dermaplaning: 8,
  },
  "fine lines": {
    microcurrent: 8,
    "decollate-treatment": 7,
    dermaplaning: 6,
  },
  firmness: {
    microcurrent: 10,
    "decollate-treatment": 9,
    dermaplaning: 7,
  },
  smoothness: {
    microcurrent: 7,
    dermaplaning: 7,
    "decollate-treatment": 7,
  },
  dullness: {
    dermaplaning: 8,
    "farmhouse-fresh-peel": 10,
    "led-light-therapy": 6,
  },
  brightness: {
    dermaplaning: 8,
    "farmhouse-fresh-peel": 10,
    "led-light-therapy": 6,
  },
  radiance: {
    dermaplaning: 7,
    "farmhouse-fresh-peel": 8,
    "led-light-therapy": 7,
  },
  dryness: {
    dermaplaning: 8,
    "decollate-treatment": 8,
    "warm-hand-treatment": 7,
    "warm-foot-treatment": 7,
  },
  dehydration: {
    dermaplaning: 8,
    "decollate-treatment": 8,
    "warm-hand-treatment": 7,
    "warm-foot-treatment": 7,
  },
  hydration: {
    dermaplaning: 6,
    "decollate-treatment": 7,
    "warm-hand-treatment": 7,
    "warm-foot-treatment": 7,
  },
  comfort: {
    "cooling-eye-treatment": 9,
    "led-light-therapy": 5,
  },
  calm: {
    "cooling-eye-treatment": 9,
    "led-light-therapy": 8,
  },
  sensitivity: {
    "led-light-therapy": 9,
    "cooling-eye-treatment": 10,
  },
  reactivity: {
    "led-light-therapy": 9,
    "cooling-eye-treatment": 10,
  },
  "eye concerns": {
    "cooling-eye-treatment": 12,
  },
  "tired-looking skin": {
    "cooling-eye-treatment": 8,
  },
  congestion: {
    "led-light-therapy": 8,
  },
  clarity: {
    "led-light-therapy": 8,
  },
  oil: {
    "led-light-therapy": 6,
  },
  support: {
    "led-light-therapy": 6,
  },
};

const answerKeywordMap: Record<string, string[]> = {
  aging: ["aging", "firmness", "texture", "smoothness"],
  "fine-lines-texture": ["aging", "firmness", "texture", "smoothness"],
  "feel-firmer-smoother": ["aging", "firmness", "texture", "smoothness"],
  "dry-dehydrated": ["dryness", "dehydration", "hydration", "comfort"],
  "tight-after-cleansing": ["dryness", "dehydration", "hydration", "comfort"],
  "dry-throughout-day": ["dryness", "dehydration", "hydration", "comfort"],
  "feel-more-hydrated": ["dryness", "dehydration", "hydration", "comfort"],
  sensitive: ["sensitivity", "calm", "comfort", "reactivity"],
  "easily-irritated": ["sensitivity", "calm", "comfort", "reactivity"],
  "reacts-to-products": ["sensitivity", "calm", "comfort", "reactivity"],
  "feel-calmer": ["sensitivity", "calm", "comfort", "reactivity"],
  radiant: ["radiance", "brightness", "glow"],
  "dull-lacks-radiance": ["radiance", "brightness", "glow", "dullness"],
  "look-brighter": ["radiance", "brightness", "glow", "dullness"],
  clearer: ["clarity", "congestion", "balance"],
  "oily-throughout-day": ["clarity", "oil", "balance"],
  "clogged-pores-breakouts": ["clarity", "congestion", "balance"],
  "stay-clearer": ["clarity", "congestion", "balance"],
  "healthy": ["balance", "support"],
  "stay-healthy-balanced": ["balance", "support"],
  "comfortable-balanced": ["calm", "comfort", "support"],
  "not-sure": ["support"],
  "healthier": ["support", "balance"],
};

function normalizeKey(value: string | null | undefined): string {
  return String(value ?? "").trim().toLowerCase();
}

function collectAnswerKeywords(selectedAnswers: SelectedAnswers): Set<string> {
  const keys = new Set<string>();

  const values = [
    selectedAnswers.primaryMotivation,
    ...selectedAnswers.skinExperience,
    ...selectedAnswers.desiredOutcomes,
  ];

  for (const value of values) {
    const normalized = normalizeKey(value);
    if (!normalized) {
      continue;
    }
    keys.add(normalized);

    const mapped = answerKeywordMap[normalized] ?? [];
    for (const keyword of mapped) {
      keys.add(keyword);
    }
  }

  return keys;
}

function strongCalmReactive(selectedAnswers: SelectedAnswers): boolean {
  const values = [
    selectedAnswers.primaryMotivation,
    ...selectedAnswers.skinExperience,
    ...selectedAnswers.desiredOutcomes,
  ]
    .map(normalizeKey)
    .filter(Boolean);

  return values.some((value) => sensitivitySignals.has(value));
}

function getJourneySet(journeyResult: RecommendationResult): Set<string> {
  return new Set([...journeyResult.primaryJourneys, ...(journeyResult.secondaryJourney ? [journeyResult.secondaryJourney] : [])].map(String));
}

function generateMatchReasons(enhancement: Enhancement, journeyResult: RecommendationResult, keywordSet: Set<string>): string[] {
  const reasons: string[] = [];

  const primaryJourney = journeyResult.primaryJourneys[0] ?? null;

  if (primaryJourney && (enhancement.journeyAffinity[primaryJourney] ?? 0) > 0) {
    reasons.push(`Matches your ${primaryJourney} priority.`);
  }

  if (journeyResult.secondaryJourney && (enhancement.journeyAffinity[journeyResult.secondaryJourney] ?? 0) > 0) {
    reasons.push(`Supports your ${journeyResult.secondaryJourney} direction.`);
  }

  const matchedKeywords = enhancement.skinSignals.filter((signal) => keywordSet.has(signal.toLowerCase()));
  if (matchedKeywords.length > 0) {
    reasons.push(`Fits the signals you shared around ${matchedKeywords[0]}.`);
  }

  if (enhancement.category === "comfort-experience" && keywordSet.has("comfort")) {
    reasons.push("Adds a comfort-forward finishing touch.");
  }

  if (enhancement.category === "results-driven" && keywordSet.has("aging")) {
    reasons.push("Builds around the renewal and smoothness signals you highlighted.");
  }

  if (reasons.length === 0) {
    reasons.push(enhancement.guestBenefit);
  }

  return reasons.slice(0, 2);
}

function isEligible(
  enhancement: Enhancement,
  journeyResult: RecommendationResult,
  keywordSet: Set<string>,
  selectedAnswers: SelectedAnswers,
): boolean {
  const strongSensitivity = strongCalmReactive(selectedAnswers);

  if (enhancement.calmSensitiveCaution && strongSensitivity) {
    return false;
  }

  if (enhancement.seasonal && !seasonalEnhancementsEnabled) {
    return false;
  }

  const journeySet = getJourneySet(journeyResult);
  const journeyAffinityMatch = Object.entries(enhancement.journeyAffinity).some(
    ([journeyKey, score]) => score > 0 && journeySet.has(journeyKey),
  );

  const keywordMatch = enhancement.skinSignals.some((signal) => {
    const normalized = signal.toLowerCase();
    return (
      !["support", "balance", "comfort", "calm"].includes(normalized) &&
      (keywordSet.has(normalized) || [...keywordSet].some((keyword) => keyword.includes(normalized)))
    );
  });

  if (enhancement.universalEligible) {
    if (!journeyAffinityMatch) {
      return false;
    }

    if (!strongSensitivity && !keywordMatch) {
      return false;
    }
  } else if (!journeyAffinityMatch && !keywordMatch) {
    return false;
  }

  if (enhancement.name === "FarmHouse Fresh Peel" && strongSensitivity) {
    return false;
  }

  return true;
}

function scoreEnhancement(
  enhancement: Enhancement,
  journeyResult: RecommendationResult,
  keywordSet: Set<string>,
): number {
  const primaryJourneys = journeyResult.primaryJourneys;
  const secondaryJourney = journeyResult.secondaryJourney;
  let score = 0;

  const journeySet = getJourneySet(journeyResult);

  for (const [journeyKey, weight] of Object.entries(enhancement.journeyAffinity)) {
    if (!weight) continue;

    if (primaryJourneys.includes(journeyKey as keyof typeof journeyResult.scores)) {
      score += weight * 11;
    }
    if (secondaryJourney === journeyKey) {
      score += weight * 4;
    }
    if (journeySet.has(journeyKey) && !primaryJourneys.includes(journeyKey as keyof typeof journeyResult.scores) && secondaryJourney !== journeyKey) {
      score += weight * 1.5;
    }
  }

  for (const signal of enhancement.skinSignals) {
    const normalized = signal.toLowerCase();
    if (keywordSet.has(normalized)) {
      score += 8;
    }

    const bonus = signalBonuses[normalized]?.[enhancement.id] ?? 0;
    if (bonus) {
      score += bonus;
    }
  }

  if (enhancement.universalEligible) {
    score += 0;
  }

  if (enhancement.category === "results-driven") {
    score += 2;
  }

  if (enhancement.category === "comfort-experience") {
    score += 1;
  }

  if (enhancement.name === "LED Light Therapy" && (journeyResult.resultType === "single-primary" || journeyResult.resultType === "dual-primary")) {
    score -= 2;
  }

  if (enhancement.name === "Cooling Eye Treatment" && !journeySet.has("calm") && !keywordSet.has("comfort") && !keywordSet.has("brightness")) {
    score -= 3;
  }

  if (enhancement.name === "FarmHouse Fresh Peel" && keywordSet.has("sensitivity")) {
    score -= 12;
  }

  return score;
}

export function generateEnhancementRecommendation({
  journeyResult,
  selectedAnswers,
  seasonalEnhancementsEnabled: overrideSeasonal = seasonalEnhancementsEnabled,
}: {
  journeyResult: RecommendationResult;
  selectedAnswers: SelectedAnswers;
  seasonalEnhancementsEnabled?: boolean;
}): RecommendedEnhancement[] {
  const keywordSet = collectAnswerKeywords(selectedAnswers);
  const candidates = enhancementCatalog
    .filter((enhancement) => isEligible(enhancement, journeyResult, keywordSet, selectedAnswers))
    .map((enhancement) => {
      const baseScore = scoreEnhancement(enhancement, journeyResult, keywordSet);
      return {
        enhancementId: enhancement.id,
        name: enhancement.name,
        category: enhancement.category,
        guestBenefit: enhancement.guestBenefit,
        matchReasons: generateMatchReasons(enhancement, journeyResult, keywordSet),
        skintenderReviewRecommended: Boolean(enhancement.requiresSkintenderReview),
        internalScore: baseScore,
      } satisfies RecommendedEnhancement;
    })
    .filter((item) => item.internalScore > 0)
    .sort((left, right) => right.internalScore - left.internalScore);

  const seasonalCandidates = overrideSeasonal
    ? candidates
    : candidates.filter((item) => !["Warm Hand Treatment", "Warm Foot Treatment"].includes(item.name));

  const qualifiedCandidates = seasonalCandidates.filter((item) => item.internalScore >= minimumRelevanceScore);

  if (qualifiedCandidates.length === 0) {
    return [];
  }

  const result: RecommendedEnhancement[] = [];
  for (const candidate of qualifiedCandidates) {
    if (result.length >= 2) break;

    const sameCategoryCount = result.filter((entry) => entry.category === candidate.category).length;
    const hasDifferentCategoryAlternative = qualifiedCandidates
      .filter((entry) => entry.enhancementId !== candidate.enhancementId)
      .some((entry) => entry.category !== candidate.category && entry.internalScore >= candidate.internalScore - 2);

    if (sameCategoryCount >= 1 && candidate.category === result[0]?.category && hasDifferentCategoryAlternative) {
      continue;
    }

    result.push(candidate);
  }

  if (result.length === 0) {
    return [];
  }

  return result.slice(0, 2);
}
