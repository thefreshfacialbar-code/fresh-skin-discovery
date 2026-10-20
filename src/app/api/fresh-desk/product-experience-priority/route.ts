
import { NextResponse } from "next/server";
import { requireFreshDeskOwnerAdmin } from "@/lib/requireFreshDeskEmployee";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_EXPERIENCES = [
  "fresh-facial-bar-lash-lounge",
  "gentlemens-corner",
];

const VALID_PRIORITIES = [80, 100, 120];

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

  const { productId, experienceId, priority } =
    body as Record<string, unknown>;

  if (
    typeof productId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId) ||
    typeof experienceId !== "string" ||
    !VALID_EXPERIENCES.includes(experienceId) ||
    typeof priority !== "number" ||
    !VALID_PRIORITIES.includes(priority)
  ) {
    return NextResponse.json(
      { success: false, error: "Invalid priority data" },
      { status: 400 }
    );
  }

  const { data: assignment, error: lookupError } =
    await supabaseAdmin
      .from("product_experience_recommendations")
      .select("id, assigned")
      .eq("product_id", productId)
      .eq("experience_id", experienceId)
      .maybeSingle();

  if (lookupError || !assignment) {
    return NextResponse.json(
      { success: false, error: "Assignment not found" },
      { status: 404 }
    );
  }

  if (!assignment.assigned) {
    return NextResponse.json(
      {
        success: false,
        error: "Product must be assigned before setting priority",
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("product_experience_recommendations")
    .update({
      recommendation_priority: priority,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assignment.id)
    .eq("assigned", true)
    .select(
      "experience_id, assigned, recommendation_priority"
    )
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { success: false, error: "Unable to save priority" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    priority: data,
  });
}
