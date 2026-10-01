import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireFreshDeskEmployee } from "@/lib/requireFreshDeskEmployee";

export async function POST(request: Request) {
  try {
       const employeeSession = await requireFreshDeskEmployee();

if (!employeeSession) {
  return NextResponse.json(
    { success: false, error: "Unauthorized." },
    { status: 401 }
  );
}
    const body = await request.json();

    const skinPlanProductId = body.skinPlanProductId;
    const replacementFreshProductId = body.replacementFreshProductId;

    if (
      !skinPlanProductId ||
      typeof skinPlanProductId !== "string" ||
      !replacementFreshProductId ||
      typeof replacementFreshProductId !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Product and replacement IDs are required.",
        },
        { status: 400 }
      );
    }

    const { data: originalProduct, error: originalError } =
      await supabaseAdmin
        .from("skin_plan_products")
        .select(
          "id, skin_plan_id, product_id, routine_step, routine_order, timing, frequency, recommendation_reason, customer_guidance"
        )
        .eq("id", skinPlanProductId)
        .single();

    if (originalError || !originalProduct) {
      console.error("Could not load original Skin Plan product:", originalError);

      return NextResponse.json(
        {
          success: false,
          error: "Could not load the original Skin Plan product.",
        },
        { status: 404 }
      );
    }
    const { data: planOwnership, error: ownershipError } =
      await supabaseAdmin
        .from("skin_plans")
        .select(`
          consultations!inner (
            customers!inner (
              business_id
            )
          )
        `)
        .eq("id", originalProduct.skin_plan_id)
        .maybeSingle();

    if (ownershipError || !planOwnership) {
      return NextResponse.json(
        { success: false, error: "Skin Plan not found." },
        { status: 404 }
      );
    }

    const consultation = planOwnership.consultations[0];
    const customer = consultation?.customers?.[0];
    const productBusinessId = customer?.business_id;

    if (productBusinessId !== employeeSession.employee.business_id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 403 }
      );
    }
    const { data: replacementProduct, error: replacementError } =
      await supabaseAdmin
        .from("products")
        .select(`
  id,
  fresh_product_id,
  name,
  brand,
  price,
  product_recommendation_profiles (
    customer_guidance,
    usage_type
  )
`)
        .eq("fresh_product_id", replacementFreshProductId)
        .eq("active", true)
        .eq("recommendable", true)
        .eq("recommendation_status", "approved")
        .single();

    if (replacementError || !replacementProduct) {
      console.error("Could not load replacement product:", replacementError);

      return NextResponse.json(
        {
          success: false,
          error: "Could not load the replacement product.",
        },
        { status: 404 }
      );
    }

    if (replacementProduct.id === originalProduct.product_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Choose a different replacement product.",
        },
        { status: 400 }
      );
    }

    const reviewedAt = new Date().toISOString();
const relatedProfile =
  replacementProduct.product_recommendation_profiles;

const replacementProfile = Array.isArray(relatedProfile)
  ? relatedProfile[0]
  : relatedProfile;
    const { data: newProduct, error: insertError } = await supabaseAdmin
      .from("skin_plan_products")
      .insert({
        skin_plan_id: originalProduct.skin_plan_id,
        product_id: replacementProduct.id,
        routine_step: originalProduct.routine_step,
        routine_order: originalProduct.routine_order,
        timing: originalProduct.timing,
        frequency: originalProduct.frequency,
        recommendation_reason: originalProduct.recommendation_reason,
        customer_guidance: replacementProfile?.customer_guidance ?? null,
usage_type: replacementProfile?.usage_type ?? null,
        product_name_snapshot: replacementProduct.name,
        brand_snapshot: replacementProduct.brand,
        price_snapshot: replacementProduct.price,
        status: "confirmed",
        reviewed_at: reviewedAt,
        replaces_skin_plan_product_id: originalProduct.id,
      })
      .select("id")
      .single();

    if (insertError || !newProduct) {
      console.error("Could not insert replacement product:", insertError);

      return NextResponse.json(
        {
          success: false,
          error: "Could not save the replacement product.",
        },
        { status: 500 }
      );
    }

    const { error: updateOriginalError } = await supabaseAdmin
      .from("skin_plan_products")
      .update({
        status: "replaced",
        reviewed_at: reviewedAt,
      })
      .eq("id", originalProduct.id);

    if (updateOriginalError) {
      console.error(
        "Could not mark original product as replaced:",
        updateOriginalError
      );

      await supabaseAdmin
        .from("skin_plan_products")
        .delete()
        .eq("id", newProduct.id);

      return NextResponse.json(
        {
          success: false,
          error: "Could not complete the product replacement.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      replacementProductId: newProduct.id,
    });
  } catch (error) {
    console.error("Product replacement request failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Could not replace this product.",
      },
      { status: 500 }
    );
  }
}