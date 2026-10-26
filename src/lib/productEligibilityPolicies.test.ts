import { describe, expect, test } from "vitest";
import {
  evaluateProductEligibility,
  isProductEligibilityPolicy,
  isProductEligibilityRules,
} from "@/lib/productEligibilityPolicies";

describe("Product eligibility policy validation", () => {
  test("accepts all supported policies", () => {
    for (const policy of [
      "none",
      "renew_targeted",
      "renew_quench_hydration",
    ]) {
      expect(isProductEligibilityPolicy(policy)).toBe(true);
      expect(
        isProductEligibilityRules({
          version: 1,
          policy,
        })
      ).toBe(true);
    }
  });

  test("rejects unsupported policies", () => {
    expect(isProductEligibilityPolicy("unknown")).toBe(false);

    expect(
      isProductEligibilityRules({
        version: 1,
        policy: "unknown",
      })
    ).toBe(false);
  });

  test("rejects invalid versions", () => {
    expect(
      isProductEligibilityRules({
        version: 2,
        policy: "renew_targeted",
      })
    ).toBe(false);
  });

  test("rejects missing or additional fields", () => {
    expect(isProductEligibilityRules({})).toBe(false);

    expect(
      isProductEligibilityRules({
        version: 1,
        policy: "none",
        unexpected: true,
      })
    ).toBe(false);
  });

  test("rejects invalid data types", () => {
    expect(isProductEligibilityRules(null)).toBe(false);
    expect(isProductEligibilityRules([])).toBe(false);
    expect(isProductEligibilityRules("renew_targeted")).toBe(false);
  });
});
describe("Product eligibility evaluation", () => {
  const renewTargeted = {
    version: 1 as const,
    policy: "renew_targeted" as const,
  };

  const hydration = {
    version: 1 as const,
    policy: "renew_quench_hydration" as const,
  };

  test("none allows standard eligibility", () => {
    expect(
      evaluateProductEligibility(
        { version: 1, policy: "none" },
        {
          primaryJourneys: ["calm"],
          secondaryJourney: null,
          selectedAnswers: [],
        }
      )
    ).toBe(true);
  });

  test("renew targeted accepts primary Renew", () => {
    expect(
      evaluateProductEligibility(renewTargeted, {
        primaryJourneys: ["renew"],
        secondaryJourney: null,
        selectedAnswers: [],
      })
    ).toBe(true);
  });

  test("renew targeted accepts Illuminate with secondary Renew", () => {
    expect(
      evaluateProductEligibility(renewTargeted, {
        primaryJourneys: ["illuminate"],
        secondaryJourney: "renew",
        selectedAnswers: [],
      })
    ).toBe(true);
  });

  test("renew targeted requires aging signal for secondary Renew", () => {
    const context = {
      primaryJourneys: ["quench"],
      secondaryJourney: "renew",
      selectedAnswers: ["aging"],
    };

    expect(
      evaluateProductEligibility(renewTargeted, context)
    ).toBe(true);

    expect(
      evaluateProductEligibility(renewTargeted, {
        ...context,
        selectedAnswers: [],
      })
    ).toBe(false);
  });

  test("renew targeted rejects unrelated journeys", () => {
    expect(
      evaluateProductEligibility(renewTargeted, {
        primaryJourneys: ["calm"],
        secondaryJourney: null,
        selectedAnswers: ["aging"],
      })
    ).toBe(false);
  });

  test("hydration policy accepts Renew with hydration signal", () => {
    expect(
      evaluateProductEligibility(hydration, {
        primaryJourneys: ["renew"],
        secondaryJourney: null,
        selectedAnswers: ["dry-dehydrated"],
      })
    ).toBe(true);
  });

  test("hydration policy accepts Quench with aging signal", () => {
    expect(
      evaluateProductEligibility(hydration, {
        primaryJourneys: ["quench"],
        secondaryJourney: null,
        selectedAnswers: ["fine-lines-texture"],
      })
    ).toBe(true);
  });

  test("hydration policy rejects excluded journeys", () => {
    for (const journey of ["calm", "purify", "illuminate"]) {
      expect(
        evaluateProductEligibility(hydration, {
          primaryJourneys: ["renew", journey],
          secondaryJourney: null,
          selectedAnswers: ["dry-dehydrated"],
        })
      ).toBe(false);
    }
  });

  test("hydration policy requires a qualifying signal", () => {
    expect(
      evaluateProductEligibility(hydration, {
        primaryJourneys: ["renew"],
        secondaryJourney: null,
        selectedAnswers: [],
      })
    ).toBe(false);
  });

  test("hydration policy rejects unrelated journeys", () => {
    expect(
      evaluateProductEligibility(hydration, {
        primaryJourneys: ["calm"],
        secondaryJourney: null,
        selectedAnswers: ["dry-dehydrated"],
      })
    ).toBe(false);
  });
});