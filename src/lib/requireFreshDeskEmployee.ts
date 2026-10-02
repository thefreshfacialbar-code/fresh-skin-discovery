import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
export type FreshDeskEmployeeRole =
  | "owner_admin"
  | "professional";

export async function requireFreshDeskEmployee() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: employee, error } = await supabaseAdmin
    .from("employees")
    .select(
      "id, business_id, first_name, last_name, email, role, active"
    )
    .eq("id", user.id)
    .eq("active", true)
    .maybeSingle();

  if (error || !employee) {
    if (error) {
      console.error("Fresh Desk employee lookup failed:", error);
    }

    return null;
  }

  return {
    user,
    employee,
  };
}
export async function requireFreshDeskOwnerAdmin() {
  const employeeSession = await requireFreshDeskEmployee();

  if (!employeeSession) {
    return null;
  }

  if (
    employeeSession.employee.role !==
    ("owner_admin" satisfies FreshDeskEmployeeRole)
  ) {
    return null;
  }

  return employeeSession;
}