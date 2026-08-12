export const primaryMotivationLabels: Record<string, string> = {
  "dry-dehydrated": "My skin feels dry or dehydrated.",
  sensitive: "My skin feels sensitive or easily irritated.",
  radiant: "I'd love brighter, more radiant skin.",
  clearer: "I want clearer, healthier-looking skin.",
  aging: "I'm noticing signs of aging.",
  healthier: "I simply want healthier skin.",
  "not-sure": "I'm not sure—I just know I'd like healthier skin.",
};

export const skinExperienceLabels: Record<string, string> = {
  "tight-after-cleansing": "My skin feels tight after cleansing.",
  "dry-throughout-day": "My skin often feels dry throughout the day.",
  "oily-throughout-day": "My skin becomes oily as the day goes on.",
  "clogged-pores-breakouts": "I notice clogged pores or frequent breakouts.",
  "easily-irritated": "My skin is easily irritated.",
  "reacts-to-products": "My skin reacts to new products.",
  "dull-lacks-radiance": "My skin looks dull or lacks radiance.",
  "fine-lines-texture": "Fine lines or texture are becoming more noticeable.",
  "comfortable-balanced": "My skin generally feels comfortable and balanced.",
  "not-sure": "I'm not sure.",
};

export const desiredOutcomesLabels: Record<string, string> = {
  "feel-more-hydrated": "Feel more hydrated.",
  "stay-clearer": "Stay clearer between visits.",
  "feel-calmer": "Feel calmer and less reactive.",
  "look-brighter": "Look brighter and more radiant.",
  "feel-firmer-smoother": "Feel firmer and smoother.",
  "stay-healthy-balanced": "Stay healthy and balanced.",
};

function readSessionArray(storageKey: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const rawValue = window.sessionStorage.getItem(storageKey);

  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export function readJourneySummary() {
  if (typeof window === "undefined") {
    return null;
  }

  const primaryMotivation = window.sessionStorage.getItem("skinDiscoveryPrimaryMotivation");
  const skinExperience = readSessionArray("skinDiscoverySkinExperience");
  const desiredOutcomes = readSessionArray("skinDiscoveryDesiredOutcomes");

  if (!primaryMotivation || skinExperience.length === 0 || desiredOutcomes.length === 0) {
    return null;
  }

  return {
    primaryMotivation,
    skinExperience,
    desiredOutcomes,
  };
}

export function mapPrimaryMotivation(primaryMotivation: string): string {
  return primaryMotivationLabels[primaryMotivation] ?? primaryMotivation;
}

export function mapSelectedValues(
  selectedValues: string[],
  labelMap: Record<string, string>,
): string[] {
  return selectedValues
    .map((value) => labelMap[value] ?? value)
    .filter(Boolean);
}
