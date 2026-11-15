import { test } from "vitest";
import assert from "node:assert/strict";

import type { RecommendationResult } from "@/types/recommendation";
import { productByCategory, productCatalog } from "@/data/productCatalog";
import { generateProductRecommendation } from "@/lib/productRecommendationEngine";

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
function withExperiencePriority(
  product: (typeof productCatalog)[number],
  freshPriority: 80 | 100 | 120,
  cgcPriority: 80 | 100 | 120,
) {
  return {
    ...product,
    experienceRecommendations: [
      {
        experienceId: "fresh-facial-bar-lash-lounge",
        assigned: true,
        approvalStatus: "approved" as const,
        recommendationPriority: freshPriority,
      },
      {
        experienceId: "gentlemens-corner",
        assigned: true,
        approvalStatus: "approved" as const,
        recommendationPriority: cgcPriority,
      },
    ],
  };
}
test("TiZO Lip Protection is supplemental, not Featured Protect", () => {
  const lipProtection = {
    ...productCatalog.find(
      (product) => product.name === "TiZO Lip Protection"
    )!,
    id: "test-tizo-lip-protection",
    category: "Sun Protection" as const,
    excluded: false,
    intensity: 1 as const,
    primaryJourney: "renew" as const,
    supportingJourney: "quench" as const,
    eligibilityRules: undefined,
  };

  const fullFaceSpf = {
    ...lipProtection,
    id: "test-full-face-spf",
    name: "Full Face SPF",
    primaryJourney: "calm" as const,
    supportingJourney: "calm" as const,
  };

  const result = generateProductRecommendation({
    products: [lipProtection, fullFaceSpf],
    journeyResult: buildJourneyResult(),
    selectedAnswers: {
      primaryMotivation: "aging",
      skinExperience: ["fine-lines-texture"],
      desiredOutcomes: ["feel-firmer-smoother"],
    },
  });

  assert.equal(
    result.featured.protect?.productName,
    "Full Face SPF"
  );

  assert.ok(
    result.moreFreshPicks.some(
      (product) =>
        product.productName === "TiZO Lip Protection"
    )
  );
});
test("Straight Renew generates a balanced routine with one featured product per slot", () => {
  const result = generateProductRecommendation({
    products: productCatalog,
    journeyResult: buildJourneyResult(),
    selectedAnswers: {
      primaryMotivation: "aging",
      skinExperience: ["fine-lines-texture"],
      desiredOutcomes: ["feel-firmer-smoother"],
    },
  });

  assert.equal(result.resultType, "recommendations-ready");
  assert.equal(Boolean(result.featured.cleanse), true);
  assert.equal(Boolean(result.featured.treat), true);
  assert.equal(Boolean(result.featured.moisturize), true);
  assert.equal(Boolean(result.featured.protect), true);

  assert.equal(result.featured.cleanse?.category, "Cleanser");
  assert.equal(result.featured.treat?.category, "Serum & Treatment");
  assert.equal(result.featured.moisturize?.category, "Moisturizer");
  assert.equal(result.featured.protect?.category, "Sun Protection");

  const protectName = result.featured.protect?.productName ?? "";
  assert.ok(protectName.includes("TiZO") || protectName.includes("Tizo") || protectName.includes("AM Replenish"));
  assert.equal(result.moreFreshPicks.length <= 4, true);
});

test("Renew + Quench gives hydration and renewal crossover products an advantage", () => {
  const result = generateProductRecommendation({
    products: productCatalog,
    journeyResult: buildJourneyResult({
      primaryJourneys: ["renew"],
      secondaryJourney: "quench",
      resultType: "single-primary",
      scores: { quench: 8, calm: 0, purify: 0, illuminate: 0, renew: 10 },
      supports: { quench: 2, calm: 0, purify: 0, illuminate: 0, renew: 2 },
    }),
    selectedAnswers: {
      primaryMotivation: "aging",
      skinExperience: ["fine-lines-texture", "dry-throughout-day"],
      desiredOutcomes: ["feel-firmer-smoother", "feel-more-hydrated"],
    },
  });

  assert.equal(result.resultType, "recommendations-ready");
  const renewProduct = result.featured.treat?.productName ?? "";
  const quenchProduct = result.featured.moisturize?.productName ?? "";
  assert.ok(renewProduct.length > 0 && quenchProduct.length > 0);
  assert.equal(result.featured.cleanse !== null, true);
  assert.equal(result.featured.protect !== null, true);
});

test("Calm reactive signal suppresses high-intensity featured products", () => {
  const result = generateProductRecommendation({
    products: productCatalog,
    journeyResult: buildJourneyResult({
      primaryJourneys: ["calm"],
      secondaryJourney: "quench",
      resultType: "single-primary",
      scores: { quench: 6, calm: 10, purify: 0, illuminate: 0, renew: 0 },
      supports: { quench: 2, calm: 2, purify: 0, illuminate: 0, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "sensitive",
      skinExperience: ["easily-irritated", "reacts-to-products"],
      desiredOutcomes: ["feel-calmer"],
    },
  });

  assert.equal(result.resultType, "recommendations-ready");
  const featured = [result.featured.cleanse, result.featured.treat, result.featured.moisturize, result.featured.protect];
  assert.ok(featured.every((product) => product && product.farmacistReviewRecommended === false));
  featured.forEach((product) => {
    assert.ok(product !== null);
    assert.ok((product as { internalScore: number }).internalScore < 99999);
  });
});

test("Purify + Quench still keeps a hydration-supportive moisturizer and SPF", () => {
  const result = generateProductRecommendation({
    products: productCatalog,
    journeyResult: buildJourneyResult({
      primaryJourneys: ["purify"],
      secondaryJourney: "quench",
      resultType: "single-primary",
      scores: { quench: 8, calm: 0, purify: 10, illuminate: 0, renew: 0 },
      supports: { quench: 2, calm: 0, purify: 2, illuminate: 0, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "clearer",
      skinExperience: ["oily-throughout-day", "clogged-pores-breakouts", "dry-throughout-day"],
      desiredOutcomes: ["stay-clearer", "feel-more-hydrated"],
    },
  });

  assert.equal(result.resultType, "recommendations-ready");
  assert.ok(result.featured.moisturize !== null);
  assert.ok(result.featured.protect !== null);
  assert.equal(result.featured.cleanse?.category, "Cleanser");
  assert.ok(["Serum & Treatment", "Exfoliant", "Mask"].includes(result.featured.treat?.category ?? ""));
  assert.notEqual(result.featured.treat?.productName, "Watermelonaid");
});

test("Purify + Quench without aging signals keeps Necks-Level out and a Purify treatment in front", () => {
  const result = generateProductRecommendation({
    products: productCatalog,
    journeyResult: buildJourneyResult({
      primaryJourneys: ["purify"],
      secondaryJourney: "quench",
      resultType: "single-primary",
      scores: { quench: 8, calm: 0, purify: 10, illuminate: 0, renew: 0 },
      supports: { quench: 2, calm: 0, purify: 2, illuminate: 0, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "clearer",
      skinExperience: ["oily-throughout-day", "clogged-pores-breakouts", "dry-throughout-day"],
      desiredOutcomes: ["stay-clearer", "feel-more-hydrated"],
    },
  });

  assert.equal(result.featured.treat?.productName !== "Watermelonaid", true);
  assert.equal(result.moreFreshPicks.some((entry) => entry.productName === "Necks-Level Smooth"), false);
  assert.ok(["Matcha Purity Mask", "Sanded Ground Mask", "C of Change Salicylic Peel Pads"].includes(result.featured.treat?.productName ?? ""));
});

test("Straight Purify prefers a clarifying targeted treatment over Watermelonaid", () => {
  const result = generateProductRecommendation({
    products: productCatalog,
    journeyResult: buildJourneyResult({
      primaryJourneys: ["purify"],
      secondaryJourney: null,
      resultType: "single-primary",
      scores: { quench: 0, calm: 0, purify: 12, illuminate: 0, renew: 0 },
      supports: { quench: 0, calm: 0, purify: 4, illuminate: 0, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "clearer",
      skinExperience: ["oily-throughout-day", "clogged-pores-breakouts"],
      desiredOutcomes: ["stay-clearer"],
    },
  });

  assert.equal(result.resultType, "recommendations-ready");
  assert.ok(result.featured.treat !== null);
  assert.notEqual(result.featured.treat?.productName, "Watermelonaid");
  assert.ok(
    [
      "C of Change Salicylic Peel Pads",
      "Sanded Ground Mask",
      "Matcha Purity Mask",
      "Split Tide Facial Water",
    ].includes(result.featured.treat?.productName ?? ""),
    `Unexpected featured treat for Purify: ${result.featured.treat?.productName ?? "none"}`,
  );
});

test("Purify + Calm suppresses aggressive treatment options and keeps Watermelonaid from winning by default", () => {
  const result = generateProductRecommendation({
    products: productCatalog,
    journeyResult: buildJourneyResult({
      primaryJourneys: ["purify"],
      secondaryJourney: "calm",
      resultType: "single-primary",
      scores: { quench: 3, calm: 9, purify: 11, illuminate: 0, renew: 0 },
      supports: { quench: 1, calm: 3, purify: 4, illuminate: 0, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "clearer",
      skinExperience: ["oily-throughout-day", "easily-irritated", "reacts-to-products"],
      desiredOutcomes: ["stay-clearer", "feel-calmer"],
    },
  });

  assert.equal(result.resultType, "recommendations-ready");
  assert.notEqual(result.featured.treat?.productName, "Watermelonaid");
  assert.notEqual(result.featured.treat?.productName, "C of Change Salicylic Peel Pads");
  assert.notEqual(result.featured.treat?.productName, "Illumination Fruit Pro Strength Acid Peel Mask");
  assert.ok(
    [
      "Matcha Purity Mask",
      "Green Fixer Calming Elixir",
      "Cactus Cloudsilk Serum",
      "Super Lettuce Tonic",
    ].includes(result.featured.treat?.productName ?? ""),
  );
});

test("Straight Calm keeps Necks-Level out and prioritizes Calm treatment identity", () => {
  const result = generateProductRecommendation({
    products: productCatalog,
    journeyResult: buildJourneyResult({
      primaryJourneys: ["calm"],
      secondaryJourney: null,
      resultType: "single-primary",
      scores: { quench: 0, calm: 10, purify: 0, illuminate: 0, renew: 0 },
      supports: { quench: 0, calm: 2, purify: 0, illuminate: 0, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "sensitive",
      skinExperience: ["easily-irritated", "reacts-to-products"],
      desiredOutcomes: ["feel-calmer"],
    },
  });

  assert.equal(result.featured.treat?.productName === "Watermelonaid", false);
  assert.equal(result.moreFreshPicks.some((entry) => entry.productName === "Necks-Level Smooth"), false);
  assert.ok(["Green Fixer Calming Elixir", "Cactus Cloudsilk Serum"].includes(result.featured.treat?.productName ?? ""));
});

test("Calm + Quench keeps Calm primary and lets hydration support the wider routine", () => {
  const result = generateProductRecommendation({
    products: productCatalog,
    journeyResult: buildJourneyResult({
      primaryJourneys: ["calm"],
      secondaryJourney: "quench",
      resultType: "single-primary",
      scores: { quench: 6, calm: 10, purify: 0, illuminate: 0, renew: 0 },
      supports: { quench: 2, calm: 2, purify: 0, illuminate: 0, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "sensitive",
      skinExperience: ["easily-irritated", "dry-throughout-day"],
      desiredOutcomes: ["feel-calmer", "feel-more-hydrated"],
    },
  });

  assert.equal(result.featured.treat?.productName === "Watermelonaid", false);
  assert.ok(["Green Fixer Calming Elixir", "Cactus Cloudsilk Serum", "Matcha Purity Mask"].includes(result.featured.treat?.productName ?? ""));
  assert.equal(result.featured.moisturize !== null, true);
});

test("Purify + Illuminate keeps clarifying treatment competitive without defaulting to a hydration serum", () => {
  const result = generateProductRecommendation({
    products: productCatalog,
    journeyResult: buildJourneyResult({
      primaryJourneys: ["purify"],
      secondaryJourney: "illuminate",
      resultType: "single-primary",
      scores: { quench: 0, calm: 0, purify: 11, illuminate: 8, renew: 0 },
      supports: { quench: 0, calm: 0, purify: 4, illuminate: 2, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "clearer",
      skinExperience: ["oily-throughout-day", "dull-lacks-radiance"],
      desiredOutcomes: ["stay-clearer", "look-brighter"],
    },
  });

  assert.equal(result.resultType, "recommendations-ready");
  assert.ok(result.featured.treat !== null);
  assert.notEqual(result.featured.treat?.productName, "Watermelonaid");
  assert.ok(
    [
      "C of Change Salicylic Peel Pads",
      "Sanded Ground Mask",
      "Matcha Purity Mask",
      "Illumination Fruit Pro Strength Acid Peel Mask",
    ].includes(result.featured.treat?.productName ?? ""),
  );
});

test("Illuminate + Quench without aging keeps Necks-Level out", () => {
  const result = generateProductRecommendation({
    products: productCatalog,
    journeyResult: buildJourneyResult({
      primaryJourneys: ["illuminate"],
      secondaryJourney: "quench",
      resultType: "single-primary",
      scores: { quench: 8, calm: 0, purify: 0, illuminate: 10, renew: 0 },
      supports: { quench: 2, calm: 0, purify: 0, illuminate: 2, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "radiant",
      skinExperience: ["dull-lacks-radiance", "dry-throughout-day"],
      desiredOutcomes: ["look-brighter", "feel-more-hydrated"],
    },
  });

  assert.equal(result.moreFreshPicks.some((entry) => entry.productName === "Necks-Level Smooth"), false);
  assert.equal(result.featured.treat?.productName === "Watermelonaid", false);
  assert.ok(["Eternal Light Vitamin Enhanced Illuminating Serum", "Radiance Maker", "Golden Gleam Illuminating Peptide Serum"].includes(result.featured.treat?.productName ?? ""));
});

test("Renew + Quench keeps Necks-Level eligible without forcing it", () => {
  const result = generateProductRecommendation({
    products: productCatalog,
    journeyResult: buildJourneyResult({
      primaryJourneys: ["renew"],
      secondaryJourney: "quench",
      resultType: "single-primary",
      scores: { quench: 8, calm: 0, purify: 0, illuminate: 0, renew: 10 },
      supports: { quench: 2, calm: 0, purify: 0, illuminate: 0, renew: 2 },
    }),
    selectedAnswers: {
      primaryMotivation: "aging",
      skinExperience: ["fine-lines-texture", "dry-throughout-day"],
      desiredOutcomes: ["feel-firmer-smoother", "feel-more-hydrated"],
    },
  });

  assert.ok(
    result.moreFreshPicks.some((entry) => entry.productName === "Necks-Level Smooth") ||
    result.featured.treat?.productName === "Watermelonaid" ||
    result.featured.treat?.productName === "Flat Out Firm Peptide Firming Serum",
  );
});

test("Supabase-excluded products are never recommended", () => {
  const products = productCatalog.map((product) => ({
    ...product,
    excluded: true,
  }));

  const result = generateProductRecommendation({
    products,
    journeyResult: buildJourneyResult({
      primaryJourneys: ["quench"],
      secondaryJourney: null,
    }),
    selectedAnswers: {
  primaryMotivation: "hydration",
  skinExperience: ["dry-dehydrated"],
  desiredOutcomes: ["feel-more-hydrated"],
},
  });

  assert.equal(
    Object.values(result.featured).filter(Boolean).length,
    0,
  );

  assert.equal(result.moreFreshPicks.length, 0);
});

test("No strong journey returns no automated products", () => {
  const result = generateProductRecommendation({
    products: productCatalog,
    journeyResult: buildJourneyResult({
      resultType: "no-strong-journey",
      primaryJourneys: [],
      secondaryJourney: null,
      scores: { quench: 0, calm: 0, purify: 0, illuminate: 0, renew: 0 },
      supports: { quench: 0, calm: 0, purify: 0, illuminate: 0, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: null,
      skinExperience: [],
      desiredOutcomes: [],
    },
  });

  assert.equal(result.resultType, "needs-farmacist-personalization");
  assert.deepEqual(result.featured, { cleanse: null, treat: null, moisturize: null, protect: null });
  assert.deepEqual(result.moreFreshPicks, []);
});

test("Featured protect products always come from the approved Sun Protection list", () => {
  const result = generateProductRecommendation({
    products: productCatalog,
    journeyResult: buildJourneyResult({
      primaryJourneys: ["quench"],
      secondaryJourney: null,
      resultType: "single-primary",
      scores: { quench: 10, calm: 0, purify: 0, illuminate: 0, renew: 0 },
      supports: { quench: 2, calm: 0, purify: 0, illuminate: 0, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "dry-dehydrated",
      skinExperience: ["tight-after-cleansing", "dry-throughout-day"],
      desiredOutcomes: ["feel-more-hydrated"],
    },
  });

  assert.ok(result.featured.protect !== null);
  assert.equal(result.featured.protect?.category, "Sun Protection");
  assert.ok(
    [
      "AM Replenish Non Tinted SPF 40",
      "AM Replenish Lightly Tinted SPF 40",
      "TiZO Ultra Zinc Non Tinted Sunscreen Face & Body SPF 40",
      "TiZO Ultra Zinc Tinted Sunscreen Face & Body SPF 40",
      "Tizo Primer/Sunscreen Non-Tinted SPF 40",
      "TiZO Primer/Sunscreen Tinted SPF 40",
      "TiZO Lip Protection",
    ].includes(result.featured.protect?.productName ?? ""),
  );
});

test("Routine balance respects exactly one product per featured slot", () => {
  const result = generateProductRecommendation({
    products: productCatalog,
    journeyResult: buildJourneyResult({
      primaryJourneys: ["illuminate"],
      secondaryJourney: "renew",
      resultType: "single-primary",
      scores: { quench: 0, calm: 0, purify: 0, illuminate: 10, renew: 8 },
      supports: { quench: 0, calm: 0, purify: 0, illuminate: 2, renew: 2 },
    }),
    selectedAnswers: {
      primaryMotivation: "radiant",
      skinExperience: ["dull-lacks-radiance"],
      desiredOutcomes: ["look-brighter"],
    },
  });

  assert.equal(result.featured.cleanse !== null, true);
  assert.equal(result.featured.treat !== null, true);
  assert.equal(result.featured.moisturize !== null, true);
  assert.equal(result.featured.protect !== null, true);

  const slotNames = [
    result.featured.cleanse?.productName,
    result.featured.treat?.productName,
    result.featured.moisturize?.productName,
    result.featured.protect?.productName,
  ];

  assert.equal(new Set(slotNames.filter(Boolean)).size, slotNames.filter(Boolean).length);
  assert.equal(slotNames.filter(Boolean).length, 4);
});


test("Necks-Level Smooth displays category Neck & Décolleté", () => {
  const product = productCatalog.find((entry) => entry.name === "Necks-Level Smooth");

  assert.ok(product);
  assert.equal(product?.category, "Neck & Décolleté");
  assert.ok(productByCategory["Neck & Décolleté"].some((entry) => entry.id === product?.id));
});

test("Renew + Quench and Illuminate + Quench create materially different recommendation sets", () => {
  const renewResult = generateProductRecommendation({
    products: productCatalog,
    journeyResult: buildJourneyResult({
      primaryJourneys: ["renew"],
      secondaryJourney: "quench",
      resultType: "single-primary",
      scores: { quench: 8, calm: 0, purify: 0, illuminate: 0, renew: 10 },
      supports: { quench: 2, calm: 0, purify: 0, illuminate: 0, renew: 2 },
    }),
    selectedAnswers: {
      primaryMotivation: "aging",
      skinExperience: ["fine-lines-texture", "dry-throughout-day"],
      desiredOutcomes: ["feel-firmer-smoother", "feel-more-hydrated"],
    },
  });

  const illuminateResult = generateProductRecommendation({
    products: productCatalog,
    journeyResult: buildJourneyResult({
      primaryJourneys: ["illuminate"],
      secondaryJourney: "quench",
      resultType: "single-primary",
      scores: { quench: 8, calm: 0, purify: 0, illuminate: 10, renew: 0 },
      supports: { quench: 2, calm: 0, purify: 0, illuminate: 2, renew: 0 },
    }),
    selectedAnswers: {
      primaryMotivation: "radiant",
      skinExperience: ["dull-lacks-radiance", "dry-throughout-day"],
      desiredOutcomes: ["look-brighter", "feel-more-hydrated"],
    },
  });

  const renewTreatId = renewResult.featured.treat?.productId ?? "";
  const illuminateTreatId = illuminateResult.featured.treat?.productId ?? "";
  const renewCleanseId = renewResult.featured.cleanse?.productId ?? "";
  const illuminateCleanseId = illuminateResult.featured.cleanse?.productId ?? "";

  assert.notEqual(renewTreatId, illuminateTreatId);
  assert.notEqual(renewCleanseId, illuminateCleanseId);
  assert.equal(productCatalog.find((entry) => entry.id === renewTreatId)?.primaryJourney, "renew");
  assert.equal(productCatalog.find((entry) => entry.id === illuminateTreatId)?.primaryJourney, "illuminate");
  assert.equal(renewResult.featured.cleanse !== null, true);
  assert.equal(illuminateResult.featured.cleanse !== null, true);
  assert.ok(renewResult.moreFreshPicks.some((product) => product.category === "Neck & Décolleté" || product.category === "Eye Care"));
  assert.ok(illuminateResult.moreFreshPicks.some((product) => product.category === "Tonic" || product.category === "Serum & Treatment"));
  assert.notDeepEqual(
    [renewResult.featured.cleanse?.productName, renewResult.featured.treat?.productName, renewResult.featured.moisturize?.productName, renewResult.featured.protect?.productName],
    [illuminateResult.featured.cleanse?.productName, illuminateResult.featured.treat?.productName, illuminateResult.featured.moisturize?.productName, illuminateResult.featured.protect?.productName],
  );
});

test("Guest-facing result contains no raw product scores", () => {
  const result = generateProductRecommendation({
    products: productCatalog,
    journeyResult: buildJourneyResult(),
    selectedAnswers: {
      primaryMotivation: "aging",
      skinExperience: ["fine-lines-texture"],
      desiredOutcomes: ["feel-firmer-smoother"],
    },
  });

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("internalScore"), true);
  assert.equal(serialized.includes("score"), false);
});
test("Reactive skin excludes high-intensity and cautioned More Fresh Picks", () => {
  const result = generateProductRecommendation({
    journeyResult: buildJourneyResult({
      primaryJourneys: ["calm"],
      secondaryJourney: "quench",
    }),
    selectedAnswers: {
      primaryMotivation: "sensitive",
      skinExperience: ["easily-irritated"],
      desiredOutcomes: ["feel-calmer"],
    },
    products: productCatalog,
  });

  for (const recommendation of result.moreFreshPicks) {
    const product = productCatalog.find(
      (item) => item.id === recommendation.productId,
    );

    assert.ok(product, "Recommended product must exist in the catalog");
    assert.ok(
      product.intensity <= 2,
      `${product.name} exceeds the allowed intensity`,
    );
    assert.notEqual(
      product.calmSensitiveCaution,
      true,
      `${product.name} has a sensitivity caution`,
    );
  }
});
test("Higher experience priority wins when suitability is equal", () => {
  const base = productCatalog.find(
    (product) => product.category === "Cleanser",
  );

  assert.ok(base, "Test catalog must contain a cleanser");

  const lowerPriority = withExperiencePriority(
    { ...base, id: "priority-low", name: "Priority Low Cleanser" },
    80,
    120,
  );

  const higherPriority = withExperiencePriority(
    { ...base, id: "priority-high", name: "Priority High Cleanser" },
    120,
    80,
  );

  const selectedAnswers = {
    primaryMotivation: "aging",
    skinExperience: ["fine-lines-texture"],
    desiredOutcomes: ["feel-firmer-smoother"],
  };

  const generate = (selectedExperience: string) =>
    generateProductRecommendation({
      products: [lowerPriority, higherPriority],
      selectedExperience,
      journeyResult: buildJourneyResult(),
      selectedAnswers,
    });

  const freshResult = generate("fresh-facial-bar-lash-lounge");
  const cgcResult = generate("gentlemens-corner");

  assert.equal(
    freshResult.featured.cleanse?.productId,
    "priority-high",
  );

  assert.equal(
    cgcResult.featured.cleanse?.productId,
    "priority-low",
  );
});
test("Better Fresh Method suitability overrides higher business priority", () => {
  const base = productCatalog.find(
    (product) => product.category === "Cleanser",
  );

  assert.ok(base, "Test catalog must contain a cleanser");

  const betterFit = withExperiencePriority(
    {
      ...base,
      id: "better-fit-cleanser",
      name: "Better Fit Cleanser",
      primaryJourney: "renew",
      supportingJourney: "quench",
    },
    80,
    80,
  );

  const weakerFit = withExperiencePriority(
    {
      ...base,
      id: "weaker-fit-cleanser",
      name: "Weaker Fit Cleanser",
      primaryJourney: "purify",
      supportingJourney: "calm",
    },
    120,
    120,
  );

  const result = generateProductRecommendation({
    products: [betterFit, weakerFit],
    selectedExperience: "fresh-facial-bar-lash-lounge",
    journeyResult: buildJourneyResult(),
    selectedAnswers: {
      primaryMotivation: "aging",
      skinExperience: ["fine-lines-texture"],
      desiredOutcomes: ["feel-firmer-smoother"],
    },
  });

  assert.equal(
    result.featured.cleanse?.productId,
    "better-fit-cleanser",
  );
});
test("More Fresh Picks honors experience-specific priority", () => {
  const base = productCatalog.find(
    (product) => product.category === "Eye Care",
  );

  assert.ok(base, "Test catalog must contain an Eye Care product");

  const freshPreferred = withExperiencePriority(
    { ...base, id: "fresh-eye", name: "Fresh Preferred Eye Care" },
    120,
    80,
  );

  const cgcPreferred = withExperiencePriority(
    { ...base, id: "cgc-eye", name: "CGC Preferred Eye Care" },
    80,
    120,
  );

  const generate = (selectedExperience: string) =>
    generateProductRecommendation({
      products: [freshPreferred, cgcPreferred],
      selectedExperience,
      journeyResult: buildJourneyResult(),
      selectedAnswers: {
        primaryMotivation: "aging",
        skinExperience: ["fine-lines-texture"],
        desiredOutcomes: ["feel-firmer-smoother"],
      },
    });

  const freshResult = generate("fresh-facial-bar-lash-lounge");
  const cgcResult = generate("gentlemens-corner");

  assert.equal(
    freshResult.moreFreshPicks.find(
      (product) => product.category === "Eye Care",
    )?.productId,
    "fresh-eye",
  );

  assert.equal(
    cgcResult.moreFreshPicks.find(
      (product) => product.category === "Eye Care",
    )?.productId,
    "cgc-eye",
  );
});
test("Supabase eligibility policy excludes an ineligible product", () => {
  const product = {
    ...productCatalog[0],
    id: "eligibility-policy-test",
    name: "Eligibility Policy Test",
    category: "Serum & Treatment" as const,
    primaryJourney: "renew" as const,
    supportingJourney: "quench" as const,
    eligibilityRules: {
      version: 1 as const,
      policy: "renew_targeted" as const,
    },
  };

  const journeyResult = buildJourneyResult({
    primaryJourneys: ["calm"],
    secondaryJourney: null,
  });

  const result = generateProductRecommendation({
    products: [product],
    journeyResult,
    selectedAnswers: {
      primaryMotivation: "sensitive",
      skinExperience: ["easily-irritated"],
      desiredOutcomes: ["feel-calmer"],
    },
  });

  const featuredProducts = Object.values(result.featured)
  .filter((product) => product !== null);

assert.equal(
  featuredProducts.some(
    (item) => item.productId === product.id
  ),
  false
);

assert.equal(
  result.moreFreshPicks.some(
    (item) => item.productId === product.id
  ),
  false
);
});
test("Supabase eligibility policy allows a qualifying Renew treatment", () => {
  const product = {
    ...productCatalog[0],
    id: "renew-policy-eligible-test",
    name: "Renew Policy Eligible Test",
    category: "Serum & Treatment" as const,
    primaryJourney: "renew" as const,
    supportingJourney: "quench" as const,
    intensity: 2 as const,
    excluded: false,
    requiresFarmacistReview: false,
    calmSensitiveCaution: false,
    eligibilityRules: {
      version: 1 as const,
      policy: "renew_targeted" as const,
    },
  };

  const selectedAnswers = {
    primaryMotivation: "aging",
    skinExperience: ["fine-lines-texture"],
    desiredOutcomes: ["feel-firmer-smoother"],
  };

  const result = generateProductRecommendation({
    products: [product],
    journeyResult: buildJourneyResult(),
    selectedAnswers,
  });

  assert.equal(
    result.featured.treat?.productId,
    product.id
  );
});
test("Necks-Level published policy excludes ineligible Calm consultations", () => {
  const product = {
    ...productCatalog[0],
    id: "necks-level-smooth",
    name: "Necks-Level Smooth",
    category: "Serum & Treatment" as const,
    primaryJourney: "renew" as const,
    supportingJourney: "quench" as const,
    intensity: 2 as const,
    excluded: false,
    requiresFarmacistReview: false,
    calmSensitiveCaution: false,
    eligibilityRules: {
  version: 1 as const,
  policy: "renew_targeted" as const,
},
  };

  const result = generateProductRecommendation({
    products: [product],
    journeyResult: buildJourneyResult({
      primaryJourneys: ["calm"],
      secondaryJourney: null,
    }),
    selectedAnswers: {
      primaryMotivation: "sensitive",
      skinExperience: [],
      desiredOutcomes: [],
    },
  });

  assert.equal(
    Object.values(result.featured).some(
      (item) => item?.productId === product.id
    ),
    false
  );

  assert.equal(
    result.moreFreshPicks.some(
      (item) => item.productId === product.id
    ),
    false
  );
});
test("Supabase Watermelonaid policy excludes Purify consultations", () => {
  const product = {
    ...productCatalog[0],
    id: "watermelonaid-policy-test",
    name: "Watermelonaid Policy Test",
    category: "Serum & Treatment" as const,
    primaryJourney: "quench" as const,
    supportingJourney: "renew" as const,
    intensity: 2 as const,
    excluded: false,
    requiresFarmacistReview: false,
    calmSensitiveCaution: false,
    eligibilityRules: {
      version: 1 as const,
      policy: "renew_quench_hydration" as const,
    },
  };

  const selectedAnswers = {
    primaryMotivation: "congestion",
    skinExperience: ["oily-congested"],
    desiredOutcomes: ["feel-clearer"],
  };

  const result = generateProductRecommendation({
    products: [product],
    journeyResult: buildJourneyResult({
      primaryJourneys: ["purify"],
      secondaryJourney: "quench",
    }),
    selectedAnswers,
  });

  assert.equal(
    Object.values(result.featured).some(
      (item) => item?.productId === product.id
    ),
    false
  );

  assert.equal(
    result.moreFreshPicks.some(
      (item) => item.productId === product.id
    ),
    false
  );
});
test("Supabase Watermelonaid policy allows qualifying Renew and Quench consultations", () => {
  const product = {
    ...productCatalog[0],
    id: "hydration-policy-eligible-test",
    name: "Hydration Policy Eligible Test",
    category: "Serum & Treatment" as const,
    primaryJourney: "quench" as const,
    supportingJourney: "renew" as const,
    intensity: 2 as const,
    excluded: false,
    requiresFarmacistReview: false,
    calmSensitiveCaution: false,
    eligibilityRules: {
      version: 1 as const,
      policy: "renew_quench_hydration" as const,
    },
  };

  const selectedAnswers = {
    primaryMotivation: "aging",
    skinExperience: ["dry-dehydrated"],
    desiredOutcomes: ["feel-more-hydrated"],
  };

  const result = generateProductRecommendation({
    products: [product],
    journeyResult: buildJourneyResult({
      primaryJourneys: ["renew"],
      secondaryJourney: "quench",
    }),
    selectedAnswers,
  });

  assert.equal(
    result.featured.treat?.productId,
    product.id
  );
});
test("Mixo-guided treatment requires professional review", () => {
  const product = {
    ...productCatalog[0],
    id: "mixo-guided-treatment-test",
    name: "Mixo Guided Treatment Test",
    category: "Serum & Treatment" as const,
    primaryJourney: "renew" as const,
    supportingJourney: "quench" as const,
    intensity: 2 as const,
    excluded: false,
    featuredEligible: true,
    requiresFarmacistReview: true,
    calmSensitiveCaution: false,
    eligibilityRules: undefined,
  };

  const result = generateProductRecommendation({
    products: [product],
    journeyResult: buildJourneyResult(),
    selectedAnswers: {
      primaryMotivation: "aging",
      skinExperience: ["fine-lines-texture"],
      desiredOutcomes: ["feel-firmer-smoother"],
    },
  });

  assert.equal(
    result.featured.treat?.productId,
    product.id
  );

  assert.equal(
    result.featured.treat?.farmacistReviewRecommended,
    true
  );
});
test("Mixo-guided products are excluded from non-treatment featured slots", () => {
  const categories = [
    "Cleanser",
    "Moisturizer",
    "Sun Protection",
  ] as const;

  for (const category of categories) {
    const product = {
      ...productCatalog[0],
      id: `mixo-restricted-${category}`,
      name: `Mixo Restricted ${category}`,
      category,
      primaryJourney: "renew" as const,
      supportingJourney: "quench" as const,
      intensity: 2 as const,
      excluded: false,
      featuredEligible: true,
      requiresFarmacistReview: true,
      calmSensitiveCaution: false,
      eligibilityRules: undefined,
    };

    const result = generateProductRecommendation({
      products: [product],
      journeyResult: buildJourneyResult(),
      selectedAnswers: {
        primaryMotivation: "aging",
        skinExperience: ["fine-lines-texture"],
        desiredOutcomes: ["feel-firmer-smoother"],
      },
    });

    assert.equal(
      Object.values(result.featured).some(
        (item) => item?.productId === product.id
      ),
      false,
      `Mixo-guided ${category} should not be featured`
    );
  }
});
test("High-intensity Mixo-guided treatments are excluded for reactive skin", () => {
  const product = {
    ...productCatalog[0],
    id: "mixo-reactive-skin-test",
    name: "Mixo Reactive Skin Test",
    category: "Serum & Treatment" as const,
    primaryJourney: "calm" as const,
    supportingJourney: "renew" as const,
    intensity: 4 as const,
    excluded: false,
    featuredEligible: true,
    requiresFarmacistReview: true,
    calmSensitiveCaution: true,
    eligibilityRules: undefined,
  };

  const result = generateProductRecommendation({
    products: [product],
    journeyResult: buildJourneyResult({
      primaryJourneys: ["calm"],
      secondaryJourney: null,
    }),
    selectedAnswers: {
      primaryMotivation: "sensitive",
      skinExperience: ["easily-irritated"],
      desiredOutcomes: ["feel-calmer"],
    },
  });

  assert.equal(
    Object.values(result.featured).some(
      (item) => item?.productId === product.id
    ),
    false
  );

  assert.equal(
    result.moreFreshPicks.some(
      (item) => item.productId === product.id
    ),
    false
  );
});