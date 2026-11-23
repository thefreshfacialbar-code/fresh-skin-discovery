
import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type SkinDiscoveryEmailProduct = {
  productId: string;
  routineStep: string;
  routineOrder: number;
  name: string;
  description: string;
  productUrl: string | null;
  shopifyVariantId: string | null;
};

export type SkinDiscoveryEmailEnhancement = {
  id: string;
  name: string;
  description: string | null;
};

export type SkinDiscoveryEmailData = {
  businessId: string;
  consultationId: string;
  skinPlanId: string;
  submissionId: string;
  experience: string | null;
  guest: {
    firstName: string;
    lastName: string;
    email: string;
  };
  journey: {
  primary: string;
  secondary: string | null;
  resultSummary: string | null;
  scores: Array<{
    journey: string;
    score: number;
    rank: number;
    role: string;
  }>;
};
  products: SkinDiscoveryEmailProduct[];
  enhancements: SkinDiscoveryEmailEnhancement[];
};

type LoadOptions = {
  consultationId: string;
  skinPlanId: string;
};

export async function loadSkinDiscoveryEmailData({
  consultationId,
  skinPlanId,
}: LoadOptions): Promise<SkinDiscoveryEmailData> {
  const { data: consultation, error: consultationError } =
    await supabaseAdmin
      .from("consultations")
      .select(
        "id, submission_id, business_id, customer_id, experience_id"
      )
      .eq("id", consultationId)
      .single();

  if (consultationError || !consultation) {
    throw new Error("Skin Discovery consultation could not be loaded.");
  }

  const { data: customer, error: customerError } =
    await supabaseAdmin
      .from("customers")
      .select("id, first_name, last_name, email")
      .eq("id", consultation.customer_id)
      .eq("business_id", consultation.business_id)
      .single();

  if (customerError || !customer?.email) {
    throw new Error("Skin Discovery customer could not be loaded.");
  }

  const { data: plan, error: planError } =
    await supabaseAdmin
      .from("skin_plans")
      .select("id, business_id, customer_id, primary_journey, secondary_journey")
      .eq("id", skinPlanId)
      .eq("consultation_id", consultationId)
      .eq("business_id", consultation.business_id)
      .eq("customer_id", consultation.customer_id)
      .single();

  if (planError || !plan) {
    throw new Error("Saved Skin Plan could not be loaded.");
  }
  const { data: consultationResult, error: resultError } =
    await supabaseAdmin
      .from("consultation_results")
      .select("primary_journey, secondary_journey, result_summary")
      .eq("consultation_id", consultationId)
      .single();

  if (resultError || !consultationResult) {
    throw new Error("Saved Skin Discovery journey result could not be loaded.");
  }
    const { data: savedJourneyScores, error: scoresError } =
    await supabaseAdmin
      .from("consultation_journey_scores")
      .select("journey, score, rank, role")
      .eq("consultation_id", consultationId)
      .order("rank", { ascending: true });

  if (scoresError || !savedJourneyScores?.length) {
    throw new Error(
      "Saved Skin Discovery journey scores could not be loaded.",
    );
  }
  const { data: savedProducts, error: productsError } =
    await supabaseAdmin
      .from("skin_plan_products")
      .select(
        "product_id, routine_step, routine_order, product_name_snapshot, customer_guidance"
      )
      .eq("skin_plan_id", skinPlanId)
      .eq("status", "recommended")
      .order("routine_order", { ascending: true });

  if (productsError || !savedProducts) {
    throw new Error("Saved Skin Plan products could not be loaded.");
  }

  const productIds = [
    ...new Set(
      savedProducts
        .map((product) => product.product_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];

  const commerceById = new Map<
    string,
    {
      product_url: string | null;
      shopify_variant_id: string | null;
    }
  >();

  if (productIds.length > 0) {
    const { data: catalogProducts, error: catalogError } =
      await supabaseAdmin
        .from("products")
        .select("id, product_url, shopify_variant_id")
        .eq("business_id", consultation.business_id)
        .in("id", productIds);

    if (catalogError || !catalogProducts) {
      throw new Error("Shopify product information could not be loaded.");
    }

    for (const product of catalogProducts) {
      commerceById.set(product.id, product);
    }
  }

  const products: SkinDiscoveryEmailProduct[] = savedProducts.map(
    (product) => {
      const commerce = commerceById.get(product.product_id);

      return {
        productId: product.product_id,
        routineStep: product.routine_step,
        routineOrder: product.routine_order,
        name: product.product_name_snapshot ?? "Your Fresh Pick",
        description:
          product.customer_guidance?.trim() ||
          "Selected for your personalized Skin Discovery routine. Your Mixo can help you find the best way to use it.",
        productUrl: commerce?.product_url ?? null,
        shopifyVariantId: commerce?.shopify_variant_id ?? null,
      };
    }
  );

  const { data: savedEnhancements, error: enhancementsError } =
    await supabaseAdmin
      .from("skin_plan_enhancements")
      .select(
        "enhancement_id, enhancement_name_snapshot, customer_guidance"
      )
      .eq("skin_plan_id", skinPlanId)
      .order("recommendation_order", { ascending: true });

  if (enhancementsError || !savedEnhancements) {
    throw new Error("Saved Skin Plan enhancements could not be loaded.");
  }

  const enhancements: SkinDiscoveryEmailEnhancement[] =
    savedEnhancements.map((enhancement) => ({
      id: enhancement.enhancement_id,
      name: enhancement.enhancement_name_snapshot,
      description: enhancement.customer_guidance ?? null,
    }));

  return {
    businessId: consultation.business_id,
    consultationId,
    skinPlanId,
    submissionId: consultation.submission_id,
    experience: consultation.experience_id,
    guest: {
      firstName: customer.first_name ?? "",
      lastName: customer.last_name ?? "",
      email: customer.email,
    },
    journey: {
  primary: plan.primary_journey,
  secondary: plan.secondary_journey,
  resultSummary: consultationResult.result_summary,
  scores: savedJourneyScores.map((item) => ({
    journey: item.journey,
    score: Number(item.score),
    rank: item.rank,
    role: item.role,
  })),
},
    products,
    enhancements,
  };
}