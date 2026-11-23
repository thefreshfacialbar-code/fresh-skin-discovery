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
const cgcCalmProducts: Product[] = ([
  {
    id: "cgc-calm-cleanser",
    name: "CGC Calm Cleanser",
    category: "Cleanser",
    primaryJourney: "calm",
    supportingJourney: "quench",
    role: "Gentle cleansing",
    guestBenefit: "Cleanses without stripping sensitive skin.",
    intensity: 1,
  },
  {
    id: "cgc-calm-treatment",
    name: "CGC Calm Treatment",
    category: "Serum & Treatment",
    primaryJourney: "calm",
    supportingJourney: "quench",
    role: "Calming treatment",
    guestBenefit: "Supports comfortable, balanced skin.",
    intensity: 1,
  },
  {
    id: "cgc-calm-moisturizer",
    name: "CGC Calm Moisturizer",
    category: "Moisturizer",
    primaryJourney: "calm",
    supportingJourney: "quench",
    role: "Barrier support",
    guestBenefit: "Helps maintain skin hydration.",
    intensity: 1,
  },
  {
    id: "cgc-calm-protection",
    name: "CGC Calm SPF",
    category: "Sun Protection",
    primaryJourney: "calm",
    supportingJourney: "quench",
    role: "Daily sun protection",
    guestBenefit: "Helps protect sensitive skin from UV exposure.",
    intensity: 1,
  },
] satisfies Product[]).map((product) => ({
  ...product,
  featuredEligible: true,
  recommendationEnabled: true,
  excluded: false,
  calmSensitiveCaution: false,
  experienceRecommendations: [
    {
      experienceId: "gentlemens-corner",
      assigned: true,
      enabled: true,
      approvalStatus: "approved" as const,
      recommendationPriority: 100 as const,
    },
  ],
}));
const cgcAggressiveTreatment: Product = {
  ...cgcCalmProducts[1],
  id: "cgc-aggressive-treatment",
  name: "CGC Aggressive Treatment",
  intensity: 4,
  calmSensitiveCaution: true,
  experienceRecommendations: [
    {
      experienceId: "gentlemens-corner",
      assigned: true,
      enabled: true,
      approvalStatus: "approved",
      recommendationPriority: 120,
    },
  ],
};
test("CGC Calm produces a complete reactive-safe Featured routine", () => {
  const previousWindow = globalThis.window;
  const memoryStorage = new MemoryStorage();

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { sessionStorage: memoryStorage },
  });

  try {
    memoryStorage.setItem(
      "skinDiscoveryExperience",
      "gentlemens-corner",
    );

    const calmJourney: RecommendationResult = {
      ...journeyRecommendation,
      primaryJourneys: ["calm"],
      secondaryJourney: null,
      scores: {
        quench: 0,
        calm: 10,
        purify: 0,
        illuminate: 0,
        renew: 0,
      },
      supports: {
        quench: 0,
        calm: 3,
        purify: 0,
        illuminate: 0,
        renew: 0,
      },
      selectedAnswers: {
        primaryMotivation: "sensitive",
        skinExperience: [
          "easily-irritated",
          "reacts-to-products",
        ],
        desiredOutcomes: ["feel-calmer"],
      },
    };

    const result = readOrCreateSkinDiscoveryRecommendations(
      calmJourney,
        [...cgcCalmProducts, ...approvedFreshProducts],
    );

    assert.equal(
      result.productRecommendation.resultType,
      "recommendations-ready",
    );

    assert.deepEqual(
      [
        result.productRecommendation.featured.cleanse?.productId,
        result.productRecommendation.featured.treat?.productId,
        result.productRecommendation.featured.moisturize?.productId,
        result.productRecommendation.featured.protect?.productId,
      ],
      [
        "cgc-calm-cleanser",
        "cgc-calm-treatment",
        "cgc-calm-moisturizer",
        "cgc-calm-protection",
      ],
    );
    const freshOnlyProductIds = new Set(
  approvedFreshProducts.map((product) => product.id),
);

assert.equal(
  result.productRecommendation.moreFreshPicks.some(
    (product) => freshOnlyProductIds.has(product.productId),
  ),
  false,
  "Fresh-only products must not appear in CGC More Fresh Picks",
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
test("CGC reactive Calm excludes aggressive Featured treatment", () => {
  const previousWindow = globalThis.window;
  const memoryStorage = new MemoryStorage();

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { sessionStorage: memoryStorage },
  });

  try {
    memoryStorage.setItem(
      "skinDiscoveryExperience",
      "gentlemens-corner",
    );

    const calmJourney: RecommendationResult = {
      ...journeyRecommendation,
      primaryJourneys: ["calm"],
      secondaryJourney: null,
      selectedAnswers: {
        primaryMotivation: "sensitive",
        skinExperience: [
          "easily-irritated",
          "reacts-to-products",
        ],
        desiredOutcomes: ["feel-calmer"],
      },
    };

    const result = readOrCreateSkinDiscoveryRecommendations(
      calmJourney,
      [...cgcCalmProducts, cgcAggressiveTreatment],
    );

    assert.equal(
      result.productRecommendation.featured.treat?.productId,
      "cgc-calm-treatment",
    );

    assert.notEqual(
      result.productRecommendation.featured.treat?.productId,
      "cgc-aggressive-treatment",
    );
    assert.ok(result.productRecommendation.featured.treat?.productId);
    assert.equal(
  result.productRecommendation.moreFreshPicks.some(
    (product) =>
      product.productId === "cgc-aggressive-treatment",
  ),
  false,
  "Aggressive treatment must not appear in More Fresh Picks for reactive Calm skin",
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
test("CGC Purify + Calm excludes aggressive products", () => {
  const previousWindow = globalThis.window;
  const memoryStorage = new MemoryStorage();

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { sessionStorage: memoryStorage },
  });

  try {
    memoryStorage.setItem(
      "skinDiscoveryExperience",
      "gentlemens-corner",
    );

    const purifyCalmJourney: RecommendationResult = {
      ...journeyRecommendation,
      primaryJourneys: ["purify"],
      secondaryJourney: "calm",
      scores: {
        quench: 2,
        calm: 10,
        purify: 11,
        illuminate: 0,
        renew: 0,
      },
      supports: {
        quench: 1,
        calm: 3,
        purify: 4,
        illuminate: 0,
        renew: 0,
      },
      selectedAnswers: {
        primaryMotivation: "clearer",
        skinExperience: [
          "oily-throughout-day",
          "easily-irritated",
        ],
        desiredOutcomes: [
          "stay-clearer",
          "feel-calmer",
        ],
      },
    };

    const result = readOrCreateSkinDiscoveryRecommendations(
      purifyCalmJourney,
      [...cgcCalmProducts, cgcAggressiveTreatment],
    );

    assert.equal(
      result.productRecommendation.resultType,
      "recommendations-ready",
    );

    assert.equal(
      result.productRecommendation.featured.treat?.productId,
      "cgc-calm-treatment",
    );

    assert.equal(
      result.productRecommendation.moreFreshPicks.some(
        (product) =>
          product.productId === "cgc-aggressive-treatment",
      ),
      false,
      "Aggressive treatment must not appear in More Fresh Picks",
    );

    assert.ok(
      result.productRecommendation.featured.protect,
      "Purify + Calm must retain eligible sun protection",
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
test("CGC No Strong Journey does not generate an automatic routine", () => {
  const previousWindow = globalThis.window;
  const memoryStorage = new MemoryStorage();

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { sessionStorage: memoryStorage },
  });

  try {
    memoryStorage.setItem(
      "skinDiscoveryExperience",
      "gentlemens-corner",
    );

    const noStrongJourney: RecommendationResult = {
      ...journeyRecommendation,
      resultType: "no-strong-journey",
      primaryJourneys: [],
      secondaryJourney: null,
      scores: {
        quench: 2,
        calm: 2,
        purify: 2,
        illuminate: 2,
        renew: 2,
      },
      supports: {
        quench: 1,
        calm: 1,
        purify: 1,
        illuminate: 1,
        renew: 1,
      },
      selectedAnswers: {
        primaryMotivation: "not-sure",
        skinExperience: ["not-sure"],
        desiredOutcomes: ["stay-healthy-balanced"],
      },
    };

    const result = readOrCreateSkinDiscoveryRecommendations(
      noStrongJourney,
      cgcCalmProducts,
    );

    assert.equal(
      result.productRecommendation.resultType,
      "needs-farmacist-personalization",
    );

    assert.deepEqual(
      Object.values(result.productRecommendation.featured),
      [null, null, null, null],
      "No Strong Journey must not generate Featured products",
    );

    assert.deepEqual(
      result.productRecommendation.moreFreshPicks,
      [],
      "No Strong Journey must not generate More Fresh Picks",
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

test("CGC Quench allows a relevant hydration Featured Treatment", () => {
  const previousWindow = globalThis.window;
  const memoryStorage = new MemoryStorage();

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { sessionStorage: memoryStorage },
  });

  try {
    memoryStorage.setItem(
      "skinDiscoveryExperience",
      "gentlemens-corner",
    );

    const quenchJourney: RecommendationResult = {
      ...journeyRecommendation,
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
        skinExperience: [
          "tight-after-cleansing",
          "dry-throughout-day",
        ],
        desiredOutcomes: ["feel-more-hydrated"],
      },
    };

    const hydrationTreatment: Product = {
      ...cgcCalmProducts[1],
      id: "cgc-quench-hydration-treatment",
      name: "CGC Quench Hydration Treatment",
      primaryJourney: "quench",
      supportingJourney: "calm",
      role: "Hydrate",
      guestBenefit: "Helps replenish dehydrated skin.",
    };

    const result = readOrCreateSkinDiscoveryRecommendations(
      quenchJourney,
      [...cgcCalmProducts, hydrationTreatment],
    );

    assert.equal(
      result.productRecommendation.featured.treat?.productId,
      "cgc-quench-hydration-treatment",
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

test("CGC Quench does not force an unrelated Featured Treatment", () => {
  const previousWindow = globalThis.window;
  const memoryStorage = new MemoryStorage();

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { sessionStorage: memoryStorage },
  });

  try {
    memoryStorage.setItem(
      "skinDiscoveryExperience",
      "gentlemens-corner",
    );

    const quenchJourney: RecommendationResult = {
      ...journeyRecommendation,
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
        skinExperience: [
          "tight-after-cleansing",
          "dry-throughout-day",
        ],
        desiredOutcomes: ["feel-more-hydrated"],
      },
    };

    const result = readOrCreateSkinDiscoveryRecommendations(
      quenchJourney,
      cgcCalmProducts,
    );

    assert.equal(
  result.productRecommendation.featured.treat,
  null,
  "Hydration-only CGC consultations must not receive an unrelated Calm treatment",
);

    assert.equal(
      result.productRecommendation.resultType,
      "recommendations-ready",
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
    assert.deepEqual(
  Object.values(cgc.productRecommendation.featured),
  [null, null, null, null],
  "Fresh-only products must not appear in any CGC Featured slot",
);

assert.deepEqual(
  cgc.productRecommendation.moreFreshPicks,
  [],
  "Fresh-only products must not appear in CGC More Fresh Picks",
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