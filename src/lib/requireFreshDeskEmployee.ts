import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

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