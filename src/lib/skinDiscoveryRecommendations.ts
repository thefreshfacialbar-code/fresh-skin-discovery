import { generateEnhancementRecommendation } from "@/lib/enhancementRecommendationEngine";
import {
  readStoredEnhancementRecommendation,
  writeEnhancementRecommendationToStorage,
} from "@/lib/enhancementRecommendationSession";
import { generateCgcProductRecommendation } from "@/lib/cgcProductRecommendationEngine";
import { generateProductRecommendation } from "@/lib/productRecommendationEngine";
import {
  readStoredProductRecommendation,
  writeProductRecommendationToStorage,
} from "@/lib/productRecommendationSession";
import type { RecommendedEnhancement } from "@/types/enhancementRecommendation";
import type { ProductRecommendationResult } from "@/types/productRecommendation";
import type { RecommendationResult } from "@/types/recommendation";

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
): ProductRecommendationResult {
  const selectedExperience = typeof window !== "undefined"
    ? window.sessionStorage.getItem("skinDiscoveryExperience")
    : null;

  if (selectedExperience === "gentlemens-corner") {
    return generateCgcProductRecommendation({
      journeyResult: journeyRecommendation,
      selectedAnswers,
    });
  }

  return generateProductRecommendation({
    journeyResult: journeyRecommendation,
    selectedAnswers,
  });
}

export function generateSkinDiscoveryRecommendations(
  journeyRecommendation: RecommendationResult,
): SkinDiscoveryRecommendationBundle {
  const selectedAnswers = readSelectedAnswers(journeyRecommendation);
  const enhancementRecommendations = filterBrandSpecificRecommendations(
    generateEnhancementRecommendation({
      journeyResult: journeyRecommendation,
      selectedAnswers,
    }),
  );

  return {
    productRecommendation: getProductRecommendationEngineResult(journeyRecommendation, selectedAnswers),
    enhancementRecommendations,
  };
}

export function readOrCreateSkinDiscoveryRecommendations(
  journeyRecommendation: RecommendationResult,
): SkinDiscoveryRecommendationBundle {
  const storedProductRecommendation = readStoredProductRecommendation();
  const storedEnhancementRecommendations = readStoredEnhancementRecommendation();
  const selectedAnswers = readSelectedAnswers(journeyRecommendation);

  const productRecommendation = storedProductRecommendation ?? getProductRecommendationEngineResult(
    journeyRecommendation,
    selectedAnswers,
  );
  if (!storedProductRecommendation) {
    writeProductRecommendationToStorage(productRecommendation);
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