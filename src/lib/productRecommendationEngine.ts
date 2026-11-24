import { isRecommendationActive } from "@/lib/productActivationPolicy";
// Product data and exclusions are supplied by Supabase.

import type {
  Product,
  ProductCategory,
  ProductRecommendationResult,
  RecommendedProduct,
} from "@/types/productRecommendation";
import type { JourneyId, RecommendationResult } from "@/types/recommendation";
import {
  evaluateProductEligibility,
} from "@/lib/productEligibilityPolicies";


const FEATURED_SLOT_MAP: Record<"cleanse" | "treat" | "moisturize" | "protect", ProductCategory> = {
  cleanse: "Cleanser",
  treat: "Serum & Treatment",
  moisturize: "Moisturizer",
  protect: "Sun Protection",
};

const TARGETED_TREATMENT_CATEGORIES: ProductCategory[] = ["Serum & Treatment", "Exfoliant", "Mask"];


function isStrongCalmReactive(selectedAnswers: { primaryMotivation: string | null; skinExperience: string[]; desiredOutcomes: string[] }): boolean {
  const answerSet = normalizeSelectedAnswers(selectedAnswers);
  const sensitivitySignals = ["sensitive", "easily-irritated", "reacts-to-products", "feel-calmer"];
  return [...answerSet].some((answer) => sensitivitySignals.includes(answer));
}

function normalizeSelectedAnswers(selectedAnswers: {
  primaryMotivation: string | null;
  skinExperience: string[];
  desiredOutcomes: string[];
}) 
{
  const values = [
    selectedAnswers.primaryMotivation,
    ...selectedAnswers.skinExperience,
    ...selectedAnswers.desiredOutcomes,
  ].filter(Boolean) as string[];

  return new Set(values);
}
function isSupabasePolicyEligible(
  product: Product,
  primaryJourneys: JourneyId[],
  secondaryJourney: JourneyId | null,
  selectedAnswers: {
    primaryMotivation: string | null;
    skinExperience: string[];
    desiredOutcomes: string[];
  },
): boolean {
  if (!product.eligibilityRules) {
    return true;
  }

  return evaluateProductEligibility(
    product.eligibilityRules,
    {
      primaryJourneys,
      secondaryJourney,
      selectedAnswers: [
        ...normalizeSelectedAnswers(selectedAnswers),
      ],
    }
  );
}






function createMatchReasons(product: Product, primaryJourneys: JourneyId[], secondaryJourney: JourneyId | null) {
  const reasons: string[] = [];
  const primary = primaryJourneys[0] ?? null;

  if (primary && product.primaryJourney === primary) {
    reasons.push(`Matches your ${primary} priority with a strong fit for your skin.`);
  }

  if (secondaryJourney && product.primaryJourney === secondaryJourney) {
    reasons.push(`Supports the secondary ${secondaryJourney} direction that also showed up in your answers.`);
  }

  if (primary && product.supportingJourney === primary) {
    reasons.push(`Builds on your ${primary} direction without overcomplicating your routine.`);
  }

  if (product.role.toLowerCase().includes("hydrate") || product.role.toLowerCase().includes("comfort")) {
    reasons.push(product.guestBenefit);
  }

  if (reasons.length === 0) {
    reasons.push(product.guestBenefit);
  }

  return reasons.slice(0, 2);
}

function addModifierSignals(
  selectedAnswers: { primaryMotivation: string | null; skinExperience: string[]; desiredOutcomes: string[] },
): string[] {
  const answerSet = normalizeSelectedAnswers(selectedAnswers);
  const modifiers = new Set<string>();

  const hydrationSignals = [
    "dry-dehydrated",
    "tight-after-cleansing",
    "dry-throughout-day",
    "feel-more-hydrated",
  ];
  const sensitivitySignals = ["sensitive", "easily-irritated", "reacts-to-products", "feel-calmer"];
  const congestionSignals = ["clearer", "oily-throughout-day", "clogged-pores-breakouts", "stay-clearer"];
  const brightnessSignals = ["radiant", "dull-lacks-radiance", "look-brighter"];
  const renewalSignals = ["aging", "fine-lines-texture", "feel-firmer-smoother"];

  if ([...answerSet].some((answer) => hydrationSignals.includes(answer))) {
    modifiers.add("Hydration support");
  }

  if ([...answerSet].some((answer) => sensitivitySignals.includes(answer))) {
    modifiers.add("Sensitivity protection");
  }

  if ([...answerSet].some((answer) => congestionSignals.includes(answer))) {
    modifiers.add("Clarity and balance");
  }

  if ([...answerSet].some((answer) => brightnessSignals.includes(answer))) {
    modifiers.add("Radiance boost");
  }

  if ([...answerSet].some((answer) => renewalSignals.includes(answer))) {
    modifiers.add("Renewal support");
  }

  return [...modifiers];
}

function scoreProduct(
  product: Product,
  primaryJourneys: JourneyId[],
  secondaryJourney: JourneyId | null,
  selectedAnswers: { primaryMotivation: string | null; skinExperience: string[]; desiredOutcomes: string[] },
): number {
  const answerSet = normalizeSelectedAnswers(selectedAnswers);
  let score = 0;

  const primarySet = new Set(primaryJourneys);
 

  if (primarySet.has(product.primaryJourney)) {
    score += 10;
  }
  if (primarySet.has(product.supportingJourney)) {
    score += 5;
  }
  if (secondaryJourney && product.primaryJourney === secondaryJourney) {
    score += 4;
  }
  if (secondaryJourney && product.supportingJourney === secondaryJourney) {
    score += 2;
  }
  if (secondaryJourney && primarySet.has(product.primaryJourney) && product.supportingJourney === secondaryJourney) {
    score += 4;
  }
  if (secondaryJourney && primarySet.has(product.supportingJourney) && product.primaryJourney === secondaryJourney) {
    score += 3;
  }

 if (primarySet.has("purify") || secondaryJourney === "purify") {
  if (
    product.primaryJourney === "purify" ||
    product.supportingJourney === "purify"
  ) {
    score += 10;
  }
}

  const hydrationSignals = [
    "dry-dehydrated",
    "tight-after-cleansing",
    "dry-throughout-day",
    "feel-more-hydrated",
  ];
  const sensitivitySignals = ["sensitive", "easily-irritated", "reacts-to-products", "feel-calmer"];
  const congestionSignals = ["clearer", "oily-throughout-day", "clogged-pores-breakouts", "stay-clearer"];
  const brightnessSignals = ["radiant", "dull-lacks-radiance", "look-brighter"];
  const renewalSignals = ["aging", "fine-lines-texture", "feel-firmer-smoother"];

  if ([...answerSet].some((answer) => hydrationSignals.includes(answer))) {
    if (["quench", "calm"].includes(product.primaryJourney) || ["quench", "calm"].includes(product.supportingJourney)) {
      if (["Hydrate", "Replenish", "Restore", "Comfort", "Reset", "Refresh", "Balance"].includes(product.role)) {
        score += 4;
      }
    }
  }

  if ([...answerSet].some((answer) => sensitivitySignals.includes(answer))) {
    if (product.calmSensitiveCaution) {
      score -= 16;
    }
    if (product.intensity <= 2) {
      score += 5;
    } else {
      score -= 8;
    }
  }

  if ([...answerSet].some((answer) => congestionSignals.includes(answer))) {
    if (["purify", "calm"].includes(product.primaryJourney) || ["purify", "calm"].includes(product.supportingJourney)) {
      if (["Clarify", "Balance", "Refine"].includes(product.role)) {
        score += 4;
      }
    }
  }

  if ([...answerSet].some((answer) => brightnessSignals.includes(answer))) {
    if (["illuminate", "renew"].includes(product.primaryJourney) || ["illuminate", "renew"].includes(product.supportingJourney)) {
      if (["Brighten", "Glow", "Refine", "Resurface"].includes(product.role)) {
        score += 4;
      }
    }
  }

  if ([...answerSet].some((answer) => renewalSignals.includes(answer))) {
    if (["renew", "illuminate"].includes(product.primaryJourney) || ["renew", "illuminate"].includes(product.supportingJourney)) {
      if (["Renew", "Firm", "Lift", "Refine"].includes(product.role)) {
        score += 4;
      }
    }
  }

  if (product.requiresFarmacistReview) {
    score -= 5;
  }

  if (product.excluded) {
    score -= 999;
  }

  return score;
}
function getExperiencePriority(
  product: Product,
  selectedExperience?: string,
): number {
  if (!selectedExperience) {
    return 100;
  }

  const recommendation = product.experienceRecommendations?.find(
    (item) =>
      item.experienceId === selectedExperience &&
      item.assigned === true &&
      item.approvalStatus === "approved",
  );

  return recommendation?.recommendationPriority ?? 100;
}
function pickFeaturedProduct(
  slot: "cleanse" | "treat" | "moisturize" | "protect",
  eligible: Product[],
  selectedIds: Set<string>,
  primaryJourneys: JourneyId[],
  secondaryJourney: JourneyId | null,
  selectedAnswers: {
    primaryMotivation: string | null;
    skinExperience: string[];
    desiredOutcomes: string[];
  },
  selectedExperience?: string,
): RecommendedProduct | null {
  const category = FEATURED_SLOT_MAP[slot];
  const answerSet = normalizeSelectedAnswers(selectedAnswers);
  let pool = eligible.filter((product) => {
    if (selectedIds.has(product.id)) {
      return false;
    }
if (product.featuredEligible === false) {
  return false;
}
    if (slot === "treat") {
      if (!TARGETED_TREATMENT_CATEGORIES.includes(product.category)) {
        return false;
      }
    } else if (product.category !== category) {
      return false;
    }

    if (product.name === "TiZO Lip Protection") {
      return false;
    }
    if (product.requiresFarmacistReview && slot !== "treat") {
      return false;
    }
    return product.excluded !== true;
  });

  if (slot === "treat") {
    if (selectedExperience === "gentlemens-corner") {
      pool = pool.filter(
        (product) =>
          primaryJourneys.includes(product.primaryJourney) ||
          product.primaryJourney === secondaryJourney,
      );
    }

    const strongCalmReactive = isStrongCalmReactive(selectedAnswers);

  if (strongCalmReactive) {
    pool = pool.filter(
      (product) =>
        product.intensity <= 2 &&
        product.calmSensitiveCaution !== true
    );
  }

  

  pool = pool.filter((product) => {
    if (
      !isSupabasePolicyEligible(
        product,
        primaryJourneys,
        secondaryJourney,
        selectedAnswers
      )
    ) {
      return false;
    }

    // Preserve existing product-specific safeguards.
    

    

    return true;
  });
}
  if (slot === "protect") {
  pool = pool.filter(
    (product) => product.category === "Sun Protection",
  );

  const strongCalm = [...answerSet].some((answer) =>
    [
      "sensitive",
      "easily-irritated",
      "reacts-to-products",
      "feel-calmer",
    ].includes(answer),
  );

  if (strongCalm) {
    pool = pool.filter(
      (product) =>
        product.intensity <= 2 &&
        product.calmSensitiveCaution !== true,
    );
  }
}

  if (pool.length === 0) {
    return null;
  }
  const scored = pool.map((product) => ({
  product,
  score: scoreProduct(
    product,
    primaryJourneys,
    secondaryJourney,
    selectedAnswers,
  ),
}));

const ranked =
  selectedExperience === "gentlemens-corner"
    ? [...scored]
        .sort((left, right) => {
          const leftPrimaryMatch = primaryJourneys.includes(
            left.product.primaryJourney,
          );
          const rightPrimaryMatch = primaryJourneys.includes(
            right.product.primaryJourney,
          );

          if (leftPrimaryMatch !== rightPrimaryMatch) {
            return Number(rightPrimaryMatch) - Number(leftPrimaryMatch);
          }

          const priorityDifference =
            getExperiencePriority(right.product, selectedExperience) -
            getExperiencePriority(left.product, selectedExperience);

          return priorityDifference || right.score - left.score;
        })
        .map((item) => item.product)
    : (() => {
        const highestScore = Math.max(
          ...scored.map((item) => item.score),
        );

        return scored
          .filter((item) => highestScore - item.score <= 2)
          .sort((left, right) => {
            const priorityDifference =
              getExperiencePriority(right.product, selectedExperience) -
              getExperiencePriority(left.product, selectedExperience);

            return priorityDifference || right.score - left.score;
          })
          .map((item) => item.product);
      })();
  const winner = ranked[0];
  selectedIds.add(winner.id);
  return {
    productId: winner.id,
    productName: winner.name,
    category: winner.category,
    role: winner.role,
    guestBenefit: winner.guestBenefit,
    usageType: winner.usageType,
    internalScore: scoreProduct(winner, primaryJourneys, secondaryJourney, selectedAnswers),
    matchReasons: createMatchReasons(winner, primaryJourneys, secondaryJourney),
    farmacistReviewRecommended: Boolean(winner.requiresFarmacistReview),
  };
}

function buildMoreFreshPicks(
  eligible: Product[],
  selectedIds: Set<string>,
  primaryJourneys: JourneyId[],
  secondaryJourney: JourneyId | null,
  selectedAnswers: { primaryMotivation: string | null; skinExperience: string[]; desiredOutcomes: string[] },
  selectedExperience?: string,
): RecommendedProduct[] {
  const optionalCategories: ProductCategory[] = [
    "Tonic",
    "Mask",
    "Exfoliant",
    "Neck & Décolleté",
    "Eye Care",
    "Sun Protection",
    "Serum & Treatment",
  ];
  const chosen: RecommendedProduct[] = [];
  const seenCategories = new Set<ProductCategory>();

  const pool = [...eligible]
    .filter((product) => !selectedIds.has(product.id))
    .filter((product) => product.excluded !== true)
      .filter((product) => {
    if (!isStrongCalmReactive(selectedAnswers)) {
      return true;
    }

    return (
      product.intensity <= 2 &&
      product.calmSensitiveCaution !== true
    );
  })
    .filter((product) => {
  if (
    !isSupabasePolicyEligible(
      product,
      primaryJourneys,
      secondaryJourney,
      selectedAnswers
    )
  ) {
    return false;
  }

  // Preserve existing product-specific safeguards during migration.
  

  

  return true;
})
    .sort((left, right) => {
  const leftScore = scoreProduct(
    left,
    primaryJourneys,
    secondaryJourney,
    selectedAnswers,
  );

  const rightScore = scoreProduct(
    right,
    primaryJourneys,
    secondaryJourney,
    selectedAnswers,
  );

  return rightScore - leftScore;
});

  for (const category of optionalCategories) {
    const categoryCandidates = pool.filter((candidate) => {
  if (candidate.category !== category) return false;
  if (seenCategories.has(category) && category !== "Sun Protection") {
    return false;
  }
  
  if (selectedIds.has(candidate.id)) return false;
  return true;
});

const highestScore =
  categoryCandidates.length > 0
    ? Math.max(
        ...categoryCandidates.map((candidate) =>
          scoreProduct(
            candidate,
            primaryJourneys,
            secondaryJourney,
            selectedAnswers,
          ),
        ),
      )
    : -Infinity;

const product = categoryCandidates
  .filter(
    (candidate) =>
      highestScore -
        scoreProduct(
          candidate,
          primaryJourneys,
          secondaryJourney,
          selectedAnswers,
        ) <= 2,
  )
  .sort((left, right) => {
    const priorityDifference =
      getExperiencePriority(right, selectedExperience) -
      getExperiencePriority(left, selectedExperience);

    if (priorityDifference !== 0) return priorityDifference;

    return (
      scoreProduct(
        right,
        primaryJourneys,
        secondaryJourney,
        selectedAnswers,
      ) -
      scoreProduct(
        left,
        primaryJourneys,
        secondaryJourney,
        selectedAnswers,
      )
    );
  })[0];

    if (!product) {
      continue;
    }

    selectedIds.add(product.id);
    seenCategories.add(category);
    chosen.push({
      productId: product.id,
      productName: product.name,
      category: product.category,
      role: product.role,
      guestBenefit: product.guestBenefit,
      usageType: product.usageType,
      internalScore: scoreProduct(product, primaryJourneys, secondaryJourney, selectedAnswers),
      matchReasons: createMatchReasons(product, primaryJourneys, secondaryJourney),
      farmacistReviewRecommended: Boolean(product.requiresFarmacistReview),
    });

    if (chosen.length >= 4) {
      break;
    }
  }

  return chosen;
}

export function generateProductRecommendation({
  journeyResult,
  selectedAnswers,
  products,
  selectedExperience,
}: {
  journeyResult: RecommendationResult;
  selectedAnswers: {
    primaryMotivation: string | null;
    skinExperience: string[];
    desiredOutcomes: string[];
  };
    products: Product[];
  selectedExperience?: string;
}): ProductRecommendationResult {
  const primaryJourneys = journeyResult.primaryJourneys ?? [];
  const secondaryJourney = journeyResult.secondaryJourney ?? null;

  if (journeyResult.resultType === "no-strong-journey") {
    return {
      featured: {
        cleanse: null,
        treat: null,
        moisturize: null,
        protect: null,
      },
      moreFreshPicks: [],
      journeyContext: {
        primaryJourneys,
        secondaryJourney,
      },
      modifiers: addModifierSignals(selectedAnswers),
      resultType: "needs-farmacist-personalization",
    };
  }

  // A global disable blocks every experience and recommendation surface.
  // For an experience-specific request, a published, assigned and enabled
  // experience record is required. The same pool feeds Featured and Fresh Picks.
  const allEligible = products.filter((product) =>
    isRecommendationActive(product, selectedExperience),
  );

  const selectedIds = new Set<string>();
  const featured = {
    cleanse: pickFeaturedProduct("cleanse", allEligible, selectedIds, primaryJourneys, secondaryJourney, selectedAnswers, selectedExperience,),
    treat: pickFeaturedProduct("treat", allEligible, selectedIds, primaryJourneys, secondaryJourney, selectedAnswers, selectedExperience),
    moisturize: pickFeaturedProduct("moisturize", allEligible, selectedIds, primaryJourneys, secondaryJourney, selectedAnswers, selectedExperience),
    protect: pickFeaturedProduct("protect", allEligible, selectedIds, primaryJourneys, secondaryJourney, selectedAnswers, selectedExperience),
  };

  const moreFreshPicks = buildMoreFreshPicks(
  allEligible,
  selectedIds,
  primaryJourneys,
  secondaryJourney,
  selectedAnswers,
  selectedExperience,
);

  const modifiers = addModifierSignals(selectedAnswers);

  return {
    featured,
    moreFreshPicks,
    journeyContext: {
      primaryJourneys,
      secondaryJourney,
    },
    modifiers,
    resultType: "recommendations-ready",
  };
}


