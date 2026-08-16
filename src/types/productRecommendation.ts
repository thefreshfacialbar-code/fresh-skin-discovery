import type { JourneyId } from "@/types/recommendation";

export type ProductCategory =
  | "Cleanser"
  | "Tonic"
  | "Serum & Treatment"
  | "Moisturizer"
  | "Mask"
  | "Exfoliant"
  | "Eye Care"
  | "Neck & Décolleté"
  | "Sun Protection";

export type ProductUsageType = "daily" | "periodic" | "weekly" | "farmacist-guided";

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  primaryJourney: JourneyId;
  supportingJourney: JourneyId;
  role: string;
  guestBenefit: string;
  intensity: 1 | 2 | 3 | 4;
  usageType?: ProductUsageType;
  requiresFarmacistReview?: boolean;
  calmSensitiveCaution?: boolean;
  excluded?: boolean;
};

export type RecommendedProduct = {
  productId: string;
  productName: string;
  category: ProductCategory;
  role: string;
  guestBenefit: string;
  usageType?: ProductUsageType;
  internalScore: number;
  matchReasons: string[];
  farmacistReviewRecommended: boolean;
};

export type ProductRecommendationResult = {
  featured: {
    cleanse: RecommendedProduct | null;
    treat: RecommendedProduct | null;
    moisturize: RecommendedProduct | null;
    protect: RecommendedProduct | null;
  };
  moreFreshPicks: RecommendedProduct[];
  journeyContext: {
    primaryJourneys: JourneyId[];
    secondaryJourney: JourneyId | null;
  };
  modifiers: string[];
  resultType: "recommendations-ready" | "needs-farmacist-personalization";
};
