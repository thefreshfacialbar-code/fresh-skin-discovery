import { NextResponse } from "next/server";

import { requireFreshDeskOwnerAdmin } from "@/lib/requireFreshDeskEmployee";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
export async function POST(request: Request) {
  const employeeSession = await requireFreshDeskOwnerAdmin();

  if (!employeeSession) {
    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized.",
      },
      { status: 403 }
    );
  }
const body = await request.json();

const firstName =
  typeof body.firstName === "string" ? body.firstName.trim() : "";

const lastName =
  typeof body.lastName === "string" ? body.lastName.trim() : "";

const email =
  typeof body.email === "string"
    ? body.email.trim().toLowerCase()
    : "";

const role =
  body.role === "owner_admin" || body.role === "professional"
    ? body.role
    : null;

if (!firstName || !lastName || !email || !role) {
  return NextResponse.json(
    {
      success: false,
      error: "First name, last name, email, and role are required.",
    },
    { status: 400 }
  );
}
const { data: inviteData, error: inviteError } =
  await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: {
      first_name: firstName,
      last_name: lastName,
    },
  });

if (inviteError || !inviteData.user) {
  console.error("Fresh Desk employee invite failed:", inviteError);

  return NextResponse.json(
    {
      success: false,
      error:
        inviteError?.message ??
        "Employee invitation could not be created.",
    },
    { status: 400 }
  );
}
const { error: employeeError } = await supabaseAdmin
  .from("employees")
  .insert({
    id: inviteData.user.id,
    business_id: employeeSession.employee.business_id,
    first_name: firstName,
    last_name: lastName,
    email,
    role,
    active: true,
  });

if (employeeError) {
    await supabaseAdmin.auth.admin.deleteUser(inviteData.user.id);
  console.error(
    "Fresh Desk employee record creation failed:",
    employeeError
  );

  return NextResponse.json(
    {
      success: false,
      error: "Employee record could not be created.",
    },
    { status: 500 }
  );
}
return NextResponse.json({
  success: true,
  employee: {
    id: inviteData.user.id,
    firstName,
    lastName,
    email,
    role,
  },
});
}