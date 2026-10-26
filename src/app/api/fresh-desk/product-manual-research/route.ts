import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireFreshDeskOwnerAdmin } from "@/lib/requireFreshDeskEmployee";
import {
  PRODUCT_JOURNEY_OPTIONS,
  PRODUCT_ROLE_OPTIONS,
  PRODUCT_INTENSITY_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
PRODUCT_USAGE_OPTIONS,
PRODUCT_ROUTINE_STEP_OPTIONS,
PRODUCT_SKIN_TYPE_OPTIONS,
PRODUCT_SKIN_CONCERN_OPTIONS,
PRODUCT_SKIN_BENEFIT_OPTIONS,
PRODUCT_TIMING_OPTIONS,
} from "@/lib/productResearchOptions";

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

  const { productId } = body as Record<string, unknown>;

  if (
    typeof productId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      productId
    )
  ) {
    return NextResponse.json(
      { success: false, error: "Invalid product ID" },
      { status: 400 }
    );
  }

  const { data: product, error: productError } =
    await supabaseAdmin
      .from("products")
      .select("id, name, brand")
      .eq("id", productId)
      .maybeSingle();

  if (productError || !product) {
    return NextResponse.json(
      { success: false, error: "Product not found" },
      { status: 404 }
    );
  }
const input = body as Record<string, unknown>;

const requiredFields = [
  "productCategory",
  "productDescription",
  "applicationInstructions",
  "usageFrequency",
  "routineStep",
] as const;

for (const field of requiredFields) {
  if (
    typeof input[field] !== "string" ||
    !input[field].trim()
  ) {
    return NextResponse.json(
      {
        success: false,
        error: `${field} is required.`,
      },
      { status: 400 }
    );
  }
}

const optionalFields = [
  "keyIngredients",
  "precautions",
  "internalNotes",
  "productUrl",
] as const;

for (const field of optionalFields) {
  if (
    input[field] !== undefined &&
    input[field] !== null &&
    typeof input[field] !== "string"
  ) {
    return NextResponse.json(
      {
        success: false,
        error: `${field} must be text.`,
      },
      { status: 400 }
    );
  }
}
const { data: existingResearch, error: researchError } =
  await supabaseAdmin
    .from("product_vendor_research")
    .select("id, research_status, research_source")
    .eq("product_id", productId)
    .maybeSingle();

if (researchError) {
  console.error("Manual research lookup failed:", researchError);

  return NextResponse.json(
    {
      success: false,
      error: "Could not check existing product research.",
    },
    { status: 500 }
  );
}
if (
  existingResearch &&
  existingResearch.research_source !== "manual"
) {
  return NextResponse.json(
    {
      success: false,
      error:
        "This product already has manufacturer research. Manual entry cannot replace it.",
    },
    { status: 409 }
  );
}
if (existingResearch?.research_status === "approved") {
  return NextResponse.json(
    {
      success: false,
      error:
        "Approved manufacturer research cannot be overwritten by manual entry.",
    },
    { status: 409 }
  );
}

if (
  existingResearch &&
  existingResearch.research_status !== "draft"
) {
  return NextResponse.json(
    {
      success: false,
      error:
        "Only draft research can be updated through manual entry.",
    },
    { status: 409 }
  );
}
const textValue = (field: string): string | null => {
  const value = input[field];

  return typeof value === "string"
    ? value.trim() || null
    : null;
};
const arrayValue = (field: string): string[] | null => {
  const value = input[field];

  if (!Array.isArray(value)) return null;
  if (!value.every((item) => typeof item === "string")) return null;

  return value;
};

const skinBenefitCodes = arrayValue("skinBenefitCodes");
const suitableSkinTypeCodes = arrayValue("suitableSkinTypeCodes");
const skinConcernCodes = arrayValue("skinConcernCodes");
const applicationTiming = arrayValue("applicationTiming");

const validArray = (
  values: string[] | null,
  options: readonly { value: string }[],
  required = false
) =>
  values !== null &&
  (!required || values.length > 0) &&
  values.every((value) =>
    options.some((option) => option.value === value)
  );

if (
  !validArray(skinBenefitCodes, PRODUCT_SKIN_BENEFIT_OPTIONS, true) ||
  !validArray(suitableSkinTypeCodes, PRODUCT_SKIN_TYPE_OPTIONS, true) ||
  !validArray(skinConcernCodes, PRODUCT_SKIN_CONCERN_OPTIONS) ||
  !validArray(applicationTiming, PRODUCT_TIMING_OPTIONS)
) {
  return NextResponse.json(
    { success: false, error: "Invalid research selections." },
    { status: 400 }
  );
}

const validOption = (
  value: string | null,
  options: readonly string[]
) =>
  value !== null && options.includes(value);

if (
  !validOption(textValue("productCategory"), PRODUCT_CATEGORY_OPTIONS) ||
  !validOption(textValue("usageFrequency"), PRODUCT_USAGE_OPTIONS) ||
  !validOption(textValue("routineStep"), PRODUCT_ROUTINE_STEP_OPTIONS)
) {
  return NextResponse.json(
    { success: false, error: "Invalid category, frequency, or routine step." },
    { status: 400 }
  );
}
const isEditingManualDraft =
  existingResearch?.research_source === "manual" &&
  existingResearch?.research_status === "draft";
  const primaryJourney = textValue("primaryJourney");
const supportingJourney = textValue("supportingJourney");
const recommendationRole = textValue("recommendationRole");
const intensityValue = textValue("intensity");

const intensity =
  intensityValue === null ? null : Number(intensityValue);

if (
  intensity !== null &&
  !PRODUCT_INTENSITY_OPTIONS.some((value) => value === intensity)
) {
  return NextResponse.json(
    {
      success: false,
      error: "Product intensity must be 1, 2, 3, or 4.",
    },
    { status: 400 }
  );
}
if (
  recommendationRole &&
  !PRODUCT_ROLE_OPTIONS.some((role) => role === recommendationRole)
) {
  return NextResponse.json(
    {
      success: false,
      error: "Invalid recommendation role selected.",
    },
    { status: 400 }
  );
}
const isValidJourney = (value: string) =>
  PRODUCT_JOURNEY_OPTIONS.some((journey) => journey === value);

if (
  (primaryJourney && !isValidJourney(primaryJourney)) ||
  (supportingJourney && !isValidJourney(supportingJourney))
) {
  return NextResponse.json(
    { success: false, error: "Invalid Fresh Method journey selected." },
    { status: 400 }
  );
}
const researchData = {
  product_id: productId,
  research_source: "manual",
  vendor_product_name: product.name,
  vendor_product_id: null,
  vendor_product_url: textValue("productUrl"),
    vendor_category: textValue("productCategory"),
  primary_journey: primaryJourney || null,
supporting_journey: supportingJourney || null,
  recommendation_role: recommendationRole || null,
intensity,
vendor_description: textValue("productDescription"),
  key_ingredients: textValue("keyIngredients"),
 skin_benefits: skinBenefitCodes!
  .map((code) =>
    PRODUCT_SKIN_BENEFIT_OPTIONS.find((o) => o.value === code)?.label
  )
  .join(", "),
skin_benefit_codes: skinBenefitCodes,
 suitable_skin_types: suitableSkinTypeCodes!
  .map((code) =>
    PRODUCT_SKIN_TYPE_OPTIONS.find((o) => o.value === code)?.label
  )
  .join(", "),
suitable_skin_type_codes: suitableSkinTypeCodes,
  skin_concerns: skinConcernCodes!
  .map((code) =>
    PRODUCT_SKIN_CONCERN_OPTIONS.find((o) => o.value === code)?.label
  )
  .join(", "),
skin_concern_codes: skinConcernCodes,
application_timing: applicationTiming,
  application_instructions: textValue("applicationInstructions"),
  usage_frequency: textValue("usageFrequency"),
  precautions: textValue("precautions"),
  routine_step: textValue("routineStep"),
  internal_notes: textValue("internalNotes"),
  research_status: "draft",
  professional_description: null,
  rejection_reason: null,
  reviewed_at: null,
  researched_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const saveQuery = isEditingManualDraft
  ? supabaseAdmin
      .from("product_vendor_research")
      .update(researchData)
      .eq("id", existingResearch!.id)
      .eq("research_source", "manual")
      .eq("research_status", "draft")
  : supabaseAdmin
      .from("product_vendor_research")
      .upsert(researchData, {
        onConflict: "product_id",
        ignoreDuplicates: true,
      });

const { data: savedResearch, error: saveError } =
  await saveQuery
    .select("id, product_id, research_source, research_status")
    .maybeSingle();

if (saveError) {
  console.error("Manual research save failed:", saveError);

  return NextResponse.json(
    {
      success: false,
      error: "Could not save manual product research.",
    },
    { status: 500 }
  );
}

if (!savedResearch) {
  return NextResponse.json(
    {
      success: false,
      error:
        "An existing research record was not modified. Refresh and check its status.",
    },
    { status: 409 }
  );
}

return NextResponse.json({
  success: true,
  product,
  research: savedResearch,
  message: "Manual product research saved as draft.",
});
}