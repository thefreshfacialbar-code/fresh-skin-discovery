import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type {
  Product,
  ProductCategory,
  ProductUsageType,
} from "@/types/productRecommendation";

import type { JourneyId } from "@/types/recommendation";

export async function getSupabaseProductCatalog(): Promise<Product[]> {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select(`
      fresh_product_id,
      name,
      category,
      active,
      recommendable,
      recommendation_status,
      product_recommendation_profiles (
      product_category,
      experience_ids,
        primary_journey,
        supporting_journey,
        recommendation_role,
        customer_guidance,
        intensity,
        usage_type,
        requires_farmacist_review,
        calm_sensitive_caution,
        excluded
      )
    `)
    .eq("active", true)
    .eq("recommendable", true)
    .eq("recommendation_status", "approved");

  if (error) {
    throw new Error(`Could not load Fresh Method product catalog: ${error.message}`);
  }

  return (data ?? []).flatMap((row): Product[] => {
  const relatedProfile = row.product_recommendation_profiles;

  const profile = Array.isArray(relatedProfile)
    ? relatedProfile[0]
    : relatedProfile;

  if (
    !row.fresh_product_id ||
    !profile ||
    !profile.product_category ||
    !profile.primary_journey ||
    !profile.supporting_journey ||
    !profile.recommendation_role ||
    !profile.customer_guidance ||
    !profile.intensity
  ) {
    return [];
  }

  return [
    {
      id: row.fresh_product_id,
      experienceIds: profile.experience_ids ?? [],
      name: row.name,
      category: profile.product_category as ProductCategory,
      primaryJourney: profile.primary_journey as JourneyId,
      supportingJourney: profile.supporting_journey as JourneyId,
      role: profile.recommendation_role,
      guestBenefit: profile.customer_guidance,
      intensity: profile.intensity as 1 | 2 | 3 | 4,
      usageType: profile.usage_type
        ? (profile.usage_type as ProductUsageType)
        : undefined,
      requiresFarmacistReview: profile.requires_farmacist_review,
      calmSensitiveCaution: profile.calm_sensitive_caution,
      excluded: profile.excluded,
    },
  ];
});
}