
import { NextResponse } from "next/server";
import { requireFreshDeskOwnerAdmin } from "@/lib/requireFreshDeskEmployee";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  PRODUCT_CATEGORY_OPTIONS,
  PRODUCT_JOURNEY_OPTIONS,
  PRODUCT_ROLE_OPTIONS,
  PRODUCT_INTENSITY_OPTIONS,
} from "@/lib/productResearchOptions";
import {
  isProductEligibilityRules,
} from "@/lib/productEligibilityPolicies";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const employeeSession = await requireFreshDeskOwnerAdmin();

  if (!employeeSession) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 403 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }

  const {
  productId,
  profileId,
  productCategory,
  primaryJourney,
  supportingJourney,
  recommendationRole,
  intensity,
  eligibilityRules,
  featuredEligible,
} = body as Record<string, unknown>;

  const valid =
    typeof productId === "string" &&
    UUID_PATTERN.test(productId) &&
    typeof profileId === "string" &&
    UUID_PATTERN.test(profileId) &&
    typeof productCategory === "string" &&
    PRODUCT_CATEGORY_OPTIONS.some((v) => v === productCategory) &&
    typeof primaryJourney === "string" &&
    PRODUCT_JOURNEY_OPTIONS.some((v) => v === primaryJourney) &&
    typeof supportingJourney === "string" &&
    (supportingJourney === "" ||
      PRODUCT_JOURNEY_OPTIONS.some((v) => v === supportingJourney)) &&
    typeof recommendationRole === "string" &&
    PRODUCT_ROLE_OPTIONS.some((v) => v === recommendationRole) &&
    typeof intensity === "number" &&
    PRODUCT_INTENSITY_OPTIONS.some((v) => v === intensity);

  if (!valid) {
    return NextResponse.json(
      { success: false, error: "Invalid recommendation settings" },
      { status: 400 }
    );
  }
if (
  eligibilityRules !== undefined &&
  !isProductEligibilityRules(eligibilityRules)
) {
  return NextResponse.json(
    {
      success: false,
      error: "Invalid eligibility rules",
    },
    { status: 400 }
  );
}
if (
  featuredEligible !== undefined &&
  typeof featuredEligible !== "boolean"
) {
  return NextResponse.json(
    {
      success: false,
      error: "Featured eligibility must be true or false",
    },
    { status: 400 }
  );
}
  // Confirm that the profile belongs to the specified product.
  const { data: profile, error: profileError } =
    await supabaseAdmin
      .from("product_recommendation_profiles")
      .select("id, product_id")
      .eq("id", profileId as string)
      .eq("product_id", productId as string)
      .maybeSingle();

  if (profileError) {
    return NextResponse.json(
      { success: false, error: "Unable to verify profile" },
      { status: 500 }
    );
  }

  if (!profile) {
    return NextResponse.json(
      { success: false, error: "Recommendation profile not found" },
      { status: 404 }
    );
  }

  // Do not overwrite an existing open draft.
  const { data: existingDraft, error: draftLookupError } =
    await supabaseAdmin
      .from("product_recommendation_profile_drafts")
      .select("id, review_status, proposed_settings")
      .eq("profile_id", profileId as string)
      .in("review_status", ["draft", "pending_review", "approved"])
.is("published_at", null)
.order("created_at", { ascending: false })
.limit(1)
.maybeSingle();

  if (draftLookupError) {
    return NextResponse.json(
      { success: false, error: "Unable to check existing drafts" },
      { status: 500 }
    );
  }

  

  const existingSettings =
  existingDraft?.review_status === "draft" &&
  existingDraft.proposed_settings &&
  typeof existingDraft.proposed_settings === "object" &&
  !Array.isArray(existingDraft.proposed_settings)
    ? existingDraft.proposed_settings
    : {};

const proposedSettings = {
  ...existingSettings,
  product_category: productCategory,
  primary_journey: primaryJourney,
  supporting_journey:
    supportingJourney === "" ? null : supportingJourney,
  recommendation_role: recommendationRole,
  intensity,
    ...(eligibilityRules !== undefined
    ? { eligibility_rules: eligibilityRules }
    : {}),
  ...(featuredEligible !== undefined
    ? { featured_eligible: featuredEligible }
    : {}),
};
// Pending-review drafts cannot be edited.
if (existingDraft?.review_status === "pending_review") {
  return NextResponse.json(
    {
      success: false,
      error: "This recommendation draft is pending review and cannot be edited.",
      draftId: existingDraft.id,
    },
    { status: 409 }
  );
}

// Update an existing draft without modifying the live profile.
if (existingDraft?.review_status === "draft") {
  const { data: updatedDraft, error: updateError } =
    await supabaseAdmin
      .from("product_recommendation_profile_drafts")
      .update({
        proposed_settings: proposedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingDraft.id)
      .eq("profile_id", profileId as string)
      .eq("review_status", "draft")
      .select("id, product_id, profile_id, review_status, updated_at")
      .maybeSingle();

  if (updateError) {
    return NextResponse.json(
      { success: false, error: "Unable to update recommendation draft" },
      { status: 500 }
    );
  }

  if (!updatedDraft) {
    return NextResponse.json(
      {
        success: false,
        error: "Draft status changed. Refresh before editing.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    success: true,
    action: "updated",
    draft: updatedDraft,
  });
}
  const { data: draft, error: insertError } =
    await supabaseAdmin
      .from("product_recommendation_profile_drafts")
      .insert({
        product_id: productId as string,
        profile_id: profileId as string,
        proposed_settings: proposedSettings,
        review_status: "draft",
      })
      .select("id, product_id, profile_id, review_status, created_at")
      .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        {
          success: false,
          error: "An open recommendation draft already exists.",
        },
        { status: 409 }
      );
    }

    console.error("Unable to create recommendation draft:", insertError.message);

    return NextResponse.json(
      { success: false, error: "Unable to create recommendation draft" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { success: true, draft },
    { status: 201 }
  );
}
