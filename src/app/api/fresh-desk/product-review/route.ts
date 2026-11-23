import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireFreshDeskEmployee } from "@/lib/requireFreshDeskEmployee";

const allowedStatuses = ["confirmed", "removed"] as const;

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

    const productId = body.productId;
    const status = body.status;

    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        { success: false, error: "Skin Plan product ID is required." },
        { status: 400 }
      );
    }

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid review status." },
        { status: 400 }
      );
    }
    const { data: productOwnership, error: ownershipError } =
      await supabaseAdmin
        .from("skin_plan_products")
        .select(`
          id,
          skin_plans!inner (
            consultations!inner (
              customers!inner (
                business_id
              )
            )
          )
        `)
        .eq("id", productId)
        .maybeSingle();

    if (ownershipError || !productOwnership) {
      return NextResponse.json(
        { success: false, error: "Skin Plan product not found." },
        { status: 404 }
      );
    }

const skinPlan = Array.isArray(productOwnership.skin_plans)
  ? productOwnership.skin_plans[0]
  : productOwnership.skin_plans;

const consultation = Array.isArray(skinPlan?.consultations)
  ? skinPlan.consultations[0]
  : skinPlan?.consultations;

const customer = Array.isArray(consultation?.customers)
  ? consultation.customers[0]
  : consultation?.customers;

const productBusinessId = customer?.business_id;

    if (productBusinessId !== employeeSession.employee.business_id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 403 }
      );
    }
    const reviewedAt = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("skin_plan_products")
      .update({
        status,
        reviewed_at: reviewedAt,
      })
      .eq("id", productId)
      .select("id, status, reviewed_at")
      .single();

    if (error) {
      console.error("Product review update failed:", error);

      return NextResponse.json(
        { success: false, error: "Could not update this product." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      product: data,
    });
  } catch (error) {
    console.error("Product review request failed:", error);

    return NextResponse.json(
      { success: false, error: "Could not update this product." },
      { status: 500 }
    );
  }
}