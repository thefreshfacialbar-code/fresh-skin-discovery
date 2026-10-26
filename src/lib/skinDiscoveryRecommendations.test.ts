import assert from "node:assert/strict";
import test from "node:test";

import { buildSkinDiscoverySubmission } from "@/lib/skinDiscoverySubmission";
import { readOrCreateSkinDiscoveryRecommendations } from "@/lib/skinDiscoveryRecommendations";
import type { RecommendationResult } from "@/types/recommendation";
import { productCatalog } from "@/data/productCatalog";
import type { Product } from "@/types/productRecommendation";

const approvedFreshProducts: Product[] = productCatalog.map((product) => ({
  ...product,
  experienceRecommendations: [
    {
      experienceId: "fresh-facial-bar-lash-lounge",
      assigned: true,
      approvalStatus: "approved",
      recommendationPriority: 100,
    },
  ],
}));
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
   const first = readOrCreateSkinDiscoveryRecommendations(
  journeyRecommendation,
  approvedFreshProducts,
);

const second = readOrCreateSkinDiscoveryRecommendations(
  journeyRecommendation,
  approvedFreshProducts,
);

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
test("revoking product approval invalidates cached recommendations", () => {
  const previousWindow = globalThis.window;
  const memoryStorage = new MemoryStorage();

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { sessionStorage: memoryStorage },
  });

  try {
    memoryStorage.setItem(
      "skinDiscoveryExperience",
      "fresh-facial-bar-lash-lounge",
    );

    const first = readOrCreateSkinDiscoveryRecommendations(
      journeyRecommendation,
      approvedFreshProducts,
    );

    const cleanserId = first.productRecommendation.featured.cleanse?.productId;
    assert.ok(cleanserId);

    const updatedProducts = approvedFreshProducts.map((product) =>
      product.id === cleanserId
        ? {
            ...product,
            experienceRecommendations: [
              {
                experienceId: "fresh-facial-bar-lash-lounge",
                assigned: true,
                approvalStatus: "rejected" as const,
                recommendationPriority: 100 as const,
              },
            ],
          }
        : product,
    );

    const second = readOrCreateSkinDiscoveryRecommendations(
      journeyRecommendation,
      updatedProducts,
    );

    assert.notEqual(
      second.productRecommendation.featured.cleanse?.productId,
      cleanserId,
      "A rejected product must not remain recommended from the cache",
    );
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
test("switching experiences invalidates cached recommendations", () => {
  const previousWindow = globalThis.window;
  const memoryStorage = new MemoryStorage();

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { sessionStorage: memoryStorage },
  });

  try {
    memoryStorage.setItem(
      "skinDiscoveryExperience",
      "fresh-facial-bar-lash-lounge",
    );

    const fresh = readOrCreateSkinDiscoveryRecommendations(
      journeyRecommendation,
      approvedFreshProducts,
    );

    assert.ok(fresh.productRecommendation.featured.cleanse?.productId);

    memoryStorage.setItem(
      "skinDiscoveryExperience",
      "gentlemens-corner",
    );

    const cgc = readOrCreateSkinDiscoveryRecommendations(
      journeyRecommendation,
      approvedFreshProducts,
    );

    assert.equal(
      cgc.productRecommendation.featured.cleanse,
      null,
      "Fresh-only products must not be recommended for Gentlemen's Corner",
    );
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
test("changing customer answers invalidates cached recommendations", () => {
  const previousWindow = globalThis.window;
  const memoryStorage = new MemoryStorage();

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { sessionStorage: memoryStorage },
  });

  try {
    memoryStorage.setItem(
      "skinDiscoveryExperience",
      "fresh-facial-bar-lash-lounge",
    );

    readOrCreateSkinDiscoveryRecommendations(
      journeyRecommendation,
      approvedFreshProducts,
    );

    const firstCache = memoryStorage.getItem(
      "skinDiscoveryProductRecommendations",
    );

    assert.ok(firstCache);

    const updatedJourney: RecommendationResult = {
      ...journeyRecommendation,
      selectedAnswers: {
        ...journeyRecommendation.selectedAnswers,
        primaryMotivation: "clear",
      },
    };

    readOrCreateSkinDiscoveryRecommendations(
      updatedJourney,
      approvedFreshProducts,
    );

    const secondCache = memoryStorage.getItem(
      "skinDiscoveryProductRecommendations",
    );

    assert.ok(secondCache);

    const firstFingerprint = JSON.parse(firstCache).fingerprint;
    const secondFingerprint = JSON.parse(secondCache).fingerprint;

    assert.notEqual(
      secondFingerprint,
      firstFingerprint,
      "Changing customer answers must invalidate the cached recommendation",
    );
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