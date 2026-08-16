import type { Enhancement } from "@/types/enhancementRecommendation";

export const enhancementCatalog: Enhancement[] = [
  {
    id: "dermaplaning",
    name: "Dermaplaning",
    category: "results-driven",
    journeyAffinity: {
      quench: 8,
      illuminate: 9,
      renew: 10,
    },
    benefitTags: ["smoother", "brighter", "texture", "radiance", "hydration"],
    skinSignals: ["dryness", "dehydration", "dullness", "texture", "aging", "smoothness", "radiance"],
    guestBenefit:
      "Helps create a smoother, brighter-looking surface while allowing your custom facial to build beautifully from there.",
  },
  {
    id: "led-light-therapy",
    name: "LED Light Therapy",
    category: "results-driven",
    journeyAffinity: {
      quench: 5,
      calm: 6,
      purify: 5,
      illuminate: 7,
      renew: 6,
    },
    benefitTags: ["support", "calm", "clarity", "radiance", "renewal"],
    skinSignals: ["calm", "clarity", "radiance", "renewal", "support"],
    universalEligible: true,
    guestBenefit:
      "A versatile Enhancement your Skintender can use to support the goals revealed in your Skin Discovery.",
  },
  {
    id: "microcurrent",
    name: "Microcurrent",
    category: "results-driven",
    journeyAffinity: {
      renew: 12,
      illuminate: 8,
      quench: 6,
    },
    benefitTags: ["firmness", "lifting", "freshness", "renewal", "smoothness"],
    skinSignals: ["aging", "firmness", "fine lines", "smoothness", "dullness", "dehydration"],
    guestBenefit:
      "Supports a more lifted, refreshed-looking appearance and pairs especially well with renewal-focused Journeys.",
  },
  {
    id: "farmhouse-fresh-peel",
    name: "FarmHouse Fresh Peel",
    category: "results-driven",
    journeyAffinity: {
      illuminate: 9,
      renew: 8,
      quench: 6,
    },
    benefitTags: ["brightness", "texture", "tone", "smoothness", "renewal"],
    skinSignals: ["aging", "dullness", "texture", "brightness", "tone", "smoothness"],
    calmSensitiveCaution: true,
    requiresSkintenderReview: true,
    guestBenefit:
      "A targeted resurfacing option your Skintender may use to support smoother, brighter-looking skin.",
  },
  {
    id: "cooling-eye-treatment",
    name: "Cooling Eye Treatment",
    category: "comfort-experience",
    journeyAffinity: {
      quench: 5,
      calm: 7,
      illuminate: 6,
      renew: 6,
    },
    benefitTags: ["comfort", "calm", "brightness", "aging", "refresh"],
    skinSignals: ["eye concerns", "tired-looking skin", "brightness", "aging", "comfort", "calm"],
    universalEligible: true,
    guestBenefit:
      "A refreshing finishing touch designed to give the delicate eye area a little extra attention.",
  },
  {
    id: "warm-hand-treatment",
    name: "Warm Hand Treatment",
    category: "comfort-experience",
    journeyAffinity: {
      quench: 10,
    },
    benefitTags: ["dryness", "dehydration", "comfort", "hydration"],
    skinSignals: ["dryness", "dehydration", "comfort", "hydration"],
    seasonal: true,
    guestBenefit:
      "A cozy hydration-focused Enhancement for dry skin and an extra layer of comfort during your visit.",
  },
  {
    id: "warm-foot-treatment",
    name: "Warm Foot Treatment",
    category: "comfort-experience",
    journeyAffinity: {
      quench: 10,
    },
    benefitTags: ["dryness", "dehydration", "comfort", "hydration"],
    skinSignals: ["dryness", "dehydration", "comfort", "hydration"],
    seasonal: true,
    guestBenefit:
      "A warm, comforting Enhancement that adds hydration and a little extra care to your facial experience.",
  },
  {
    id: "decollate-treatment",
    name: "Décolleté Treatment",
    category: "results-driven",
    journeyAffinity: {
      renew: 10,
      quench: 8,
      illuminate: 7,
    },
    benefitTags: ["aging", "hydration", "dullness", "texture", "firmness", "radiance"],
    skinSignals: ["aging", "dryness", "dullness", "texture", "firmness", "hydration"],
    guestBenefit:
      "Extends thoughtful care beyond the face to support smoother, hydrated, more radiant-looking skin through the décolleté.",
  },
];

export const enhancementById = new Map(enhancementCatalog.map((enhancement) => [enhancement.id, enhancement]));
