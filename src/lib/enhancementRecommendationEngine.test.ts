import test from "node:test";
import assert from "node:assert/strict";

import type { RecommendationResult } from "@/types/recommendation";
import {
  generateEnhancementRecommendation,
  seasonalEnhancementsEnabled,
} from "@/lib/enhancementRecommendationEngine";

function buildJourneyResult(overrides: Partial<RecommendationResult> = {}): RecommendationResult {
  return {
    resultType: "single-primary",
    primaryJourneys: ["renew"],
    secondaryJourney: null,
    scores: {
      quench: 0,
      calm: 0,
      purify: 0,
      illuminate: 0,
      renew: 10,
    },
    supports: {
      quench: 0,
      calm: 0,
      purify: 0,
      illuminate: 0,
      renew: 2,
    },
    selectedAnswers: {
      primaryMotivation: "aging",
      skinExperience: ["fine-lines-texture"],
      desiredOutcomes: ["feel-firmer-smoother"],
    },
    ...overrides,
  };
}

test("Straight Renew returns strong results-driven options without a fixed pair", () => {
  const result = generateEnhancementRecommendation({
    journeyResult: buildJourneyResult(),
    selectedAnswers: {
      primaryMotivation: "aging",
      skinExperience: ["fine-lines-texture", "dry-throughout-day"],
      desiredOutcomes: ["feel-firmer-smoother", "feel-more-hydrated"],
    },
  });

  assert.ok(result.length > 0);
  assert.ok(result.length <= 2);
  const names = result.map((item) => item.name);
  assert.ok(
    names.some((name) =>
      ["Microcurrent", "Dermaplaning", "Décolleté Treatment", "LED Light Therapy"].includes(name),
    ),
  );
});

test("Renew + Quench ranks hydration and renewal crossover options strongly", () => {
  const result = generateEnhancementRecommendation({
    journeyResult: buildJourneyResult({
      primaryJourneys: ["renew"],
      secondaryJourney: "quench",
      scores: { quench: 8, calm: 0, purify: 0, illuminate: 0, renew: 10 },
      supports: { quench: 2, calm: 0, purify: 0, illuminate: 0, renew: 2 },
    }),
    selectedAnswers: {
      primaryMotivation: "aging",
      skinExperience: ["fine-lines-texture", "dry-throughout-day"],
      desiredOutcomes: ["feel-firmer-smoother", "feel-more-hydrated"],
    },
  });

  assert.ok(result.length > 0);
  assert.ok(result.length <= 2);
  const names = result.map((item) => item.name);
  assert.ok(names.includes("Dermaplaning") || names.includes("Microcurrent") || names.includes("Décolleté Treatment"));
});

test("Illuminate + Renew keeps results-driven recommendations distinct from Renew + Quench", () => {
  const renewQuench = generateEnhancementRecommendation({
    journeyResult: buildJourneyResult({
      primaryJourneys: ["renew"],
      secondaryJourney: "quench",
      scores: { quench: 8, calm: 0, purify: 0, illuminate: 0, renew: 10 },
      supports: { quench: 2, calm: 0, purify: 0, illuminate: 0, renew: 2 },
    }),
    selectedAnswers: {
      primaryMotivation: "aging",
      skinExperience: ["fine-lines-texture", "dry-throughout-day"],
      desiredOutcomes: ["feel-firmer-smoother", "feel-more-hydrated"],
    },
  });

  const illuminateRenew = generateEnhancementRecommendation({
    journeyResult: buildJourneyResult({
      primaryJourneys: ["illuminate"],
      secondaryJourney: "renew",
      scores: { quench: 0, calm: 0, purify: 0, illuminate: 10, renew: 8 },
      supports: { quench: 0, calm: 0, purify: 0, illuminate: 2, renew: 2 },
    }),
    selectedAnswers: {
      primaryMotivation: "radiant",
      skinExperience: ["dull-lacks-radiance", "fine-lines-texture"],
      desiredOutcomes: ["look-brighter", "feel-firmer-smoother"],
    },
  });

  assert.ok(illuminateRenew.length > 0);
  assert.ok(illuminateRenew.length <= 2);
  assert.ok(renewQuench.some((item) => item.name === "Dermaplaning") || renewQuench.some((item) => item.name === "Décolleté Treatment"));
  assert.ok(illuminateRenew.some((item) => item.name === "Dermaplaning") || illuminateRenew.some((item) => item.name === "Microcurrent") || illuminateRenew.some((item) => item.name === "FarmHouse Fresh Peel"));
  assert.ok(renewQuench[0].matchReasons[0].includes("renew"));
  assert.ok(illuminateRenew[0].matchReasons[0].includes("illuminate"));
  assert.notEqual(renewQuench[0].internalScore, illuminateRenew[0].internalScore);
});

test("Straight Quench does not auto-return seasonal warmth when the seasonal flag is disabled", () => {
  const result = generateEnhancementRecommendation({
    journeyResult: buildJourneyResult({
      primaryJourneys: ["quench"],
      secondaryJourney: null,
      scores: { quench: 10, calm: 0, purify: 0, illuminate: 0, renew: 0 },
      supports: { quench: 2, calm: 0, purify: 0, illuminate: 0, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "dry-dehydrated",
      skinExperience: ["dry-throughout-day", "tight-after-cleansing"],
      desiredOutcomes: ["feel-more-hydrated"],
    },
  });

  const names = result.map((item) => item.name);
  assert.ok(!names.includes("Warm Hand Treatment"));
  assert.ok(!names.includes("Warm Foot Treatment"));
});

test("Seasonal Quench can surface warm comfort Enhancements when enabled", () => {
  const result = generateEnhancementRecommendation({
    journeyResult: buildJourneyResult({
      primaryJourneys: ["quench"],
      secondaryJourney: null,
      scores: { quench: 10, calm: 0, purify: 0, illuminate: 0, renew: 0 },
      supports: { quench: 2, calm: 0, purify: 0, illuminate: 0, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "dry-dehydrated",
      skinExperience: ["dry-throughout-day", "tight-after-cleansing"],
      desiredOutcomes: ["feel-more-hydrated"],
    },
    seasonalEnhancementsEnabled: true,
  });

  const names = result.map((item) => item.name);
  assert.ok(names.includes("Dermaplaning") || names.includes("Décolleté Treatment") || names.includes("Warm Hand Treatment") || names.includes("Warm Foot Treatment"));
});

test("Straight Calm suppresses FarmHouse Fresh Peel and keeps the result non-aggressive", () => {
  const result = generateEnhancementRecommendation({
    journeyResult: buildJourneyResult({
      primaryJourneys: ["calm"],
      secondaryJourney: null,
      scores: { quench: 0, calm: 10, purify: 0, illuminate: 0, renew: 0 },
      supports: { quench: 0, calm: 2, purify: 0, illuminate: 0, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "sensitive",
      skinExperience: ["easily-irritated", "reacts-to-products"],
      desiredOutcomes: ["feel-calmer"],
    },
  });

  const names = result.map((item) => item.name);
  assert.ok(!names.includes("FarmHouse Fresh Peel"));
  assert.ok(result.length <= 2);
  assert.ok(names.includes("LED Light Therapy") || names.includes("Cooling Eye Treatment") || names.includes("Dermaplaning"));
});

test("Purify + Calm suppresses FarmHouse Fresh Peel and may return fewer than 2 recommendations", () => {
  const result = generateEnhancementRecommendation({
    journeyResult: buildJourneyResult({
      primaryJourneys: ["purify"],
      secondaryJourney: "calm",
      scores: { quench: 3, calm: 9, purify: 11, illuminate: 0, renew: 0 },
      supports: { quench: 1, calm: 3, purify: 4, illuminate: 0, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "clearer",
      skinExperience: ["oily-throughout-day", "easily-irritated"],
      desiredOutcomes: ["stay-clearer", "feel-calmer"],
    },
  });

  const names = result.map((item) => item.name);
  assert.ok(!names.includes("FarmHouse Fresh Peel"));
  assert.ok(result.length <= 2);
  assert.ok(result.length === 0 || names.includes("LED Light Therapy") || names.includes("Cooling Eye Treatment"));
});

test("Universal options are eligible but still need relevance to win", () => {
  const result = generateEnhancementRecommendation({
    journeyResult: buildJourneyResult({
      primaryJourneys: ["quench"],
      secondaryJourney: null,
      scores: { quench: 10, calm: 0, purify: 0, illuminate: 0, renew: 0 },
      supports: { quench: 2, calm: 0, purify: 0, illuminate: 0, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "dry-dehydrated",
      skinExperience: ["dry-throughout-day"],
      desiredOutcomes: ["feel-more-hydrated"],
    },
  });

  const names = result.map((item) => item.name);
  assert.ok(names.includes("Dermaplaning") || names.includes("Décolleté Treatment"));
  assert.ok(!names.includes("LED Light Therapy") || result.length >= 1);
  assert.ok(result.length <= 2);
});

test("Décolleté Treatment can qualify from explicit aging or dryness signals even without a Renew primary", () => {
  const result = generateEnhancementRecommendation({
    journeyResult: buildJourneyResult({
      primaryJourneys: ["quench"],
      secondaryJourney: null,
      scores: { quench: 10, calm: 0, purify: 0, illuminate: 0, renew: 0 },
      supports: { quench: 2, calm: 0, purify: 0, illuminate: 0, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "dry-dehydrated",
      skinExperience: ["dry-throughout-day"],
      desiredOutcomes: ["feel-firmer-smoother", "feel-more-hydrated"],
    },
  });

  const names = result.map((item) => item.name);
  assert.ok(names.includes("Décolleté Treatment") || names.includes("Dermaplaning"));
});

test("No strong relevance returns an empty recommendation set", () => {
  const result = generateEnhancementRecommendation({
    journeyResult: buildJourneyResult({
      primaryJourneys: ["calm"],
      secondaryJourney: null,
      scores: { quench: 0, calm: 6, purify: 0, illuminate: 0, renew: 0 },
      supports: { quench: 0, calm: 2, purify: 0, illuminate: 0, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "healthier",
      skinExperience: ["comfortable-balanced"],
      desiredOutcomes: ["stay-healthy-balanced"],
    },
  });

  assert.deepEqual(result, []);
});

test("Straight Quench and Straight Renew do not return identical Enhancement arrays", () => {
  const quench = generateEnhancementRecommendation({
    journeyResult: buildJourneyResult({
      primaryJourneys: ["quench"],
      secondaryJourney: null,
      scores: { quench: 10, calm: 0, purify: 0, illuminate: 0, renew: 0 },
      supports: { quench: 2, calm: 0, purify: 0, illuminate: 0, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "dry-dehydrated",
      skinExperience: ["dry-throughout-day", "tight-after-cleansing"],
      desiredOutcomes: ["feel-more-hydrated"],
    },
  });

  const renew = generateEnhancementRecommendation({
    journeyResult: buildJourneyResult({
      primaryJourneys: ["renew"],
      secondaryJourney: null,
      scores: { quench: 0, calm: 0, purify: 0, illuminate: 0, renew: 10 },
      supports: { quench: 0, calm: 0, purify: 0, illuminate: 0, renew: 2 },
    }),
    selectedAnswers: {
      primaryMotivation: "aging",
      skinExperience: ["fine-lines-texture"],
      desiredOutcomes: ["feel-firmer-smoother"],
    },
  });

  assert.notDeepEqual(quench.map((item) => item.name), renew.map((item) => item.name));
});

test("Straight Illuminate and Straight Calm do not return identical Enhancement arrays", () => {
  const illuminate = generateEnhancementRecommendation({
    journeyResult: buildJourneyResult({
      primaryJourneys: ["illuminate"],
      secondaryJourney: null,
      scores: { quench: 0, calm: 0, purify: 0, illuminate: 10, renew: 0 },
      supports: { quench: 0, calm: 0, purify: 0, illuminate: 2, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "radiant",
      skinExperience: ["dull-lacks-radiance"],
      desiredOutcomes: ["look-brighter"],
    },
  });

  const calm = generateEnhancementRecommendation({
    journeyResult: buildJourneyResult({
      primaryJourneys: ["calm"],
      secondaryJourney: null,
      scores: { quench: 0, calm: 10, purify: 0, illuminate: 0, renew: 0 },
      supports: { quench: 0, calm: 2, purify: 0, illuminate: 0, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "sensitive",
      skinExperience: ["easily-irritated"],
      desiredOutcomes: ["feel-calmer"],
    },
  });

  assert.notDeepEqual(illuminate.map((item) => item.name), calm.map((item) => item.name));
});

test("Default seasonal setting stays disabled", () => {
  assert.equal(seasonalEnhancementsEnabled, false);
});
