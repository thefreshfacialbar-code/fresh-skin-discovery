
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
  customerGuidance,
  productCategory,
  primaryJourney,
  supportingJourney,
  recommendationRole,
  intensity,
  usageType,
  frequency,
  timing,
  requiresMixoGuidance,
  eligibilityRules,
  featuredEligible,
  experienceAssignments,
  manufacturerResearch,
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
  const validUsageTypes = ["Daily", "Periodic", "As Needed"];

const validFrequencies = [
  "Once Daily",
  "Twice Daily",
  "Once Weekly",
  "1–2x per Week",
  "2–3x per Week",
  "As Needed",
  "Reapply as Directed",
  "Per Mixo Guidance",
];

const validTimingOptions = ["AM", "PM", "During Treatment"];

const validRoutineSettings =
  typeof usageType === "string" &&
  (usageType === "" || validUsageTypes.includes(usageType)) &&
  typeof frequency === "string" &&
  (frequency === "" || validFrequencies.includes(frequency)) &&
  Array.isArray(timing) &&
  timing.every(
    (value) =>
      typeof value === "string" &&
      validTimingOptions.includes(value)
  ) &&
  new Set(timing).size === timing.length &&
  typeof requiresMixoGuidance === "boolean";

if (!validRoutineSettings) {
  return NextResponse.json(
    {
      success: false,
      error: "Invalid routine and usage settings",
    },
    { status: 400 }
  );
}
  if (
  typeof customerGuidance !== "string" ||
  customerGuidance.trim().length === 0 ||
  customerGuidance.trim().length > 2000
) {
  return NextResponse.json(
    {
      success: false,
      error: "Customer guidance is required and must be 2000 characters or fewer.",
    },
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
  // Optional experience configuration is staged, never written live here.
  const validExperienceIds = [
    "fresh-facial-bar-lash-lounge",
    "gentlemens-corner",
  ];
  if (experienceAssignments !== undefined && (
    !Array.isArray(experienceAssignments) ||
    experienceAssignments.length !== 2 ||
    new Set(experienceAssignments.map((v) =>
      v && typeof v === "object" && !Array.isArray(v)
        ? (v as Record<string, unknown>).experience_id : null
    )).size !== 2 ||
    !experienceAssignments.every((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return false;
      const row = item as Record<string, unknown>;
      return typeof row.experience_id === "string" &&
        validExperienceIds.includes(row.experience_id) &&
        typeof row.assigned === "boolean" &&
        Number.isInteger(row.recommendation_priority) &&
        (row.recommendation_priority as number) >= 0 &&
        (row.recommendation_priority as number) <= 10000;
    })
  )) {
    return NextResponse.json(
      { success: false, error: "Invalid experience assignments" },
      { status: 400 }
    );
  }

  // Manufacturer research is staged with the same immutable approval lifecycle.
  const allowedResearchFields = new Set(["research_source", "vendor_product_name", "vendor_product_id", "vendor_product_url", "vendor_category", "vendor_description", "professional_description", "key_ingredients", "skin_benefits", "suitable_skin_types", "skin_concerns", "application_instructions", "usage_frequency", "precautions", "routine_step", "internal_notes", "primary_journey", "supporting_journey", "recommendation_role", "intensity", "skin_benefit_codes", "suitable_skin_type_codes", "skin_concern_codes", "application_timing"]);
  if (manufacturerResearch !== undefined && (
    !manufacturerResearch || typeof manufacturerResearch !== "object" ||
    Array.isArray(manufacturerResearch) ||
    JSON.stringify(manufacturerResearch).length > 30000 ||
    !Object.entries(manufacturerResearch).every(([key, value]) =>
      allowedResearchFields.has(key) && (
        value === null ||
        (typeof value === "string" && value.length <= 8000) ||
        (key === "intensity" && Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 4) ||
        (["skin_benefit_codes", "suitable_skin_type_codes", "skin_concern_codes", "application_timing"].includes(key) &&
          Array.isArray(value) && value.length <= 30 && value.every((v) => typeof v === "string" && v.length <= 100))
      )
    )
  )) {
    return NextResponse.json({ success: false, error: "Invalid manufacturer research" }, { status: 400 });
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
  customer_guidance: customerGuidance,
  ...(manufacturerResearch !== undefined ? { manufacturer_research: manufacturerResearch } : {}),
  product_category: productCategory,
  primary_journey: primaryJourney,
  supporting_journey:
    supportingJourney === "" ? null : supportingJourney,
  recommendation_role: recommendationRole,
  intensity,
  usage_type: usageType === "" ? null : usageType,
  frequency: frequency === "" ? null : frequency,
  timing,
  requires_farmacist_review: requiresMixoGuidance,
  ...(experienceAssignments !== undefined
    ? { experience_assignments: experienceAssignments }
    : {}),
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

// An approved draft is immutable until published. Do not attempt an insert:
// the database allows only one unpublished open draft per profile.
if (existingDraft?.review_status === "approved") {
  return NextResponse.json(
    {
      success: false,
      error: "An approved draft is awaiting publication. Publish it before creating another draft.",
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
