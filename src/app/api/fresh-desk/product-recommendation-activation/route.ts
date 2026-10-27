import { NextResponse } from "next/server";
import { requireFreshDeskOwnerAdmin } from "@/lib/requireFreshDeskEmployee";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXPERIENCES = new Set(["fresh-facial-bar-lash-lounge", "gentlemens-corner"]);

// Operational kill switches are deliberately independent of the approval draft.
// They never modify Shopify status or the published configuration.
export async function POST(request: Request) {
  const session = await requireFreshDeskOwnerAdmin();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });

  let payload: unknown;
  try { payload = await request.json(); }
  catch { return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 }); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }
  const { productId, enabled, experienceId } = payload as Record<string, unknown>;
  if (typeof productId !== "string" || !UUID.test(productId) || typeof enabled !== "boolean" ||
      (experienceId !== undefined && (typeof experienceId !== "string" || !EXPERIENCES.has(experienceId)))) {
    return NextResponse.json({ success: false, error: "Invalid activation request" }, { status: 400 });
  }
  const { data: product, error: productError } = await supabaseAdmin.from("products")
    .select("id, business_id").eq("id", productId).maybeSingle();
  if (productError || !product || product.business_id !== session.employee.business_id) {
    return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
  }
  if (experienceId === undefined) {
    const { data, error } = await supabaseAdmin.from("product_recommendation_profiles")
      .update({ recommendation_enabled: enabled }).eq("product_id", productId).select("id");
    if (error || !data || data.length !== 1) {
      return NextResponse.json({ success: false, error: "Could not update product activation" }, { status: 409 });
    }
  } else {
    // Do not create a new assignment or change its approval state.
    const { data, error } = await supabaseAdmin.from("product_experience_recommendations")
      .update({ enabled }).eq("product_id", productId).eq("experience_id", experienceId).select("id");
    if (error || !data || data.length !== 1) {
      return NextResponse.json({ success: false, error: "Experience assignment not found" }, { status: 409 });
    }
  }
  return NextResponse.json({ success: true, enabled });
}
