
import { NextResponse } from "next/server";
import { requireFreshDeskOwnerAdmin } from "@/lib/requireFreshDeskEmployee";

export async function POST() {
  const employeeSession = await requireFreshDeskOwnerAdmin();

  if (!employeeSession) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized",
      },
      { status: 403 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error:
        "Direct recommendation updates are disabled. Use the Draft, Professional Review, and Publish workflow in Fresh Desk 360.",
    },
    { status: 409 }
  );
}