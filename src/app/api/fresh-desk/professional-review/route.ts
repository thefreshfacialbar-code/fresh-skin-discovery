import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const consultationId = body.consultationId;

    if (!consultationId || typeof consultationId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Consultation ID is required.",
        },
        { status: 400 }
      );
    }
const { data: skinPlan, error: skinPlanError } = await supabaseAdmin
  .from("skin_plans")
  .select("id")
  .eq("consultation_id", consultationId)
  .maybeSingle();

if (skinPlanError || !skinPlan) {
  return NextResponse.json(
    {
      success: false,
      error: "Could not load the Skin Plan.",
    },
    { status: 404 }
  );
}

const { count: unreviewedProductCount, error: productCountError } =
  await supabaseAdmin
    .from("skin_plan_products")
    .select("id", { count: "exact", head: true })
    .eq("skin_plan_id", skinPlan.id)
    .eq("status", "recommended");

if (productCountError) {
  console.error(
    "Could not check Skin Plan product review status:",
    productCountError
  );

  return NextResponse.json(
    {
      success: false,
      error: "Could not verify the Skin Plan review.",
    },
    { status: 500 }
  );
}

if ((unreviewedProductCount ?? 0) > 0) {
  return NextResponse.json(
    {
      success: false,
      error: `Review all products before finalizing. ${
        unreviewedProductCount ?? 0
      } product${
        unreviewedProductCount === 1 ? "" : "s"
      } still need a decision.`,
    },
    { status: 409 }
  );
}
    const reviewedAt = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("consultations")
      .update({
        professional_review_status: "reviewed",
        professional_reviewed_at: reviewedAt,
      })
      .eq("id", consultationId)
      .select(
        "id, professional_review_status, professional_reviewed_at"
      )
      .single();

    if (error) {
      console.error("Professional review update failed:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Could not finalize the Skin Plan.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      consultation: data,
    });
  } catch (error) {
    console.error("Professional review request failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Could not finalize the Skin Plan.",
      },
      { status: 500 }
    );
  }
}