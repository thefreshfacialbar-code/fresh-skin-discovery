import assert from "node:assert/strict";
import test from "node:test";

import { generateCgcProductRecommendation } from "@/lib/cgcProductRecommendationEngine";
import { readOrCreateSkinDiscoveryRecommendations } from "@/lib/skinDiscoveryRecommendations";
import type { RecommendationResult } from "@/types/recommendation";

function buildJourneyResult(overrides: Partial<RecommendationResult> = {}): RecommendationResult {
  return {
    resultType: "single-primary",
    primaryJourneys: ["quench"],
    secondaryJourney: null,
    scores: {
      quench: 10,
      calm: 0,
      purify: 0,
      illuminate: 0,
      renew: 0,
    },
    supports: {
      quench: 3,
      calm: 0,
      purify: 0,
      illuminate: 0,
      renew: 0,
    },
    selectedAnswers: {
      primaryMotivation: "dry-dehydrated",
      skinExperience: ["tight-after-cleansing", "dry-throughout-day"],
      desiredOutcomes: ["feel-more-hydrated"],
    },
    ...overrides,
  };
}

test("CGC-01 Quench: Clean Slate → Thirsty Face → AM Replenish", () => {
  const result = generateCgcProductRecommendation({
    journeyResult: buildJourneyResult(),
    selectedAnswers: {
      primaryMotivation: "dry-dehydrated",
      skinExperience: ["tight-after-cleansing", "dry-throughout-day"],
      desiredOutcomes: ["feel-more-hydrated"],
    },
  });

  assert.equal(result.resultType, "recommendations-ready");
  assert.equal(result.featured.cleanse?.productName, "Clean Slate");
  assert.equal(result.featured.moisturize?.productName, "Thirsty Face");
  assert.equal(result.featured.protect?.productName, "AM Replenish Non-Tinted SPF 40");
  assert.ok(result.moreFreshPicks.some((product) => product.productName === "Hyaluronic Booster"));
});

test("CGC-02 Renew: Clean Slate → Second Wind → AM Replenish", () => {
  const result = generateCgcProductRecommendation({
    journeyResult: buildJourneyResult({
      primaryJourneys: ["renew"],
      secondaryJourney: null,
      scores: { quench: 1, calm: 0, purify: 0, illuminate: 1, renew: 10 },
      supports: { quench: 1, calm: 0, purify: 0, illuminate: 1, renew: 3 },
    }),
    selectedAnswers: {
      primaryMotivation: "aging",
      skinExperience: ["fine-lines-texture"],
      desiredOutcomes: ["feel-firmer-smoother"],
    },
  });

  assert.equal(result.featured.cleanse?.productName, "Clean Slate");
  assert.equal(result.featured.moisturize?.productName, "Second Wind");
  assert.equal(result.featured.protect?.productName, "AM Replenish Non-Tinted SPF 40");
  assert.ok(result.moreFreshPicks.some((product) => product.productName === "Bakuchiol Booster") || result.featured.treat?.productName === "Bakuchiol Booster");
});

test("CGC-03 Illuminate: Clean Slate → Zero In → Thirsty Face → AM Replenish", () => {
  const result = generateCgcProductRecommendation({
    journeyResult: buildJourneyResult({
      primaryJourneys: ["illuminate"],
      secondaryJourney: "quench",
      scores: { quench: 5, calm: 0, purify: 0, illuminate: 12, renew: 0 },
      supports: { quench: 2, calm: 0, purify: 0, illuminate: 3, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "radiant",
      skinExperience: ["dull-lacks-radiance"],
      desiredOutcomes: ["look-brighter", "feel-more-hydrated"],
    },
  });

  assert.equal(result.featured.cleanse?.productName, "Clean Slate");
  assert.equal(result.featured.treat?.productName, "Zero In");
  assert.equal(result.featured.moisturize?.productName, "Thirsty Face");
  assert.equal(result.featured.protect?.productName, "AM Replenish Non-Tinted SPF 40");
  assert.ok(!result.moreFreshPicks.some((product) => ["Golden Gleam Illuminating Peptide Serum", "Pink Dusk Illuminating Peptide Serum"].includes(product.productName)));
});

test("CGC-04 Purify: Clean Slate → Kale Water → AM Replenish", () => {
  const result = generateCgcProductRecommendation({
    journeyResult: buildJourneyResult({
      primaryJourneys: ["purify"],
      secondaryJourney: "quench",
      scores: { quench: 8, calm: 0, purify: 10, illuminate: 0, renew: 0 },
      supports: { quench: 2, calm: 0, purify: 3, illuminate: 0, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "clearer",
      skinExperience: ["oily-throughout-day", "clogged-pores-breakouts"],
      desiredOutcomes: ["stay-clearer", "feel-more-hydrated"],
    },
  });

  assert.equal(result.featured.cleanse?.productName, "Clean Slate");
  assert.equal(result.featured.moisturize?.productName, "Kale Water Weightless Moisturizer");
  assert.equal(result.featured.protect?.productName, "AM Replenish Non-Tinted SPF 40");
  assert.ok(result.moreFreshPicks.some((product) => product.productName === "Deep Clean") || result.featured.treat?.productName === "Deep Clean");
});

test("CGC-05 Calm: Clean Slate → Green Fixer → Cactus Comfort Barrier Cream → Ultra Zinc", () => {
  const result = generateCgcProductRecommendation({
    journeyResult: buildJourneyResult({
      primaryJourneys: ["calm"],
      secondaryJourney: null,
      scores: { quench: 1, calm: 12, purify: 0, illuminate: 0, renew: 0 },
      supports: { quench: 1, calm: 4, purify: 0, illuminate: 0, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "sensitive",
      skinExperience: ["easily-irritated", "reacts-to-products"],
      desiredOutcomes: ["feel-calmer"],
    },
  });

  assert.equal(result.featured.cleanse?.productName, "Clean Slate");
  assert.equal(result.featured.treat?.productName, "Green Fixer Calming Elixir");
  assert.equal(result.featured.moisturize?.productName, "Cactus Comfort Barrier Cream");
  assert.equal(result.featured.protect?.productName, "TiZO Ultra Zinc Non-Tinted SPF 40");
  assert.ok(!result.moreFreshPicks.some((product) => product.productName === "Green Fixer Calming Elixir"));
  assert.ok(!result.moreFreshPicks.some((product) => ["Deep Clean", "C of Change Salicylic Peel Pads"].includes(product.productName)));
});

test("CGC does not force a treatment when no treatment is indicated", () => {
  const result = generateCgcProductRecommendation({
    journeyResult: buildJourneyResult(),
    selectedAnswers: {
      primaryMotivation: "dry-dehydrated",
      skinExperience: ["dry-throughout-day"],
      desiredOutcomes: ["feel-more-hydrated"],
    },
  });

  assert.equal(result.featured.treat, null);
  assert.ok(!result.moreFreshPicks.some((product) => ["Green Fixer Calming Elixir", "Deep Clean", "C of Change Salicylic Peel Pads", "Zero In"].includes(product.productName)));
});

test("CGC-06 Quench + Renew: picks one dominant moisturizing lead and one distinct renewal enhancement", () => {
  const result = generateCgcProductRecommendation({
    journeyResult: buildJourneyResult({
      primaryJourneys: ["quench", "renew"],
      secondaryJourney: null,
      resultType: "dual-primary",
      scores: { quench: 9, calm: 0, purify: 0, illuminate: 1, renew: 8 },
      supports: { quench: 3, calm: 0, purify: 0, illuminate: 1, renew: 3 },
    }),
    selectedAnswers: {
      primaryMotivation: "dry-dehydrated",
      skinExperience: ["fine-lines-texture", "dry-throughout-day"],
      desiredOutcomes: ["feel-more-hydrated", "feel-firmer-smoother"],
    },
  });

  assert.equal(result.featured.cleanse?.productName, "Clean Slate");
  assert.ok(["Thirsty Face", "Second Wind"].includes(result.featured.moisturize?.productName ?? ""));
  assert.equal(result.featured.protect?.productName, "AM Replenish Non-Tinted SPF 40");
  assert.ok(result.moreFreshPicks.length <= 2);
});

test("CGC-07 Purify + Quench: hydration vs oily congestion chooses a moisture-first or Kale Water route without conflicting with core rules", () => {
  const result = generateCgcProductRecommendation({
    journeyResult: buildJourneyResult({
      primaryJourneys: ["purify", "quench"],
      secondaryJourney: null,
      resultType: "dual-primary",
      scores: { quench: 9, calm: 0, purify: 10, illuminate: 0, renew: 0 },
      supports: { quench: 3, calm: 0, purify: 3, illuminate: 0, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "clearer",
      skinExperience: ["oily-throughout-day", "dry-throughout-day", "clogged-pores-breakouts"],
      desiredOutcomes: ["stay-clearer", "feel-more-hydrated"],
    },
  });

  assert.equal(result.featured.cleanse?.productName, "Clean Slate");
  assert.ok(["Kale Water Weightless Moisturizer", "Thirsty Face"].includes(result.featured.moisturize?.productName ?? ""));
  assert.equal(result.featured.protect?.productName, "AM Replenish Non-Tinted SPF 40");
});

test("CGC-08 Purify + Calm: no automatic Deep Clean or C of Change", () => {
  const result = generateCgcProductRecommendation({
    journeyResult: buildJourneyResult({
      primaryJourneys: ["purify"],
      secondaryJourney: "calm",
      scores: { quench: 2, calm: 10, purify: 11, illuminate: 0, renew: 0 },
      supports: { quench: 1, calm: 3, purify: 4, illuminate: 0, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "clearer",
      skinExperience: ["oily-throughout-day", "easily-irritated"],
      desiredOutcomes: ["stay-clearer", "feel-calmer"],
    },
  });

  assert.equal(result.featured.cleanse?.productName, "Clean Slate");
  assert.equal(result.featured.moisturize?.productName, "Cactus Comfort Barrier Cream");
  assert.equal(result.featured.protect?.productName, "TiZO Ultra Zinc Non-Tinted SPF 40");
  assert.ok(!result.moreFreshPicks.some((product) => ["Deep Clean", "C of Change Salicylic Peel Pads"].includes(product.productName)));
});

test("CGC-09 Illuminate + Renew: Zero In + Second Wind + AM Replenish with no disallowed FFB or tinted SPF", () => {
  const result = generateCgcProductRecommendation({
    journeyResult: buildJourneyResult({
      primaryJourneys: ["illuminate", "renew"],
      secondaryJourney: null,
      resultType: "dual-primary",
      scores: { quench: 2, calm: 0, purify: 0, illuminate: 10, renew: 9 },
      supports: { quench: 1, calm: 0, purify: 0, illuminate: 3, renew: 3 },
    }),
    selectedAnswers: {
      primaryMotivation: "radiant",
      skinExperience: ["dull-lacks-radiance", "fine-lines-texture"],
      desiredOutcomes: ["look-brighter", "feel-firmer-smoother"],
    },
  });

  assert.equal(result.featured.cleanse?.productName, "Clean Slate");
  assert.equal(result.featured.treat?.productName, "Zero In");
  assert.equal(result.featured.moisturize?.productName, "Second Wind");
  assert.equal(result.featured.protect?.productName, "AM Replenish Non-Tinted SPF 40");
  assert.ok(!result.moreFreshPicks.some((product) => ["Golden Gleam Illuminating Peptide Serum", "Pink Dusk Illuminating Peptide Serum"].includes(product.productName)));
  assert.ok(!["AM Replenish Lightly Tinted SPF 40", "TiZO Ultra Zinc Tinted SPF 40", "Tizo Primer/Sunscreen Non-Tinted SPF 40", "TiZO Primer/Sunscreen Tinted SPF 40"].includes(result.featured.protect?.productName ?? ""));
});

test("CGC-10 No Strong Journey: no automated routine", () => {
  const result = generateCgcProductRecommendation({
    journeyResult: buildJourneyResult({
      resultType: "no-strong-journey",
      primaryJourneys: [],
      secondaryJourney: null,
      scores: { quench: 2, calm: 2, purify: 2, illuminate: 2, renew: 2 },
      supports: { quench: 1, calm: 1, purify: 1, illuminate: 1, renew: 1 },
    }),
    selectedAnswers: {
      primaryMotivation: "not-sure",
      skinExperience: ["not-sure"],
      desiredOutcomes: ["stay-healthy-balanced"],
    },
  });

  assert.equal(result.resultType, "needs-farmacist-personalization");
  assert.equal(result.featured.cleanse, null);
  assert.equal(result.featured.treat, null);
  assert.equal(result.featured.moisturize, null);
  assert.equal(result.featured.protect, null);
});

test("CGC route selects the CGC engine when gentlemens-corner is active", () => {
  const previousWindow = globalThis.window;
  const memoryStorage = {
    getItem: (key: string) => key === "skinDiscoveryExperience" ? "gentlemens-corner" : null,
    setItem: () => undefined,
    removeItem: () => undefined,
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { sessionStorage: memoryStorage },
  });

  try {
    const result = readOrCreateSkinDiscoveryRecommendations({
      resultType: "single-primary",
      primaryJourneys: ["quench"],
      secondaryJourney: null,
      scores: { quench: 10, calm: 0, purify: 0, illuminate: 0, renew: 0 },
      supports: { quench: 3, calm: 0, purify: 0, illuminate: 0, renew: 0 },
      selectedAnswers: {
        primaryMotivation: "dry-dehydrated",
        skinExperience: ["tight-after-cleansing", "dry-throughout-day"],
        desiredOutcomes: ["feel-more-hydrated"],
      },
    });

    assert.equal(result.productRecommendation.featured.cleanse?.productName, "Clean Slate");
    assert.equal(result.productRecommendation.featured.moisturize?.productName, "Thirsty Face");
    assert.equal(result.enhancementRecommendations.some((entry) => entry.name === "Dermaplaning"), false);
  } finally {
    if (previousWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: previousWindow,
      });
    }
  }
});

test("FFB regression: fresh-facial-bar-lash-lounge continues through the existing engine", () => {
  const previousWindow = globalThis.window;
  const memoryStorage = {
    getItem: (key: string) => key === "skinDiscoveryExperience" ? "fresh-facial-bar-lash-lounge" : null,
    setItem: () => undefined,
    removeItem: () => undefined,
  };

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { sessionStorage: memoryStorage },
  });

  try {
    const result = readOrCreateSkinDiscoveryRecommendations({
      resultType: "single-primary",
      primaryJourneys: ["renew"],
      secondaryJourney: "quench",
      scores: { quench: 7, calm: 0, purify: 0, illuminate: 0, renew: 10 },
      supports: { quench: 2, calm: 0, purify: 0, illuminate: 0, renew: 3 },
      selectedAnswers: {
        primaryMotivation: "aging",
        skinExperience: ["fine-lines-texture"],
        desiredOutcomes: ["feel-firmer-smoother"],
      },
    });

    assert.notEqual(result.productRecommendation.featured.cleanse?.productName, "Clean Slate");
    assert.equal(result.productRecommendation.resultType, "recommendations-ready");
  } finally {
    if (previousWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    } else {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: previousWindow,
      });
    }
  }
});
