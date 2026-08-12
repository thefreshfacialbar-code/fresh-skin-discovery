export const journeyIds = [
  "quench",
  "calm",
  "purify",
  "illuminate",
  "renew",
] as const;

export type JourneyId = (typeof journeyIds)[number];

export type JourneyScores = Record<JourneyId, number>;

export type RecommendationResultType =
  | "single-primary"
  | "dual-primary"
  | "no-strong-journey";

export type RecommendationInput = {
  primaryMotivation: string | null;
  skinExperience: string[];
  desiredOutcomes: string[];
};

export type RecommendationResult = {
  resultType: RecommendationResultType;
  primaryJourneys: JourneyId[];
  secondaryJourney: JourneyId | null;
  scores: JourneyScores;
  supports: JourneyScores;
  selectedAnswers: {
    primaryMotivation: string | null;
    skinExperience: string[];
    desiredOutcomes: string[];
  };
};
