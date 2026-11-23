import { NextResponse } from "next/server";
import { requireFreshDeskOwnerAdmin } from "@/lib/requireFreshDeskEmployee";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_EXPERIENCES = [
  "fresh-facial-bar-lash-lounge",
  "gentlemens-corner",
];

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

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 }
    );
  }

  const { productId, experienceId, assigned } = body as Record<
    string,
    unknown
  >;

  if (
    typeof productId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId) ||
    typeof experienceId !== "string" ||
    !VALID_EXPERIENCES.includes(experienceId) ||
    typeof assigned !== "boolean"
  ) {
    return NextResponse.json(
      { success: false, error: "Invalid assignment data" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("product_experience_recommendations")
    .upsert(
      {
        product_id: productId,
        experience_id: experienceId,
        assigned,
        approval_status: "pending",
        reviewed_at: null,
      },
      { onConflict: "product_id,experience_id" }
    )
    .select("experience_id, assigned, approval_status")
    .single();

  if (error) {
    console.error("Product assignment update failed:", error.message);

    return NextResponse.json(
      { success: false, error: "Unable to save assignment" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, assignment: data });
}