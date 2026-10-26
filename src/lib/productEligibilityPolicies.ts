export const PRODUCT_ELIGIBILITY_POLICIES = [
  "none",
  "renew_targeted",
  "renew_quench_hydration",
] as const;

export type ProductEligibilityPolicy =
  (typeof PRODUCT_ELIGIBILITY_POLICIES)[number];

export type ProductEligibilityRules = {
  version: 1;
  policy: ProductEligibilityPolicy;
};

export function isProductEligibilityPolicy(
  value: unknown
): value is ProductEligibilityPolicy {
  return PRODUCT_ELIGIBILITY_POLICIES.some(
    (policy) => policy === value
  );
}

export function isProductEligibilityRules(
  value: unknown
): value is ProductEligibilityRules {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }

  const rules = value as Record<string, unknown>;

  return (
    Object.keys(rules).length === 2 &&
    rules.version === 1 &&
    isProductEligibilityPolicy(rules.policy)
  );
}
export type ProductEligibilityContext = {
  primaryJourneys: string[];
  secondaryJourney: string | null;
  selectedAnswers: string[];
};

export function evaluateProductEligibility(
  rules: ProductEligibilityRules,
  context: ProductEligibilityContext
): boolean {
  const primarySet = new Set(context.primaryJourneys);
  const answerSet = new Set(context.selectedAnswers);

  const hasAgingSignal = [
    "aging",
    "fine-lines-texture",
    "feel-firmer-smoother",
  ].some((answer) => answerSet.has(answer));

  switch (rules.policy) {
    case "none":
      return true;

    case "renew_targeted":
      return (
        primarySet.has("renew") ||
        (primarySet.has("illuminate") &&
          context.secondaryJourney === "renew") ||
        (context.secondaryJourney === "renew" &&
          hasAgingSignal)
      );

    case "renew_quench_hydration": {
      const excludedJourneys = [
        "calm",
        "purify",
        "illuminate",
      ];

      if (
        excludedJourneys.some(
          (journey) =>
            primarySet.has(journey) ||
            context.secondaryJourney === journey
        )
      ) {
        return false;
      }

      const supportedJourney =
        primarySet.has("renew") ||
        primarySet.has("quench") ||
        context.secondaryJourney === "renew" ||
        context.secondaryJourney === "quench";

      const hydrationAgingSignals = [
        "dry-dehydrated",
        "tight-after-cleansing",
        "dry-throughout-day",
        "feel-more-hydrated",
        "aging",
        "fine-lines-texture",
        "feel-firmer-smoother",
      ];

      const hasRelevantSignal =
        hydrationAgingSignals.some((answer) =>
          answerSet.has(answer)
        );

      return supportedJourney && hasRelevantSignal;
    }
  }
}