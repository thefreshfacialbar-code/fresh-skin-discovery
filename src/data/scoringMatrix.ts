import type { JourneyId, JourneyScores } from "../types/recommendation";

export const journeyNames: Record<JourneyId, string> = {
  quench: "Quench",
  calm: "Calm",
  purify: "Purify",
  illuminate: "Illuminate",
  renew: "Renew",
};

export const primaryMotivationMatrix: Record<string, JourneyScores> = {
  "dry-dehydrated": {
    quench: 3,
    calm: 1,
    purify: 0,
    illuminate: 0,
    renew: 1,
  },
  clearer: {
    quench: 0,
    calm: 1,
    purify: 3,
    illuminate: 1,
    renew: 0,
  },
  sensitive: {
    quench: 1,
    calm: 3,
    purify: 0,
    illuminate: 0,
    renew: 0,
  },
  radiant: {
    quench: 1,
    calm: 0,
    purify: 0,
    illuminate: 3,
    renew: 1,
  },
  aging: {
    quench: 1,
    calm: 0,
    purify: 0,
    illuminate: 1,
    renew: 3,
  },
  "not-sure": {
    quench: 1,
    calm: 1,
    purify: 1,
    illuminate: 1,
    renew: 1,
  },
  healthier: {
    quench: 1,
    calm: 1,
    purify: 1,
    illuminate: 1,
    renew: 1,
  },
};

export const skinExperienceMatrix: Record<string, JourneyScores> = {
  "tight-after-cleansing": {
    quench: 3,
    calm: 1,
    purify: 0,
    illuminate: 0,
    renew: 1,
  },
  "dry-throughout-day": {
    quench: 3,
    calm: 0,
    purify: 0,
    illuminate: 0,
    renew: 1,
  },
  "oily-throughout-day": {
    quench: 1,
    calm: 0,
    purify: 3,
    illuminate: 0,
    renew: 0,
  },
  "clogged-pores-breakouts": {
    quench: 0,
    calm: 1,
    purify: 3,
    illuminate: 1,
    renew: 0,
  },
  "easily-irritated": {
    quench: 1,
    calm: 3,
    purify: 0,
    illuminate: 0,
    renew: 0,
  },
  "reacts-to-products": {
    quench: 1,
    calm: 3,
    purify: 0,
    illuminate: 0,
    renew: 0,
  },
  "dull-lacks-radiance": {
    quench: 1,
    calm: 0,
    purify: 0,
    illuminate: 3,
    renew: 1,
  },
  "fine-lines-texture": {
    quench: 1,
    calm: 0,
    purify: 0,
    illuminate: 1,
    renew: 3,
  },
  "comfortable-balanced": {
    quench: 1,
    calm: 1,
    purify: 1,
    illuminate: 1,
    renew: 1,
  },
  "not-sure": {
    quench: 0,
    calm: 0,
    purify: 0,
    illuminate: 0,
    renew: 0,
  },
};

export const desiredOutcomeMatrix: Record<string, JourneyScores> = {
  "feel-more-hydrated": {
    quench: 3,
    calm: 1,
    purify: 0,
    illuminate: 0,
    renew: 1,
  },
  "stay-clearer": {
    quench: 0,
    calm: 1,
    purify: 3,
    illuminate: 0,
    renew: 0,
  },
  "feel-calmer": {
    quench: 1,
    calm: 3,
    purify: 0,
    illuminate: 0,
    renew: 0,
  },
  "look-brighter": {
    quench: 1,
    calm: 0,
    purify: 0,
    illuminate: 3,
    renew: 1,
  },
  "feel-firmer-smoother": {
    quench: 1,
    calm: 0,
    purify: 0,
    illuminate: 1,
    renew: 3,
  },
  "stay-healthy-balanced": {
    quench: 1,
    calm: 1,
    purify: 1,
    illuminate: 1,
    renew: 1,
  },
};

export const allKnownAnswerIds = new Set<string>([
  ...Object.keys(primaryMotivationMatrix),
  ...Object.keys(skinExperienceMatrix),
  ...Object.keys(desiredOutcomeMatrix),
]);
