import { NextResponse } from "next/server";
import { requireFreshDeskOwnerAdmin } from "@/lib/requireFreshDeskEmployee";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  const session = await requireFreshDeskOwnerAdmin();

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const employeeId =
    typeof body?.employeeId === "string"
      ? body.employeeId.trim()
      : "";

  const role =
    body?.role === "owner_admin" || body?.role === "professional"
      ? body.role
      : null;

  if (!employeeId || !role) {
    return NextResponse.json(
      { success: false, error: "Valid employee ID and role required." },
      { status: 400 }
    );
  }

  if (employeeId === session.employee.id) {
    return NextResponse.json(
      { success: false, error: "You cannot change your own role." },
      { status: 400 }
    );
  }

  const { data: employee, error: lookupError } = await supabaseAdmin
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .eq("business_id", session.employee.business_id)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json(
      { success: false, error: "Employee lookup failed." },
      { status: 500 }
    );
  }

  if (!employee) {
    return NextResponse.json(
      { success: false, error: "Employee not found." },
      { status: 404 }
    );
  }

  const { error: updateError } = await supabaseAdmin
    .from("employees")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", employeeId)
    .eq("business_id", session.employee.business_id);

  if (updateError) {
    return NextResponse.json(
      { success: false, error: "Permission update failed." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    employeeId,
    role,
  });
}
