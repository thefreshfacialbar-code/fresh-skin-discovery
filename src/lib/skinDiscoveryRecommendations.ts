import { generateEnhancementRecommendation } from "@/lib/enhancementRecommendationEngine";
import {
  readStoredEnhancementRecommendation,
  writeEnhancementRecommendationToStorage,
} from "@/lib/enhancementRecommendationSession";
import { generateProductRecommendation } from "@/lib/productRecommendationEngine";

import {
  readStoredProductRecommendation,
  writeProductRecommendationToStorage,
} from "@/lib/productRecommendationSession";
import type { RecommendedEnhancement } from "@/types/enhancementRecommendation";
import type {
  Product,
  ProductRecommendationResult,
} from "@/types/productRecommendation";
import type { RecommendationResult } from "@/types/recommendation";
function createRecommendationFingerprint(
  journeyRecommendation: RecommendationResult,
  products: Product[],
): string {
  const selectedExperience =
    typeof window !== "undefined"
      ? window.sessionStorage.getItem("skinDiscoveryExperience")
      : null;

  return JSON.stringify({
    selectedExperience:
      selectedExperience ?? "fresh-facial-bar-lash-lounge",
    resultType: journeyRecommendation.resultType,
    primaryJourneys: journeyRecommendation.primaryJourneys,
    secondaryJourney: journeyRecommendation.secondaryJourney,
    selectedAnswers: journeyRecommendation.selectedAnswers,
    products: products
      .map((product) => ({
        id: product.id,
        name: product.name,
        category: product.category,
        primaryJourney: product.primaryJourney,
        supportingJourney: product.supportingJourney,
        role: product.role,
        guestBenefit: product.guestBenefit,
        usageType: product.usageType,
        timing: product.timing,
        frequency: product.frequency,
        intensity: product.intensity,
        excluded: product.excluded,
        eligibilityRules: product.eligibilityRules,
featuredEligible: product.featuredEligible,
recommendationEnabled: product.recommendationEnabled,
        requiresFarmacistReview: product.requiresFarmacistReview,
        calmSensitiveCaution: product.calmSensitiveCaution,
        experienceRecommendations: product.experienceRecommendations,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  });
}
function filterBrandSpecificRecommendations(
  enhancementRecommendations: RecommendedEnhancement[],
): RecommendedEnhancement[] {
  const selectedExperience = typeof window !== "undefined"
    ? window.sessionStorage.getItem("skinDiscoveryExperience")
    : null;

  if (selectedExperience !== "gentlemens-corner") {
    return enhancementRecommendations;
  }

  return enhancementRecommendations.filter(
    (enhancement) => enhancement.name !== "Dermaplaning" && enhancement.name !== "Décolleté Treatment",
  );
}

export type SkinDiscoveryRecommendationBundle = {
  productRecommendation: ProductRecommendationResult;
  enhancementRecommendations: RecommendedEnhancement[];
};

function readSelectedAnswers(journeyRecommendation: RecommendationResult) {
  return {
    primaryMotivation: journeyRecommendation.selectedAnswers.primaryMotivation,
    skinExperience: journeyRecommendation.selectedAnswers.skinExperience,
    desiredOutcomes: journeyRecommendation.selectedAnswers.desiredOutcomes,
  };
}

function getProductRecommendationEngineResult(
  journeyRecommendation: RecommendationResult,
  selectedAnswers: ReturnType<typeof readSelectedAnswers>,
  products?: Product[],
): ProductRecommendationResult {
  const selectedExperience = typeof window !== "undefined"
    ? window.sessionStorage.getItem("skinDiscoveryExperience")
    : null;

  if (selectedExperience === "gentlemens-corner") {
  const cgcProducts = (products ?? []).filter((product) =>
    product.experienceRecommendations?.some(
      (recommendation) =>
        recommendation.experienceId === "gentlemens-corner" &&
        recommendation.assigned === true &&
        recommendation.approvalStatus === "approved",
    ),
  );

  return generateProductRecommendation({
    journeyResult: journeyRecommendation,
    selectedAnswers,
    products: cgcProducts,
    selectedExperience: "gentlemens-corner",
  });
}
const freshProducts = products?.filter((product) =>
  product.experienceRecommendations?.some(
    (recommendation) =>
      recommendation.experienceId === "fresh-facial-bar-lash-lounge" &&
      recommendation.assigned === true &&
      recommendation.approvalStatus === "approved",
  ),
);
 return generateProductRecommendation({
  journeyResult: journeyRecommendation,
  selectedAnswers,
  selectedExperience: "fresh-facial-bar-lash-lounge",
  products: freshProducts ?? [],
});
}



  export function readOrCreateSkinDiscoveryRecommendations(
    journeyRecommendation: RecommendationResult,
    products?: Product[],
  ): SkinDiscoveryRecommendationBundle {
    const fingerprint = createRecommendationFingerprint(
  journeyRecommendation,
  products ?? [],
);

const storedProductRecommendation =
  readStoredProductRecommendation(fingerprint);

const storedEnhancementRecommendations =
  readStoredEnhancementRecommendation();

const selectedAnswers = readSelectedAnswers(journeyRecommendation);

const productRecommendation =
  storedProductRecommendation ??
  getProductRecommendationEngineResult(
    journeyRecommendation,
    selectedAnswers,
    products,
  );

if (!storedProductRecommendation) {
  writeProductRecommendationToStorage(
    productRecommendation,
    fingerprint,
  );
}

    const enhancementRecommendations = filterBrandSpecificRecommendations(
      storedEnhancementRecommendations.length > 0
      ? storedEnhancementRecommendations
      : generateEnhancementRecommendation({
          journeyResult: journeyRecommendation,
          selectedAnswers,
        }),
  );
  if (storedEnhancementRecommendations.length === 0) {
    writeEnhancementRecommendationToStorage(enhancementRecommendations);
  }

  return {
    productRecommendation,
    enhancementRecommendations,
  };
}