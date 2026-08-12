import assert from "node:assert/strict";
import test from "node:test";

import { evaluateRecommendation } from "./recommendationEngine";
import type { RecommendationInput } from "../types/recommendation";

function buildInput(
  overrides: Partial<RecommendationInput> = {},
): RecommendationInput {
  return {
    primaryMotivation: "dry-dehydrated",
    skinExperience: [],
    desiredOutcomes: [],
    ...overrides,
  };
}

test("T01 - Straight Quench", () => {
  const result = evaluateRecommendation(
    buildInput({
      primaryMotivation: "dry-dehydrated",
      skinExperience: ["tight-after-cleansing", "dry-throughout-day"],
      desiredOutcomes: ["feel-more-hydrated"],
    }),
  );

  assert.equal(result.resultType, "single-primary");
  assert.deepStrictEqual(result.primaryJourneys, ["quench"]);
  assert.deepStrictEqual(result.secondaryJourney, null);
  assert.deepStrictEqual(result.scores, {
    quench: 12,
    calm: 3,
    purify: 0,
    illuminate: 0,
    renew: 4,
  });
});

test("T02 - Straight Calm", () => {
  const result = evaluateRecommendation(
    buildInput({
      primaryMotivation: "sensitive",
      skinExperience: ["easily-irritated", "reacts-to-products"],
      desiredOutcomes: ["feel-calmer"],
    }),
  );

  assert.equal(result.resultType, "single-primary");
  assert.deepStrictEqual(result.primaryJourneys, ["calm"]);
  assert.deepStrictEqual(result.scores, {
    quench: 4,
    calm: 12,
    purify: 0,
    illuminate: 0,
    renew: 0,
  });
});

test("T03 - Straight Purify", () => {
  const result = evaluateRecommendation(
    buildInput({
      primaryMotivation: "clearer",
      skinExperience: ["oily-throughout-day", "clogged-pores-breakouts"],
      desiredOutcomes: ["stay-clearer"],
    }),
  );

  assert.equal(result.resultType, "single-primary");
  assert.deepStrictEqual(result.primaryJourneys, ["purify"]);
  assert.deepStrictEqual(result.scores, {
    quench: 1,
    calm: 3,
    purify: 12,
    illuminate: 2,
    renew: 0,
  });
});

test("T04 - Straight Illuminate", () => {
  const result = evaluateRecommendation(
    buildInput({
      primaryMotivation: "radiant",
      skinExperience: ["dull-lacks-radiance"],
      desiredOutcomes: ["look-brighter"],
    }),
  );

  assert.equal(result.resultType, "single-primary");
  assert.deepStrictEqual(result.primaryJourneys, ["illuminate"]);
  assert.deepStrictEqual(result.scores, {
    quench: 3,
    calm: 0,
    purify: 0,
    illuminate: 9,
    renew: 3,
  });
});

test("T05 - Straight Renew", () => {
  const result = evaluateRecommendation(
    buildInput({
      primaryMotivation: "aging",
      skinExperience: ["fine-lines-texture"],
      desiredOutcomes: ["feel-firmer-smoother"],
    }),
  );

  assert.equal(result.resultType, "single-primary");
  assert.deepStrictEqual(result.primaryJourneys, ["renew"]);
  assert.deepStrictEqual(result.scores, {
    quench: 3,
    calm: 0,
    purify: 0,
    illuminate: 3,
    renew: 9,
  });
});

test("T06 - Quench + Calm Dual Primary", () => {
  const result = evaluateRecommendation(
    buildInput({
      primaryMotivation: "dry-dehydrated",
      skinExperience: ["tight-after-cleansing", "reacts-to-products"],
      desiredOutcomes: ["feel-more-hydrated", "feel-calmer"],
    }),
  );

  assert.equal(result.resultType, "dual-primary");
  assert.deepStrictEqual(result.primaryJourneys, ["quench", "calm"]);
  assert.equal(result.secondaryJourney, null);
});

test("T07 - Quench + Illuminate Dual Primary", () => {
  const result = evaluateRecommendation(
    buildInput({
      primaryMotivation: "radiant",
      skinExperience: ["tight-after-cleansing", "dull-lacks-radiance"],
      desiredOutcomes: ["feel-more-hydrated", "look-brighter"],
    }),
  );

  assert.equal(result.resultType, "dual-primary");
  assert.deepStrictEqual(result.primaryJourneys, ["quench", "illuminate"]);
});

test("T08 - Calm + Purify Dual Primary", () => {
  const result = evaluateRecommendation(
    buildInput({
      primaryMotivation: "clearer",
      skinExperience: ["clogged-pores-breakouts", "easily-irritated"],
      desiredOutcomes: ["stay-clearer", "feel-calmer"],
    }),
  );

  assert.equal(result.resultType, "dual-primary");
  assert.deepStrictEqual(result.primaryJourneys, ["calm", "purify"]);
});

test("T09 - Purify + Illuminate Dual Primary", () => {
  const result = evaluateRecommendation(
    buildInput({
      primaryMotivation: "clearer",
      skinExperience: ["clogged-pores-breakouts", "dull-lacks-radiance"],
      desiredOutcomes: ["stay-clearer", "look-brighter"],
    }),
  );

  assert.equal(result.resultType, "dual-primary");
  assert.deepStrictEqual(result.primaryJourneys, ["purify", "illuminate"]);
});

test("T10 - Renew + Illuminate Dual Primary", () => {
  const result = evaluateRecommendation(
    buildInput({
      primaryMotivation: "aging",
      skinExperience: ["fine-lines-texture", "dull-lacks-radiance"],
      desiredOutcomes: ["feel-firmer-smoother", "look-brighter"],
    }),
  );

  assert.equal(result.resultType, "dual-primary");
  assert.deepStrictEqual(result.primaryJourneys, ["renew", "illuminate"]);
});

test("T11 - Renew + Quench Dual Primary", () => {
  const result = evaluateRecommendation(
    buildInput({
      primaryMotivation: "aging",
      skinExperience: ["dry-throughout-day", "fine-lines-texture"],
      desiredOutcomes: ["feel-more-hydrated", "feel-firmer-smoother"],
    }),
  );

  assert.equal(result.resultType, "dual-primary");
  assert.deepStrictEqual(result.primaryJourneys, ["quench", "renew"]);
});

test("T12 - Balanced / Unsure => No Strong Journey", () => {
  const result = evaluateRecommendation(
    buildInput({
      primaryMotivation: "not-sure",
      skinExperience: ["comfortable-balanced"],
      desiredOutcomes: ["stay-healthy-balanced"],
    }),
  );

  assert.equal(result.resultType, "no-strong-journey");
  assert.deepStrictEqual(result.primaryJourneys, []);
  assert.deepStrictEqual(result.secondaryJourney, null);
  assert.deepStrictEqual(result.scores, {
    quench: 3,
    calm: 3,
    purify: 3,
    illuminate: 3,
    renew: 3,
  });
});

test("T13 - Oily but Dehydrated => Purify + Quench", () => {
  const result = evaluateRecommendation(
    buildInput({
      primaryMotivation: "clearer",
      skinExperience: ["oily-throughout-day", "tight-after-cleansing"],
      desiredOutcomes: ["stay-clearer", "feel-more-hydrated"],
    }),
  );

  assert.equal(result.resultType, "dual-primary");
  assert.deepStrictEqual(result.primaryJourneys, ["purify", "quench"]);
});

test("T14 - Sensitive + Healthy Aging => Primary Calm, Secondary Renew", () => {
  const result = evaluateRecommendation(
    buildInput({
      primaryMotivation: "sensitive",
      skinExperience: ["reacts-to-products", "fine-lines-texture"],
      desiredOutcomes: ["feel-calmer", "feel-firmer-smoother"],
    }),
  );

  assert.equal(result.resultType, "single-primary");
  assert.deepStrictEqual(result.primaryJourneys, ["calm"]);
  assert.equal(result.secondaryJourney, "renew");
});

test("T15 - Dry + Dull => Primary Quench, Secondary Illuminate", () => {
  const result = evaluateRecommendation(
    buildInput({
      primaryMotivation: "dry-dehydrated",
      skinExperience: ["dry-throughout-day", "dull-lacks-radiance"],
      desiredOutcomes: ["feel-more-hydrated", "look-brighter"],
    }),
  );

  assert.equal(result.resultType, "single-primary");
  assert.deepStrictEqual(result.primaryJourneys, ["quench"]);
  assert.equal(result.secondaryJourney, "illuminate");
});

test("T16 - Congested + Balanced Goal => Purify", () => {
  const result = evaluateRecommendation(
    buildInput({
      primaryMotivation: "clearer",
      skinExperience: ["clogged-pores-breakouts"],
      desiredOutcomes: ["stay-healthy-balanced"],
    }),
  );

  assert.equal(result.resultType, "single-primary");
  assert.deepStrictEqual(result.primaryJourneys, ["purify"]);
});

test("Dual-primary exact boundary", () => {
  const result = evaluateRecommendation(
    buildInput({
      primaryMotivation: "dry-dehydrated",
      skinExperience: ["dry-throughout-day", "tight-after-cleansing"],
      desiredOutcomes: ["feel-more-hydrated"],
    }),
  );

  assert.equal(result.resultType, "single-primary");
  assert.deepStrictEqual(result.primaryJourneys, ["quench"]);
});

test("Secondary exact threshold", () => {
  const result = evaluateRecommendation(
    buildInput({
      primaryMotivation: "radiant",
      skinExperience: ["dull-lacks-radiance"],
      desiredOutcomes: ["look-brighter", "stay-healthy-balanced"],
    }),
  );

  assert.equal(result.resultType, "single-primary");
  assert.equal(result.secondaryJourney, "illuminate");
});

test("Highest score below 6 -> no strong journey", () => {
  const result = evaluateRecommendation(
    buildInput({
      primaryMotivation: "healthier",
      skinExperience: ["comfortable-balanced"],
      desiredOutcomes: ["stay-healthy-balanced"],
    }),
  );

  assert.equal(result.resultType, "no-strong-journey");
});

test("All five scores tie -> no strong journey", () => {
  const result = evaluateRecommendation(
    buildInput({
      primaryMotivation: "not-sure",
      skinExperience: ["not-sure"],
      desiredOutcomes: ["stay-healthy-balanced"],
    }),
  );

  assert.equal(result.resultType, "no-strong-journey");
});

test("Healthier Listening answer contributes 1/1/1/1/1", () => {
  const result = evaluateRecommendation(
    buildInput({
      primaryMotivation: "healthier",
      skinExperience: [],
      desiredOutcomes: [],
    }),
  );

  assert.deepStrictEqual(result.scores, {
    quench: 1,
    calm: 1,
    purify: 1,
    illuminate: 1,
    renew: 1,
  });
});
