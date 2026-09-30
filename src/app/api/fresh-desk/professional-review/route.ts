import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { deliverFinalSkinPlan } from "@/lib/email/deliverFinalSkinPlan";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const consultationId = body.consultationId;
const professionalReviewNote =
  typeof body.professionalReviewNote === "string"
    ? body.professionalReviewNote.trim() || null
    : null;
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
    professional_review_note: professionalReviewNote,
  })
  .eq("id", consultationId)
  .select(
    "id, customer_id, professional_review_status, professional_reviewed_at, professional_review_note"
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
    const { data: customer, error: customerError } = await supabaseAdmin
  .from("customers")
  .select("email, first_name")
  .eq("id", data.customer_id)
  .maybeSingle();

if (customerError || !customer?.email) {
  console.error("Customer email lookup failed:", customerError);

  return NextResponse.json(
    {
      success: false,
      error: "Skin Plan was finalized, but the customer email could not be found.",
    },
    { status: 500 }
  );
}
const accessToken = crypto.randomUUID();

const { error: skinPlanTokenError } = await supabaseAdmin
  .from("skin_plans")
  .update({
    access_token: accessToken,
  })
  .eq("consultation_id", consultationId)
  .is("access_token", null);

if (skinPlanTokenError) {
  console.error("Skin Plan access token update failed:", skinPlanTokenError);

  return NextResponse.json(
    {
      success: false,
      error: "Skin Plan was finalized, but secure customer access could not be created.",
    },
    { status: 500 }
  );
}
const emailDelivery = await deliverFinalSkinPlan({
  guestEmail: customer.email,
  accessToken,
  firstName: customer.first_name?.trim() || undefined,
});

if (!emailDelivery.success) {
  console.error(
    "Final Skin Plan email delivery failed:",
    emailDelivery.errorMessage
  );

  return NextResponse.json(
    {
      success: false,
      error: "Skin Plan was finalized, but the customer email could not be sent.",
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