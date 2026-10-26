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

  const { draftId, decision, reviewNotes } = body as {
    draftId?: unknown;
    decision?: unknown;
    reviewNotes?: unknown;
  };

  if (
    typeof draftId !== "string" ||
    !UUID_PATTERN.test(draftId) ||
    (decision !== "approved" && decision !== "rejected") ||
    (reviewNotes !== undefined &&
      typeof reviewNotes !== "string")
  ) {
    return NextResponse.json(
      { success: false, error: "Invalid review request" },
      { status: 400 }
    );
  }

  if (
    decision === "rejected" &&
    (typeof reviewNotes !== "string" ||
      reviewNotes.trim().length === 0)
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "A review note is required when rejecting a draft.",
      },
      { status: 400 }
    );
  }

  const { data: draft, error: draftError } =
    await supabaseAdmin
      .from("product_recommendation_profile_drafts")
      .select("id, product_id, profile_id, review_status")
      .eq("id", draftId)
      .maybeSingle();

  if (draftError) {
    return NextResponse.json(
      { success: false, error: "Unable to load recommendation draft" },
      { status: 500 }
    );
  }

  if (!draft || draft.review_status !== "pending_review") {
    return NextResponse.json(
      {
        success: false,
        error: "Draft not found or not pending review.",
      },
      { status: 409 }
    );
  }

    const { data: reviewResult, error: reviewError } =
    await supabaseAdmin.rpc(
      "review_product_recommendation_draft",
      {
        p_draft_id: draftId,
        p_decision: decision,
        p_review_notes:
          typeof reviewNotes === "string"
            ? reviewNotes.trim() || null
            : null,
      }
    );

  if (reviewError) {
    console.error(
      "Recommendation review failed:",
      reviewError
    );

    return NextResponse.json(
      {
        success: false,
        error: reviewError.message,
      },
      { status: 409 }
    );
  }

  const reviewedDraft = reviewResult?.[0];

  if (!reviewedDraft) {
    return NextResponse.json(
      {
        success: false,
        error: "No review result was returned.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    draft: reviewedDraft,
  });
}