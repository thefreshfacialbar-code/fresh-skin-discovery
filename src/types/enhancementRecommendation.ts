import type { JourneyId } from "@/types/recommendation";

export type EnhancementCategory = "results-driven" | "comfort-experience";

export type Enhancement = {
  id: string;
  name: string;
  category: EnhancementCategory;
  journeyAffinity: Partial<Record<JourneyId, number>>;
  benefitTags: string[];
  skinSignals: string[];
  universalEligible?: boolean;
  seasonal?: boolean;
  calmSensitiveCaution?: boolean;
  requiresSkintenderReview?: boolean;
  guestBenefit: string;
};

export type RecommendedEnhancement = {
  enhancementId: string;
  name: string;
  category: EnhancementCategory;
  guestBenefit: string;
  matchReasons: string[];
  skintenderReviewRecommended: boolean;
  internalScore: number;
};
