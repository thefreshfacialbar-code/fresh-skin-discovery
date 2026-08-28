import { cgcProductCatalog } from "@/data/cgcProductCatalog";
import type {
  Product,
  ProductRecommendationResult,
  RecommendedProduct,
} from "@/types/productRecommendation";
import type { RecommendationResult } from "@/types/recommendation";

const REACTIVE_ANSWERS = new Set([
  "sensitive",
  "easily-irritated",
  "reacts-to-products",
]);

const HYDRATION_ANSWERS = new Set([
  "dry-dehydrated",
  "tight-after-cleansing",
  "dry-throughout-day",
  "feel-more-hydrated",
]);

const BRIGHTNESS_ANSWERS = new Set([
  "radiant",
  "dull-lacks-radiance",
  "look-brighter",
]);

const RENEWAL_ANSWERS = new Set([
  "aging",
  "fine-lines-texture",
  "feel-firmer-smoother",
]);

const CONGESTION_ANSWERS = new Set([
  "clearer",
  "oily-throughout-day",
  "clogged-pores-breakouts",
  "stay-clearer",
]);

function getAnswerTextSet(selectedAnswers: {
  primaryMotivation: string | null;
  skinExperience: string[];
  desiredOutcomes: string[];
}) {
  return new Set(
    [selectedAnswers.primaryMotivation, ...selectedAnswers.skinExperience, ...selectedAnswers.desiredOutcomes].filter(
      (value): value is string => typeof value === "string" && Boolean(value),
    ),
  );
}

function hasAnyAnswer(answerSet: Set<string>, values: Iterable<string>): boolean {
  for (const value of values) {
    if (answerSet.has(value)) {
      return true;
    }
  }
  return false;
}

function createRecommendedProduct(product: Product, reasons: string[]): RecommendedProduct {
  return {
    productId: product.id,
    productName: product.name,
    category: product.category,
    role: product.role,
    guestBenefit: product.guestBenefit,
    usageType: product.usageType,
    internalScore: product.intensity,
    matchReasons: reasons,
    farmacistReviewRecommended: Boolean(product.requiresFarmacistReview),
  };
}

function chooseMoisturizer(
  selectedAnswers: { primaryMotivation: string | null; skinExperience: string[]; desiredOutcomes: string[] },
  primaryJourneys: string[],
  secondaryJourney: string | null,
): string {
  const answerSet = getAnswerTextSet(selectedAnswers);
  const strongReactive = hasAnyAnswer(answerSet, REACTIVE_ANSWERS);
  const calmGoalOnly = selectedAnswers.desiredOutcomes.includes("feel-calmer") && !strongReactive;
  const isPurify = primaryJourneys.includes("purify") || (secondaryJourney === "purify");
  const isRenew = primaryJourneys.includes("renew") || (secondaryJourney === "renew");
  const isQuench = primaryJourneys.includes("quench") || (secondaryJourney === "quench");
  const hydrationStrong = primaryJourneys.includes("quench") || hasAnyAnswer(answerSet, HYDRATION_ANSWERS);
  const oilyCongestion = hasAnyAnswer(answerSet, CONGESTION_ANSWERS) || hasAnyAnswer(answerSet, new Set(["stay-clearer", "clearer"]));

  if (strongReactive || calmGoalOnly) {
    return "Cactus Comfort Barrier Cream";
  }

  if (isPurify && oilyCongestion) {
    return "Kale Water Weightless Moisturizer";
  }

  if (hydrationStrong && !isRenew) {
    return "Thirsty Face";
  }

  if (isRenew && !hydrationStrong) {
    return "Second Wind";
  }

  if (isQuench && !isRenew) {
    return "Thirsty Face";
  }

  if (hydrationStrong && isRenew) {
    return "Thirsty Face";
  }

  return "Second Wind";
}

function chooseProtect(
  selectedAnswers: { primaryMotivation: string | null; skinExperience: string[]; desiredOutcomes: string[] },
): string {
  const answerSet = getAnswerTextSet(selectedAnswers);
  const strongReactive = hasAnyAnswer(answerSet, REACTIVE_ANSWERS);
  const calmGoalOnly = selectedAnswers.desiredOutcomes.includes("feel-calmer") && !strongReactive;

  if (strongReactive || calmGoalOnly) {
    return "TiZO Ultra Zinc Non-Tinted SPF 40";
  }

  return "AM Replenish Non-Tinted SPF 40";
}

function chooseTreat(
  selectedAnswers: { primaryMotivation: string | null; skinExperience: string[]; desiredOutcomes: string[] },
  primaryJourneys: string[],
  secondaryJourney: string | null,
): string | null {
  const answerSet = getAnswerTextSet(selectedAnswers);
  const strongReactive = hasAnyAnswer(answerSet, REACTIVE_ANSWERS);
  const brightIntent = hasAnyAnswer(answerSet, BRIGHTNESS_ANSWERS) || primaryJourneys.includes("illuminate") || secondaryJourney === "illuminate";
  const congestionIntent = hasAnyAnswer(answerSet, CONGESTION_ANSWERS) || primaryJourneys.includes("purify") || secondaryJourney === "purify";
  const calmIntent = primaryJourneys.includes("calm") || selectedAnswers.desiredOutcomes.includes("feel-calmer");

  if (strongReactive && calmIntent) {
    return "Green Fixer Calming Elixir";
  }

  if (brightIntent && !strongReactive) {
    return "Zero In";
  }

  if (congestionIntent && !strongReactive) {
    return "Deep Clean";
  }

  return null;
}

function addOptionalSupport(
  list: RecommendedProduct[],
  productName: string,
  reasons: string[],
) {
  const product = cgcProductCatalog.find((candidate) => candidate.name === productName);
  if (!product || list.some((item) => item.productName === product.name)) {
    return;
  }

  list.push(createRecommendedProduct(product, reasons));
}

export function generateCgcProductRecommendation({
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
  const answerSet = getAnswerTextSet(selectedAnswers);
  const strongReactive = hasAnyAnswer(answerSet, REACTIVE_ANSWERS);

  if (journeyResult.resultType === "no-strong-journey" || primaryJourneys.length === 0) {
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
      modifiers: ["Calm and hydration-first"],
      resultType: "needs-farmacist-personalization",
    };
  }

  const cleanse = cgcProductCatalog.find((product) => product.name === "Clean Slate");
  const moisturizeName = chooseMoisturizer(selectedAnswers, primaryJourneys, secondaryJourney);
  const protectName = chooseProtect(selectedAnswers);
  const treatName = chooseTreat(selectedAnswers, primaryJourneys, secondaryJourney);

  const featured = {
    cleanse: cleanse ? createRecommendedProduct(cleanse, ["A Curated Gentlemen's Corner cleanser that keeps the routine gentle and balanced."]) : null,
    treat: treatName ? cgcProductCatalog.find((product) => product.name === treatName) ? createRecommendedProduct(cgcProductCatalog.find((product) => product.name === treatName)!, ["Targets the primary active concern without overcomplicating the routine."]) : null : null,
    moisturize: cgcProductCatalog.find((product) => product.name === moisturizeName)
      ? createRecommendedProduct(cgcProductCatalog.find((product) => product.name === moisturizeName)!, ["Keeps the routine hydration-first while matching the current skin profile."])
      : null,
    protect: cgcProductCatalog.find((product) => product.name === protectName)
      ? createRecommendedProduct(cgcProductCatalog.find((product) => product.name === protectName)!, ["Protects skin while keeping the routine aligned with the current sensitivity profile."])
      : null,
  };

  const moreFreshPicks: RecommendedProduct[] = [];

  const hydrationSignalCount = [
    ...answerSet,
  ].filter((value) => HYDRATION_ANSWERS.has(value)).length;

  if (hydrationSignalCount >= 2 || (selectedAnswers.primaryMotivation === "dry-dehydrated" && hasAnyAnswer(answerSet, new Set(["tight-after-cleansing", "dry-throughout-day"])))) {
    addOptionalSupport(moreFreshPicks, "Hyaluronic Booster", ["Adds a focused hydration boost when dehydration is meaningfully present."]);
  }

  if ((primaryJourneys.includes("renew") || hasAnyAnswer(answerSet, RENEWAL_ANSWERS)) && !strongReactive && moreFreshPicks.length < 2) {
    addOptionalSupport(moreFreshPicks, "Bakuchiol Booster", ["Supports renewal without making the routine unnecessarily heavy."]);
  }

  if ((selectedAnswers.desiredOutcomes.includes("feel-calmer") || strongReactive) && !strongReactive) {
    addOptionalSupport(moreFreshPicks, "Green Fixer Calming Elixir", ["Gives calmer, more balanced skin a little extra support."]);
  }

  if (strongReactive && treatName !== "Green Fixer Calming Elixir" && !moreFreshPicks.some((item) => item.productName === "Green Fixer Calming Elixir")) {
    addOptionalSupport(moreFreshPicks, "Green Fixer Calming Elixir", ["This supports the reactive pathway with a gentler, more soothing add-on."]);
  }

  if (hasAnyAnswer(answerSet, CONGESTION_ANSWERS) && !strongReactive && !moreFreshPicks.some((item) => item.productName === "Deep Clean")) {
    addOptionalSupport(moreFreshPicks, "Deep Clean", ["Useful when congestion is present and the skin is not reacting strongly."]);
  }

  if (hasAnyAnswer(answerSet, new Set(["oily-throughout-day", "clogged-pores-breakouts", "stay-clearer"])) && !strongReactive && !moreFreshPicks.some((item) => item.productName === "C of Change Salicylic Peel Pads")) {
    addOptionalSupport(moreFreshPicks, "C of Change Salicylic Peel Pads", ["A targeted clarifying support when congestion is more pronounced and the skin is stable."]);
  }

  if (!strongReactive && (primaryJourneys.includes("illuminate") || hasAnyAnswer(answerSet, BRIGHTNESS_ANSWERS)) && !treatName) {
    addOptionalSupport(moreFreshPicks, "Zero In", ["Useful when brightening is a real priority and no stronger treatment is needed."]);
  }

  if (moreFreshPicks.length > 2) {
    return {
      ...{
        featured,
        moreFreshPicks: moreFreshPicks.slice(0, 2),
        journeyContext: { primaryJourneys, secondaryJourney },
        modifiers: ["Hydration-first", "Strong reactive guard"],
        resultType: "recommendations-ready" as const,
      },
    };
  }

  return {
    featured,
    moreFreshPicks: moreFreshPicks.slice(0, 2),
    journeyContext: {
      primaryJourneys,
      secondaryJourney,
    },
    modifiers: [
      strongReactive ? "Reactive skin pathway" : "Hydration-first routine",
      hasAnyAnswer(answerSet, BRIGHTNESS_ANSWERS) ? "Radiance support" : "Barrier support",
    ],
    resultType: "recommendations-ready",
  };
}
