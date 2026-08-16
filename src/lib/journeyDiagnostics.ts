import { evaluateRecommendation } from "@/lib/recommendationEngine";
import { desiredOutcomeMatrix, primaryMotivationMatrix, skinExperienceMatrix } from "@/data/scoringMatrix";
import type { JourneyId, RecommendationInput } from "@/types/recommendation";

function getAnswerContribution(answerId: string, journey: JourneyId) {
  const matrix = primaryMotivationMatrix[answerId] ?? skinExperienceMatrix[answerId] ?? desiredOutcomeMatrix[answerId];

  return matrix?.[journey] ?? 0;
}

export function buildPurifyDiagnosticReport() {
  const profiles = [
    {
      name: "Straight Purify baseline",
      input: {
        primaryMotivation: "clearer",
        skinExperience: ["oily-throughout-day", "clogged-pores-breakouts"],
        desiredOutcomes: ["stay-clearer"],
      } satisfies RecommendationInput,
    },
    {
      name: "Purify-heavy multi-select",
      input: {
        primaryMotivation: "clearer",
        skinExperience: ["oily-throughout-day", "clogged-pores-breakouts", "dull-lacks-radiance"],
        desiredOutcomes: ["stay-clearer", "stay-healthy-balanced"],
      } satisfies RecommendationInput,
    },
    {
      name: "Purify + hydration",
      input: {
        primaryMotivation: "clearer",
        skinExperience: ["oily-throughout-day", "clogged-pores-breakouts", "tight-after-cleansing"],
        desiredOutcomes: ["stay-clearer", "feel-more-hydrated"],
      } satisfies RecommendationInput,
    },
  ] as const;

  return profiles.map(({ name, input }) => {
    const result = evaluateRecommendation(input);
    const answerContributions = {
      primaryMotivation: input.primaryMotivation
        ? { id: input.primaryMotivation, contributions: Object.fromEntries(
            (Object.keys(result.scores) as JourneyId[]).map((journey) => [journey, getAnswerContribution(input.primaryMotivation as string, journey)]),
          ) }
        : null,
      skinExperience: input.skinExperience.map((answerId) => ({
        id: answerId,
        contributions: Object.fromEntries(
          (Object.keys(result.scores) as JourneyId[]).map((journey) => [journey, getAnswerContribution(answerId, journey)]),
        ),
      })),
      desiredOutcomes: input.desiredOutcomes.map((answerId) => ({
        id: answerId,
        contributions: Object.fromEntries(
          (Object.keys(result.scores) as JourneyId[]).map((journey) => [journey, getAnswerContribution(answerId, journey)]),
        ),
      })),
    };

    return {
      name,
      result,
      scores: result.scores,
      supports: result.supports,
      primaryJourneys: result.primaryJourneys,
      secondaryJourney: result.secondaryJourney,
      answerContributions,
    };
  });
}

export function logPurifyDiagnostics() {
  const report = buildPurifyDiagnosticReport();
  console.table(
    report.map(({ name, scores, supports, primaryJourneys, secondaryJourney }) => ({
      name,
      purify: scores.purify,
      quench: scores.quench,
      calm: scores.calm,
      illuminate: scores.illuminate,
      renew: scores.renew,
      purifySupport: supports.purify,
      quenchSupport: supports.quench,
      calmSupport: supports.calm,
      illuminateSupport: supports.illuminate,
      renewSupport: supports.renew,
      primary: primaryJourneys.join(" + ") || "none",
      secondary: secondaryJourney ?? "none",
    })),
  );

  return report;
}
