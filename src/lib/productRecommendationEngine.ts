import { productCatalog, PRODUCT_EXCLUSIONS } from "@/data/productCatalog";
import type {
  Product,
  ProductCategory,
  ProductRecommendationResult,
  RecommendedProduct,
} from "@/types/productRecommendation";
import type { JourneyId, RecommendationResult } from "@/types/recommendation";

export { PRODUCT_EXCLUSIONS };

const FEATURED_SLOT_MAP: Record<"cleanse" | "treat" | "moisturize" | "protect", ProductCategory> = {
  cleanse: "Cleanser",
  treat: "Serum & Treatment",
  moisturize: "Moisturizer",
  protect: "Sun Protection",
};

const TARGETED_TREATMENT_CATEGORIES: ProductCategory[] = ["Serum & Treatment", "Exfoliant", "Mask"];
const PURIFY_TREATMENT_PRIORITY = new Set([
  "C of Change Salicylic Peel Pads",
  "Sanded Ground Mask",
  "Matcha Purity Mask",
  "Illumination Fruit Pro Strength Acid Peel Mask",
]);

function isStrongCalmReactive(selectedAnswers: { primaryMotivation: string | null; skinExperience: string[]; desiredOutcomes: string[] }): boolean {
  const answerSet = normalizeSelectedAnswers(selectedAnswers);
  const sensitivitySignals = ["sensitive", "easily-irritated", "reacts-to-products", "feel-calmer"];
  return [...answerSet].some((answer) => sensitivitySignals.includes(answer));
}

function normalizeSelectedAnswers(selectedAnswers: {
  primaryMotivation: string | null;
  skinExperience: string[];
  desiredOutcomes: string[];
}) {
  const values = [
    selectedAnswers.primaryMotivation,
    ...selectedAnswers.skinExperience,
    ...selectedAnswers.desiredOutcomes,
  ].filter(Boolean) as string[];

  return new Set(values);
}

function hasExplicitAgingSignal(selectedAnswers: { primaryMotivation: string | null; skinExperience: string[]; desiredOutcomes: string[] }): boolean {
  const answerSet = normalizeSelectedAnswers(selectedAnswers);
  return [...answerSet].some((answer) => ["aging", "fine-lines-texture", "feel-firmer-smoother"].includes(answer));
}

function isNecksLevelEligible(
  primaryJourneys: JourneyId[],
  secondaryJourney: JourneyId | null,
  selectedAnswers: { primaryMotivation: string | null; skinExperience: string[]; desiredOutcomes: string[] },
): boolean {
  const primarySet = new Set(primaryJourneys);

  if (primarySet.has("renew")) {
    return true;
  }

  if (primarySet.has("illuminate") && secondaryJourney === "renew") {
    return true;
  }

  if (secondaryJourney === "renew" && hasExplicitAgingSignal(selectedAnswers)) {
    return true;
  }

  return false;
}

function isWatermelonaidEligible(
  primaryJourneys: JourneyId[],
  secondaryJourney: JourneyId | null,
  selectedAnswers: { primaryMotivation: string | null; skinExperience: string[]; desiredOutcomes: string[] },
): boolean {
  const answerSet = normalizeSelectedAnswers(selectedAnswers);
  const primarySet = new Set(primaryJourneys);
  const hydrationAgingSignals = [
    "dry-dehydrated",
    "tight-after-cleansing",
    "dry-throughout-day",
    "feel-more-hydrated",
    "aging",
    "fine-lines-texture",
    "feel-firmer-smoother",
  ];

  if (primarySet.has("calm") || primarySet.has("purify") || primarySet.has("illuminate") || secondaryJourney === "calm" || secondaryJourney === "purify" || secondaryJourney === "illuminate") {
    return false;
  }

  const renewQuenchSupported = primarySet.has("renew") || primarySet.has("quench") || secondaryJourney === "renew" || secondaryJourney === "quench";
  const hasHydrationAgingSignal = [...answerSet].some((answer) => hydrationAgingSignals.includes(answer));

  return renewQuenchSupported && hasHydrationAgingSignal;
}

function createMatchReasons(product: Product, primaryJourneys: JourneyId[], secondaryJourney: JourneyId | null) {
  const reasons: string[] = [];
  const primary = primaryJourneys[0] ?? null;

  if (primary && product.primaryJourney === primary) {
    reasons.push(`Matches your ${primary} priority with a strong fit for your skin.`);
  }

  if (secondaryJourney && product.primaryJourney === secondaryJourney) {
    reasons.push(`Supports the secondary ${secondaryJourney} direction that also showed up in your answers.`);
  }

  if (primary && product.supportingJourney === primary) {
    reasons.push(`Builds on your ${primary} direction without overcomplicating your routine.`);
  }

  if (product.role.toLowerCase().includes("hydrate") || product.role.toLowerCase().includes("comfort")) {
    reasons.push(product.guestBenefit);
  }

  if (reasons.length === 0) {
    reasons.push(product.guestBenefit);
  }

  return reasons.slice(0, 2);
}

function addModifierSignals(
  selectedAnswers: { primaryMotivation: string | null; skinExperience: string[]; desiredOutcomes: string[] },
): string[] {
  const answerSet = normalizeSelectedAnswers(selectedAnswers);
  const modifiers = new Set<string>();

  const hydrationSignals = [
    "dry-dehydrated",
    "tight-after-cleansing",
    "dry-throughout-day",
    "feel-more-hydrated",
  ];
  const sensitivitySignals = ["sensitive", "easily-irritated", "reacts-to-products", "feel-calmer"];
  const congestionSignals = ["clearer", "oily-throughout-day", "clogged-pores-breakouts", "stay-clearer"];
  const brightnessSignals = ["radiant", "dull-lacks-radiance", "look-brighter"];
  const renewalSignals = ["aging", "fine-lines-texture", "feel-firmer-smoother"];

  if ([...answerSet].some((answer) => hydrationSignals.includes(answer))) {
    modifiers.add("Hydration support");
  }

  if ([...answerSet].some((answer) => sensitivitySignals.includes(answer))) {
    modifiers.add("Sensitivity protection");
  }

  if ([...answerSet].some((answer) => congestionSignals.includes(answer))) {
    modifiers.add("Clarity and balance");
  }

  if ([...answerSet].some((answer) => brightnessSignals.includes(answer))) {
    modifiers.add("Radiance boost");
  }

  if ([...answerSet].some((answer) => renewalSignals.includes(answer))) {
    modifiers.add("Renewal support");
  }

  return [...modifiers];
}

function scoreProduct(
  product: Product,
  primaryJourneys: JourneyId[],
  secondaryJourney: JourneyId | null,
  selectedAnswers: { primaryMotivation: string | null; skinExperience: string[]; desiredOutcomes: string[] },
): number {
  const answerSet = normalizeSelectedAnswers(selectedAnswers);
  let score = 0;

  const primarySet = new Set(primaryJourneys);
  const strongCalmReactive = isStrongCalmReactive(selectedAnswers);

  if (primarySet.has(product.primaryJourney)) {
    score += 10;
  }
  if (primarySet.has(product.supportingJourney)) {
    score += 5;
  }
  if (secondaryJourney && product.primaryJourney === secondaryJourney) {
    score += 4;
  }
  if (secondaryJourney && product.supportingJourney === secondaryJourney) {
    score += 2;
  }
  if (secondaryJourney && primarySet.has(product.primaryJourney) && product.supportingJourney === secondaryJourney) {
    score += 4;
  }
  if (secondaryJourney && primarySet.has(product.supportingJourney) && product.primaryJourney === secondaryJourney) {
    score += 3;
  }

  if (primarySet.has("purify") || secondaryJourney === "purify") {
    if (product.primaryJourney === "purify" || product.supportingJourney === "purify") {
      score += 10;
    }

    if (PURIFY_TREATMENT_PRIORITY.has(product.name)) {
      score += 12;
    }

    if (product.name === "Illumination Fruit Pro Strength Acid Peel Mask" && !strongCalmReactive) {
      score += 4;
    }

    if (product.name === "Watermelonaid") {
      score -= secondaryJourney === "quench" ? 7 : 14;
    }
  }

  if (strongCalmReactive) {
    if (["C of Change Salicylic Peel Pads", "Illumination Fruit Pro Strength Acid Peel Mask"].includes(product.name)) {
      score -= 28;
    }
    if (product.name === "Sanded Ground Mask") {
      score -= 12;
    }
  }

  const hydrationSignals = [
    "dry-dehydrated",
    "tight-after-cleansing",
    "dry-throughout-day",
    "feel-more-hydrated",
  ];
  const sensitivitySignals = ["sensitive", "easily-irritated", "reacts-to-products", "feel-calmer"];
  const congestionSignals = ["clearer", "oily-throughout-day", "clogged-pores-breakouts", "stay-clearer"];
  const brightnessSignals = ["radiant", "dull-lacks-radiance", "look-brighter"];
  const renewalSignals = ["aging", "fine-lines-texture", "feel-firmer-smoother"];

  if ([...answerSet].some((answer) => hydrationSignals.includes(answer))) {
    if (["quench", "calm"].includes(product.primaryJourney) || ["quench", "calm"].includes(product.supportingJourney)) {
      if (["Hydrate", "Replenish", "Restore", "Comfort", "Reset", "Refresh", "Balance"].includes(product.role)) {
        score += 4;
      }
    }
  }

  if ([...answerSet].some((answer) => sensitivitySignals.includes(answer))) {
    if (product.calmSensitiveCaution) {
      score -= 16;
    }
    if (product.intensity <= 2) {
      score += 5;
    } else {
      score -= 8;
    }
  }

  if ([...answerSet].some((answer) => congestionSignals.includes(answer))) {
    if (["purify", "calm"].includes(product.primaryJourney) || ["purify", "calm"].includes(product.supportingJourney)) {
      if (["Clarify", "Balance", "Refine"].includes(product.role)) {
        score += 4;
      }
    }
  }

  if ([...answerSet].some((answer) => brightnessSignals.includes(answer))) {
    if (["illuminate", "renew"].includes(product.primaryJourney) || ["illuminate", "renew"].includes(product.supportingJourney)) {
      if (["Brighten", "Glow", "Refine", "Resurface"].includes(product.role)) {
        score += 4;
      }
    }
  }

  if ([...answerSet].some((answer) => renewalSignals.includes(answer))) {
    if (["renew", "illuminate"].includes(product.primaryJourney) || ["renew", "illuminate"].includes(product.supportingJourney)) {
      if (["Renew", "Firm", "Lift", "Refine"].includes(product.role)) {
        score += 4;
      }
    }
  }

  if (product.requiresFarmacistReview) {
    score -= 5;
  }

  if (product.excluded) {
    score -= 999;
  }

  return score;
}

function pickFeaturedProduct(
  slot: "cleanse" | "treat" | "moisturize" | "protect",
  eligible: Product[],
  selectedIds: Set<string>,
  primaryJourneys: JourneyId[],
  secondaryJourney: JourneyId | null,
  selectedAnswers: { primaryMotivation: string | null; skinExperience: string[]; desiredOutcomes: string[] },
): RecommendedProduct | null {
  const category = FEATURED_SLOT_MAP[slot];
  const answerSet = normalizeSelectedAnswers(selectedAnswers);
  let pool = eligible.filter((product) => {
    if (selectedIds.has(product.id)) {
      return false;
    }

    if (slot === "treat") {
      if (!TARGETED_TREATMENT_CATEGORIES.includes(product.category)) {
        return false;
      }
    } else if (product.category !== category) {
      return false;
    }

    if (product.name === "TiZO Lip Protection") {
      return false;
    }
    if (product.requiresFarmacistReview && slot !== "treat") {
      return false;
    }
    return !PRODUCT_EXCLUSIONS.includes(product.name);
  });

  if (slot === "treat") {
    const strongCalmReactive = isStrongCalmReactive(selectedAnswers);
    const calmContext = primaryJourneys.includes("calm") || secondaryJourney === "calm";
    const purifyContext = primaryJourneys.includes("purify") || secondaryJourney === "purify";

    if (strongCalmReactive) {
      pool = pool.filter(
        (product) =>
          !["C of Change Salicylic Peel Pads", "Illumination Fruit Pro Strength Acid Peel Mask"].includes(product.name),
      );
    }

    if (calmContext) {
      pool = pool.filter((product) => {
        const calmFriendlyNames = new Set(["Green Fixer Calming Elixir", "Cactus Cloudsilk Serum", "Matcha Purity Mask"]);
        return calmFriendlyNames.has(product.name) || product.primaryJourney === "calm" || product.supportingJourney === "calm";
      });
    }

    if (purifyContext) {
      pool = pool.filter((product) => product.name !== "Watermelonaid");
    }

    pool = pool.filter((product) => {
      if (product.name === "Watermelonaid") {
        return isWatermelonaidEligible(primaryJourneys, secondaryJourney, selectedAnswers);
      }

      if (product.name === "Necks-Level Smooth") {
        return isNecksLevelEligible(primaryJourneys, secondaryJourney, selectedAnswers);
      }

      return true;
    });
  }

  if (slot === "protect") {
    pool = pool.filter((product) => product.category === "Sun Protection");

    const strongCalm = [...answerSet].some((answer) => ["sensitive", "easily-irritated", "reacts-to-products", "feel-calmer"].includes(answer));
    if (strongCalm) {
      pool = pool.filter((product) => product.name === "TiZO Ultra Zinc Non Tinted Sunscreen Face & Body SPF 40");
    } else {
      const quenchPrimary = primaryJourneys.includes("quench") || secondaryJourney === "quench";
      if (quenchPrimary) {
        pool = pool.filter((product) => product.name === "AM Replenish Non Tinted SPF 40");
      } else {
        pool = pool.filter((product) =>
          product.name === "Tizo Primer/Sunscreen Non-Tinted SPF 40" ||
          product.name === "TiZO Ultra Zinc Non Tinted Sunscreen Face & Body SPF 40",
        );
      }
    }
  }

  if (pool.length === 0) {
    return null;
  }

  const ranked = [...pool].sort((left, right) => {
    const a = scoreProduct(left, primaryJourneys, secondaryJourney, selectedAnswers);
    const b = scoreProduct(right, primaryJourneys, secondaryJourney, selectedAnswers);
    return b - a;
  });

  const winner = ranked[0];
  selectedIds.add(winner.id);
  return {
    productId: winner.id,
    productName: winner.name,
    category: winner.category,
    role: winner.role,
    guestBenefit: winner.guestBenefit,
    usageType: winner.usageType,
    internalScore: scoreProduct(winner, primaryJourneys, secondaryJourney, selectedAnswers),
    matchReasons: createMatchReasons(winner, primaryJourneys, secondaryJourney),
    farmacistReviewRecommended: Boolean(winner.requiresFarmacistReview),
  };
}

function buildMoreFreshPicks(
  eligible: Product[],
  selectedIds: Set<string>,
  primaryJourneys: JourneyId[],
  secondaryJourney: JourneyId | null,
  selectedAnswers: { primaryMotivation: string | null; skinExperience: string[]; desiredOutcomes: string[] },
): RecommendedProduct[] {
  const optionalCategories: ProductCategory[] = [
    "Tonic",
    "Mask",
    "Exfoliant",
    "Neck & Décolleté",
    "Eye Care",
    "Sun Protection",
    "Serum & Treatment",
  ];
  const chosen: RecommendedProduct[] = [];
  const seenCategories = new Set<ProductCategory>();

  const pool = [...eligible]
    .filter((product) => !selectedIds.has(product.id))
    .filter((product) => !PRODUCT_EXCLUSIONS.includes(product.name))
    .filter((product) => {
      if (product.name === "Necks-Level Smooth") {
        return isNecksLevelEligible(primaryJourneys, secondaryJourney, selectedAnswers);
      }

      if (product.name === "Watermelonaid") {
        return isWatermelonaidEligible(primaryJourneys, secondaryJourney, selectedAnswers);
      }

      return true;
    })
    .sort((left, right) => {
      const a = scoreProduct(left, primaryJourneys, secondaryJourney, selectedAnswers);
      const b = scoreProduct(right, primaryJourneys, secondaryJourney, selectedAnswers);
      return b - a;
    });

  for (const category of optionalCategories) {
    const product = pool.find((candidate) => {
      if (candidate.category !== category) {
        return false;
      }
      if (seenCategories.has(category) && category !== "Sun Protection") {
        return false;
      }
      if (candidate.name === "TiZO Lip Protection") {
        return false;
      }
      if (selectedIds.has(candidate.id)) {
        return false;
      }
      if (candidate.category === "Sun Protection" && candidate.name === "TiZO Lip Protection") {
        return false;
      }
      return true;
    });

    if (!product) {
      continue;
    }

    selectedIds.add(product.id);
    seenCategories.add(category);
    chosen.push({
      productId: product.id,
      productName: product.name,
      category: product.category,
      role: product.role,
      guestBenefit: product.guestBenefit,
      usageType: product.usageType,
      internalScore: scoreProduct(product, primaryJourneys, secondaryJourney, selectedAnswers),
      matchReasons: createMatchReasons(product, primaryJourneys, secondaryJourney),
      farmacistReviewRecommended: Boolean(product.requiresFarmacistReview),
    });

    if (chosen.length >= 4) {
      break;
    }
  }

  return chosen;
}

export function generateProductRecommendation({
  journeyResult,
  selectedAnswers,
}: {
  journeyResult: RecommendationResult;
  selectedAnswers: {
    primaryMotivation: string | null;
    skinExperience: string[];
    desiredOutcomes: string[];
  };
}): ProductRecommendationResult {
  const primaryJourneys = journeyResult.primaryJourneys ?? [];
  const secondaryJourney = journeyResult.secondaryJourney ?? null;

  if (journeyResult.resultType === "no-strong-journey") {
    return {
      featured: {
        cleanse: null,
        treat: null,
        moisturize: null,
        protect: null,
      },
      moreFreshPicks: [],
      journeyContext: {
        primaryJourneys,
        secondaryJourney,
      },
      modifiers: addModifierSignals(selectedAnswers),
      resultType: "needs-farmacist-personalization",
    };
  }

  const allEligible = productCatalog.filter(
    (product) => !PRODUCT_EXCLUSIONS.includes(product.name) && !product.excluded,
  );

  const selectedIds = new Set<string>();
  const featured = {
    cleanse: pickFeaturedProduct("cleanse", allEligible, selectedIds, primaryJourneys, secondaryJourney, selectedAnswers),
    treat: pickFeaturedProduct("treat", allEligible, selectedIds, primaryJourneys, secondaryJourney, selectedAnswers),
    moisturize: pickFeaturedProduct("moisturize", allEligible, selectedIds, primaryJourneys, secondaryJourney, selectedAnswers),
    protect: pickFeaturedProduct("protect", allEligible, selectedIds, primaryJourneys, secondaryJourney, selectedAnswers),
  };

  const moreFreshPicks = buildMoreFreshPicks(
    allEligible,
    selectedIds,
    primaryJourneys,
    secondaryJourney,
    selectedAnswers,
  );

  const modifiers = addModifierSignals(selectedAnswers);

  return {
    featured,
    moreFreshPicks,
    journeyContext: {
      primaryJourneys,
      secondaryJourney,
    },
    modifiers,
    resultType: "recommendations-ready",
  };
}

export const PRODUCT_EXCLUSIONS_SET = new Set(PRODUCT_EXCLUSIONS);
