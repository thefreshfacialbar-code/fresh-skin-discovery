
import { journeyIds } from "@/types/recommendation";
import type {
  ProductCategory,
  ProductUsageType,
} from "@/types/productRecommendation";

export const PRODUCT_CATEGORY_OPTIONS = [
  "Cleanser",
  "Tonic",
  "Serum & Treatment",
  "Moisturizer",
  "Mask",
  "Exfoliant",
  "Eye Care",
  "Neck & Décolleté",
  "Sun Protection",
] as const satisfies readonly ProductCategory[];

export const PRODUCT_USAGE_OPTIONS = [
  "Daily",
  "Weekly",
  "Periodic",
  "As Needed",
  "Weekly / Periodic",
  "Daily / As Needed",
  "Mixo Guided",
] as const satisfies readonly ProductUsageType[];

export const PRODUCT_JOURNEY_OPTIONS = journeyIds;

export const PRODUCT_INTENSITY_OPTIONS = [1, 2, 3, 4] as const;

export const PRODUCT_ROLE_OPTIONS = [
  "Cleanse",
  "Moisturize",
  "Moisturize/Repair",
  "Treat",
  "Exfoliate/Refine",
  "Eye",
  "Protect",
  "Comfort",
  "Renew",
  "Hydrate",
  "Replenish",
  "Clarify",
  "Refresh",
  "Brighten",
  "Reset",
  "Balance",
  "Restore",
  "Refine",
  "Glow",
  "Resurface",
  "Firm",
  "Lift",
] as const;

export const PRODUCT_SKIN_TYPE_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "dry", label: "Dry" },
  { value: "oily", label: "Oily" },
  { value: "combination", label: "Combination" },
  { value: "sensitive", label: "Sensitive" },
] as const;

export const PRODUCT_SKIN_CONCERN_OPTIONS = [
  { value: "tight-after-cleansing", label: "Tight after cleansing" },
  { value: "dry-throughout-day", label: "Dryness throughout the day" },
  { value: "oily-throughout-day", label: "Oiliness throughout the day" },
  { value: "clogged-pores-breakouts", label: "Clogged pores or breakouts" },
  { value: "easily-irritated", label: "Easily irritated" },
  { value: "reacts-to-products", label: "Reacts to products" },
  { value: "dull-lacks-radiance", label: "Dullness or lack of radiance" },
  { value: "fine-lines-texture", label: "Fine lines or texture" },
  { value: "comfortable-balanced", label: "Comfortable, balanced skin" },
] as const;

export const PRODUCT_SKIN_BENEFIT_OPTIONS = [
  { value: "feel-more-hydrated", label: "Feel more hydrated" },
  { value: "stay-clearer", label: "Stay clearer" },
  { value: "feel-calmer", label: "Feel calmer" },
  { value: "look-brighter", label: "Look brighter" },
  { value: "feel-firmer-smoother", label: "Feel firmer and smoother" },
  { value: "stay-healthy-balanced", label: "Stay healthy and balanced" },
] as const;

export const PRODUCT_ROUTINE_STEP_OPTIONS = [
  "Cleanse",
  "Tone",
  "Treat",
  "Moisturize",
  "Protect",
  "Exfoliate",
  "Mask",
  "Eye Care",
  "Neck & Décolleté",
] as const;

export const PRODUCT_TIMING_OPTIONS = [
  { value: "morning", label: "Morning" },
  { value: "evening", label: "Evening" },
  { value: "as-needed", label: "As Needed" },
] as const;
