import type { JourneyId, RecommendationResult } from "@/types/recommendation";
import type { ProductRecommendationResult } from "@/types/productRecommendation";
import type { RecommendedEnhancement } from "@/types/enhancementRecommendation";

export type SkinDiscoveryContact = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type SkinDiscoverySubmission = {
  submissionId: string;
  createdAt: string;

  guest: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };

  discovery: {
    primaryMotivation: string | null;
    skinExperience: string[];
    desiredOutcomes: string[];
  };

  journey: {
    resultType: string;
    primaryJourneys: JourneyId[];
    secondaryJourney: JourneyId | null;
  };

  productRecommendations: {
    featured: {
      cleanse: string | null;
      treat: string | null;
      moisturize: string | null;
      protect: string | null;
    };
    moreFreshPicks: string[];
  };

  enhancementRecommendations: string[];

  actions: {
    booked: boolean | null;
    membershipInterest: boolean | null;
  };

  internal: {
    notes: string;
    boulevardTags: string[];
  };
};

export type SkinDiscoverySubmissionInput = {
  guest: SkinDiscoveryContact;
  discovery: {
    primaryMotivation: string | null;
    skinExperience: string[];
    desiredOutcomes: string[];
  };
  journeyResult: RecommendationResult;
  productRecommendation: ProductRecommendationResult | null;
  enhancementRecommendations: RecommendedEnhancement[] | string[];
  submissionId?: string;
  createdAt?: string;
  actions?: {
    booked: boolean | null;
    membershipInterest: boolean | null;
  };
  internalNotes?: string;
};
