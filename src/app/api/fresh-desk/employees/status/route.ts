import { NextResponse } from "next/server";

import { requireFreshDeskOwnerAdmin } from "@/lib/requireFreshDeskEmployee";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const employeeSession = await requireFreshDeskOwnerAdmin();

  if (!employeeSession) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 403 }
    );
  }

  const body = await request.json();

  const employeeId =
    typeof body.employeeId === "string"
      ? body.employeeId
      : "";

  const active =
    typeof body.active === "boolean"
      ? body.active
      : null;

  if (!employeeId || active === null) {
    return NextResponse.json(
      {
        success: false,
        error: "Employee ID and active status are required.",
      },
      { status: 400 }
    );
  }
console.log("Employee status request:", {
  employeeId,
  active,
  requestingEmployeeId: employeeSession.employee.id,
  businessId: employeeSession.employee.business_id,
});
  if (
    employeeId === employeeSession.employee.id &&
    active === false
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "You cannot deactivate your own account.",
      },
      { status: 400 }
    );
  }

  const { data: employee, error: employeeError } =
    await supabaseAdmin
      .from("employees")
      .select("id, business_id, active")
      .eq("id", employeeId)
      .eq(
        "business_id",
        employeeSession.employee.business_id
      )
      .maybeSingle();

  if (employeeError) {
    console.error(
      "Fresh Desk employee status lookup failed:",
      employeeError
    );

    return NextResponse.json(
      {
        success: false,
        error: "Employee could not be updated.",
      },
      { status: 500 }
    );
  }

  if (!employee) {
    return NextResponse.json(
      {
        success: false,
        error: "Employee not found.",
      },
      { status: 404 }
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("employees")
    .update({
      active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", employeeId)
    .eq(
      "business_id",
      employeeSession.employee.business_id
    );

  if (updateError) {
    console.error(
      "Fresh Desk employee status update failed:",
      updateError
    );

    return NextResponse.json(
      {
        success: false,
        error: "Employee could not be updated.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    employeeId,
    active,
  });
}