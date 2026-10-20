
import { NextResponse } from "next/server";
import { requireFreshDeskOwnerAdmin } from "@/lib/requireFreshDeskEmployee";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

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

  const { researchId, status, professionalDescription, rejectionReason } =
  body as Record<string, unknown>;

  if (
    typeof researchId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(researchId) ||
    (status !== "approved" && status !== "rejected")
  ) {
    return NextResponse.json(
      { success: false, error: "Invalid review request" },
      { status: 400 }
    );
  }
  if (
    (professionalDescription !== undefined &&
      (typeof professionalDescription !== "string" ||
        professionalDescription.length > 10000)) ||
    (rejectionReason !== undefined &&
      (typeof rejectionReason !== "string" ||
        rejectionReason.length > 2000))
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid description or rejection reason.",
      },
      { status: 400 }
    );
  }

  if (
    status === "rejected" &&
    (typeof rejectionReason !== "string" ||
      !rejectionReason.trim())
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "A rejection reason is required.",
      },
      { status: 400 }
    );
  }
  const { data, error } = await supabaseAdmin
    .from("product_vendor_research")
    .update({
  research_status: status,
  professional_description:
    typeof professionalDescription === "string"
      ? professionalDescription.trim() || null
      : null,
  rejection_reason:
    status === "rejected" &&
    typeof rejectionReason === "string"
      ? rejectionReason.trim()
      : null,
  reviewed_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})
    .eq("id", researchId)
    .eq("research_status", "draft")
    .select("id, research_status")
    .maybeSingle();

  if (error) {
    console.error("Vendor research review failed:", error);

    return NextResponse.json(
      { success: false, error: "Could not save review." },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        success: false,
        error: "Draft research not found or already reviewed.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    success: true,
    research: data,
  });
}
