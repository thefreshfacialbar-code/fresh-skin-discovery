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
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { draftId } = body as { draftId?: unknown };

  if (
    typeof draftId !== "string" ||
    !UUID_PATTERN.test(draftId)
  ) {
    return NextResponse.json(
      { success: false, error: "Invalid draft ID" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  const { data: submittedDraft, error } =
    await supabaseAdmin
      .from("product_recommendation_profile_drafts")
      .update({
        review_status: "pending_review",
        submitted_at: now,
        updated_at: now,
      })
      .eq("id", draftId)
      .eq("review_status", "draft")
      .select("id, product_id, profile_id, review_status, submitted_at")
      .maybeSingle();

  if (error) {
    console.error("Recommendation submission failed:", error);

    return NextResponse.json(
      { success: false, error: "Unable to submit recommendation draft" },
      { status: 500 }
    );
  }

  if (!submittedDraft) {
    return NextResponse.json(
      {
        success: false,
        error: "Draft not found or no longer editable.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    success: true,
    draft: submittedDraft,
  });
}