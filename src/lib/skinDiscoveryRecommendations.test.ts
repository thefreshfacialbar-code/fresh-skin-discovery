import assert from "node:assert/strict";
import test from "node:test";

import { buildSkinDiscoverySubmission } from "@/lib/skinDiscoverySubmission";
import { readOrCreateSkinDiscoveryRecommendations } from "@/lib/skinDiscoveryRecommendations";
import type { RecommendationResult } from "@/types/recommendation";

function normalizeForStorageRoundTrip<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }
}

const journeyRecommendation: RecommendationResult = {
  resultType: "single-primary",
  primaryJourneys: ["renew"],
  secondaryJourney: "quench",
  scores: { quench: 4, calm: 3, purify: 2, illuminate: 5, renew: 7 },
  supports: { quench: 2, calm: 2, purify: 1, illuminate: 4, renew: 5 },
  selectedAnswers: {
    primaryMotivation: "radiant",
    skinExperience: ["dull-lacks-radiance", "fine-lines-texture"],
    desiredOutcomes: ["look-brighter", "feel-firmer-smoother"],
  },
};

test("completed submission includes featured product ids when recommendations are available", () => {
  const previousWindow = globalThis.window;
  const memoryStorage = new MemoryStorage();

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { sessionStorage: memoryStorage },
  });

  try {
    const first = readOrCreateSkinDiscoveryRecommendations(journeyRecommendation);
    const second = readOrCreateSkinDiscoveryRecommendations(journeyRecommendation);

    assert.deepEqual(second.productRecommendation, normalizeForStorageRoundTrip(first.productRecommendation));
    assert.deepEqual(second.enhancementRecommendations, normalizeForStorageRoundTrip(first.enhancementRecommendations));
    assert.equal(first.productRecommendation.resultType, "recommendations-ready");
    assert.ok(first.productRecommendation.featured.cleanse?.productId);
    assert.ok(first.productRecommendation.featured.treat?.productId);
    assert.ok(first.productRecommendation.featured.moisturize?.productId);
    assert.ok(first.productRecommendation.featured.protect?.productId);

    const submission = buildSkinDiscoverySubmission({
      guest: {
        firstName: "Jamie",
        lastName: "Parker",
        email: "jamie@example.com",
        phone: "4155550101",
      },
      discovery: {
        primaryMotivation: journeyRecommendation.selectedAnswers.primaryMotivation,
        skinExperience: journeyRecommendation.selectedAnswers.skinExperience,
        desiredOutcomes: journeyRecommendation.selectedAnswers.desiredOutcomes,
      },
      journeyResult: journeyRecommendation,
      productRecommendation: first.productRecommendation,
      enhancementRecommendations: first.enhancementRecommendations,
      actions: {
        booked: null,
        membershipInterest: null,
      },
    });

    assert.ok(submission.productRecommendations.featured.cleanse);
    assert.ok(submission.productRecommendations.featured.treat);
    assert.ok(submission.productRecommendations.featured.moisturize);
    assert.ok(submission.productRecommendations.featured.protect);
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