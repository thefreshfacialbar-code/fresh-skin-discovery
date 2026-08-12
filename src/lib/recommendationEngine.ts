import {
  desiredOutcomeMatrix,
  journeyNames,
  primaryMotivationMatrix,
  skinExperienceMatrix,
} from "../data/scoringMatrix";
import type {
  JourneyId,
  JourneyScores,
  RecommendationInput,
  RecommendationResult,
} from "../types/recommendation";
import { journeyIds } from "../types/recommendation";

function createEmptyJourneyScores(): JourneyScores {
  return {
    quench: 0,
    calm: 0,
    purify: 0,
    illuminate: 0,
    renew: 0,
  };
}

function getMatrixForAnswer(answerId: string): Record<JourneyId, number> | null {
  return (
    primaryMotivationMatrix[answerId] ??
    skinExperienceMatrix[answerId] ??
    desiredOutcomeMatrix[answerId] ??
    null
  );
}

function normalizeSelection(input: string[] | null | undefined): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return [...new Set(input.filter((value) => typeof value === "string" && Boolean(value)))];
}

export function evaluateRecommendation(
  input: RecommendationInput,
): RecommendationResult {
  const normalizedPrimaryMotivation =
    input.primaryMotivation && getMatrixForAnswer(input.primaryMotivation)
      ? input.primaryMotivation
      : null;

  const normalizedSkinExperience = normalizeSelection(input.skinExperience).filter((answerId) =>
    Boolean(getMatrixForAnswer(answerId)),
  );

  const normalizedDesiredOutcomes = normalizeSelection(input.desiredOutcomes).filter((answerId) =>
    Boolean(getMatrixForAnswer(answerId)),
  );

  const scores = createEmptyJourneyScores();
  const supports = createEmptyJourneyScores();

  const selectedAnswerIds = [
    normalizedPrimaryMotivation,
    ...normalizedSkinExperience,
    ...normalizedDesiredOutcomes,
  ].filter((value): value is string => typeof value === "string" && Boolean(value));

  for (const answerId of [...new Set(selectedAnswerIds)]) {
    const answerMatrix = getMatrixForAnswer(answerId);

    if (!answerMatrix) {
      continue;
    }

    for (const journey of journeyIds) {
      const value = answerMatrix[journey];

      if (value > 0) {
        scores[journey] += value;
        supports[journey] += 1;
      }
    }
  }

  const orderedJourneys = [...journeyIds].sort(
    (left, right) => scores[right] - scores[left],
  );

  const highestScore = Math.max(...orderedJourneys.map((journey) => scores[journey]));
  const allScoresEqual = orderedJourneys.every(
    (journey, index) => index === 0 || scores[journey] === scores[orderedJourneys[0]],
  );

  if (allScoresEqual || highestScore < 6) {
    return {
      resultType: "no-strong-journey",
      primaryJourneys: [],
      secondaryJourney: null,
      scores,
      supports,
      selectedAnswers: {
        primaryMotivation: normalizedPrimaryMotivation,
        skinExperience: normalizedSkinExperience,
        desiredOutcomes: normalizedDesiredOutcomes,
      },
    };
  }

  const [topJourney, secondJourney] = orderedJourneys;
  const topJourneyScore = scores[topJourney];
  const secondJourneyScore = scores[secondJourney];
  const absoluteDifference = Math.abs(topJourneyScore - secondJourneyScore);

  const isQuenchRenewPair =
    (topJourney === "quench" && secondJourney === "renew") ||
    (topJourney === "renew" && secondJourney === "quench");

  if (
    topJourneyScore >= 6 &&
    secondJourneyScore >= 6 &&
    absoluteDifference <= 2 &&
    supports[topJourney] >= 2 &&
    supports[secondJourney] >= 2
  ) {
    const primaryJourneys: JourneyId[] = isQuenchRenewPair
      ? ["quench", "renew"]
      : [topJourney, secondJourney];

    return {
      resultType: "dual-primary",
      primaryJourneys,
      secondaryJourney: null,
      scores,
      supports,
      selectedAnswers: {
        primaryMotivation: normalizedPrimaryMotivation,
        skinExperience: normalizedSkinExperience,
        desiredOutcomes: normalizedDesiredOutcomes,
      },
    };
  }

  const primaryJourney = topJourney;
  const primaryScore = scores[primaryJourney];
  let secondaryJourney: JourneyId | null = null;

  for (const candidate of orderedJourneys.slice(1)) {
    const candidateScore = scores[candidate];

    if (
      candidateScore >= 5 &&
      supports[candidate] >= 2 &&
      candidateScore >= primaryScore * 0.5
    ) {
      secondaryJourney = candidate;
      break;
    }
  }

  if (
    !secondaryJourney &&
    primaryJourney === "illuminate" &&
    primaryScore >= 10 &&
    supports[primaryJourney] >= 2
  ) {
    secondaryJourney = "illuminate";
  }

  return {
    resultType: "single-primary",
    primaryJourneys: [primaryJourney],
    secondaryJourney,
    scores,
    supports,
    selectedAnswers: {
      primaryMotivation: normalizedPrimaryMotivation,
      skinExperience: normalizedSkinExperience,
      desiredOutcomes: normalizedDesiredOutcomes,
    },
  };
}

export function getJourneyName(journeyId: JourneyId) {
  return journeyNames[journeyId];
}
