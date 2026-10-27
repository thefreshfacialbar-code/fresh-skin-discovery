import { NextResponse } from "next/server";
import { requireFreshDeskOwnerAdmin } from "@/lib/requireFreshDeskEmployee";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

  const { draftId } = body as Record<string, unknown>;

  if (typeof draftId !== "string" || !UUID_PATTERN.test(draftId)) {
    return NextResponse.json(
      { success: false, error: "Invalid draft ID" },
      { status: 400 }
    );
  }

  // Publishing validations and updates are enforced
  // transactionally by the PostgreSQL function.
  const { data, error } = await supabaseAdmin.rpc(
    "publish_product_recommendation_draft",
    {
      p_draft_id: draftId,
    }
  );

  if (error) {
    console.error(
      "Unable to publish recommendation draft:",
      error.message
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to publish recommendation draft. Verify that the complete product draft is approved, valid, and not already published.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Recommendation settings published successfully.",
    draft: data,
  });
}