import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireFreshDeskEmployee } from "@/lib/requireFreshDeskEmployee";
import { deliverFinalSkinPlan } from "@/lib/email/deliverFinalSkinPlan";


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
        const { data: consultationOwnership, error: ownershipError } =
      await supabaseAdmin
        .from("consultations")
        .select(`
  id,
  experience_id,
  customers!inner (
    business_id
  )
`)
        .eq("id", consultationId)
        .maybeSingle();

    if (ownershipError || !consultationOwnership) {
      return NextResponse.json(
        { success: false, error: "Consultation not found." },
        { status: 404 }
      );
    }

 const ownershipCustomer = Array.isArray(consultationOwnership.customers)
  ? consultationOwnership.customers[0]
  : consultationOwnership.customers;

const consultationBusinessId = ownershipCustomer?.business_id;

    if (
      consultationBusinessId !== employeeSession.employee.business_id
    ) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 403 }
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
    professional_reviewed_by: employeeSession.employee.id,
  })
  .eq("id", consultationId)
  .select(
  "id, customer_id, professional_review_status, professional_reviewed_at, professional_reviewed_by, professional_review_note"
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
const { data: finalizedProducts, error: finalizedProductsError } =
  await supabaseAdmin
    .from("skin_plan_products")
    .select(`
      product_id,
      routine_step,
      routine_order,
      product_name_snapshot,
      brand_snapshot,
      customer_guidance,
      usage_type,
      timing,
      frequency
    `)
    .eq("skin_plan_id", skinPlan.id)
    .eq("status", "confirmed")
    .order("routine_order", { ascending: true });

if (finalizedProductsError) {
  console.error(
    "Finalized Skin Plan product lookup failed:",
    finalizedProductsError
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "Skin Plan was finalized, but the finalized products could not be loaded.",
    },
    { status: 500 }
  );
}
const finalizedProductIds = (finalizedProducts ?? [])
  .map((product) => product.product_id)
  .filter((productId): productId is string => Boolean(productId));

const { data: finalizedProductCommerce, error: finalizedProductCommerceError } =
  finalizedProductIds.length > 0
    ? await supabaseAdmin
        .from("products")
        .select("id, product_url, shopify_variant_id")
        .in("id", finalizedProductIds)
    : { data: [], error: null };

if (finalizedProductCommerceError) {
  console.error(
    "Finalized Skin Plan commerce lookup failed:",
    finalizedProductCommerceError
  );

  return NextResponse.json(
    {
      success: false,
      error:
        "Skin Plan was finalized, but the product shopping information could not be loaded.",
    },
    { status: 500 }
  );
}
const commerceByProductId = new Map(
  (finalizedProductCommerce ?? []).map((product) => [
    product.id,
    product,
  ])
);

const finalEmailProducts = (finalizedProducts ?? []).map((product) => {
  const commerce = commerceByProductId.get(product.product_id);

  return {
    productId: product.product_id,
    routineStep: product.routine_step,
    routineOrder: product.routine_order,
    productName: product.product_name_snapshot,
    brand: product.brand_snapshot,
    customerGuidance: product.customer_guidance,
    usageType: product.usage_type,
    timing: product.timing,
    frequency: product.frequency,
    productUrl: commerce?.product_url ?? null,
    shopifyVariantId: commerce?.shopify_variant_id ?? null,
  };
});

const emailDelivery = await deliverFinalSkinPlan({
  guestEmail: customer.email,
  accessToken,
  firstName: customer.first_name?.trim() || undefined,
  experience: consultationOwnership.experience_id,
  products: finalEmailProducts,
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