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
import type { ProductRecommendationResult } from "@/types/productRecommendation";
import type { RecommendationResult } from "@/types/recommendation";

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

export function generateSkinDiscoveryRecommendations(
  journeyRecommendation: RecommendationResult,
): SkinDiscoveryRecommendationBundle {
  const selectedAnswers = readSelectedAnswers(journeyRecommendation);

  return {
    productRecommendation: generateProductRecommendation({
      journeyResult: journeyRecommendation,
      selectedAnswers,
    }),
    enhancementRecommendations: generateEnhancementRecommendation({
      journeyResult: journeyRecommendation,
      selectedAnswers,
    }),
  };
}

export function readOrCreateSkinDiscoveryRecommendations(
  journeyRecommendation: RecommendationResult,
): SkinDiscoveryRecommendationBundle {
  const storedProductRecommendation = readStoredProductRecommendation();
  const storedEnhancementRecommendations = readStoredEnhancementRecommendation();
  const selectedAnswers = readSelectedAnswers(journeyRecommendation);

  const productRecommendation = storedProductRecommendation ?? generateProductRecommendation({
    journeyResult: journeyRecommendation,
    selectedAnswers,
  });
  if (!storedProductRecommendation) {
    writeProductRecommendationToStorage(productRecommendation);
  }

  const enhancementRecommendations = storedEnhancementRecommendations.length > 0
    ? storedEnhancementRecommendations
    : generateEnhancementRecommendation({
        journeyResult: journeyRecommendation,
        selectedAnswers,
      });
  if (storedEnhancementRecommendations.length === 0) {
    writeEnhancementRecommendationToStorage(enhancementRecommendations);
  }

  return {
    productRecommendation,
    enhancementRecommendations,
  };
}