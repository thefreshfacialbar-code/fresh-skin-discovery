import { NextResponse } from "next/server";
import { requireFreshDeskOwnerAdmin } from "@/lib/requireFreshDeskEmployee";

// Deprecated write endpoint: manufacturer research is part of the unified
// product recommendation draft. Never write research outside Publish.
export async function POST() {
  if (!(await requireFreshDeskOwnerAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }
  return NextResponse.json({
    success: false,
    error: "This separate research action has been retired. Edit manufacturer research on the product configuration screen, then Save Draft, Submit, Approve and Publish.",
  }, { status: 410 });
}
