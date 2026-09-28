import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const allowedStatuses = ["confirmed", "removed"] as const;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const productId = body.productId;
    const status = body.status;

    if (!productId || typeof productId !== "string") {
      return NextResponse.json(
        { success: false, error: "Skin Plan product ID is required." },
        { status: 400 }
      );
    }

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid review status." },
        { status: 400 }
      );
    }

    const reviewedAt = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("skin_plan_products")
      .update({
        status,
        reviewed_at: reviewedAt,
      })
      .eq("id", productId)
      .select("id, status, reviewed_at")
      .single();

    if (error) {
      console.error("Product review update failed:", error);

      return NextResponse.json(
        { success: false, error: "Could not update this product." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      product: data,
    });
  } catch (error) {
    console.error("Product review request failed:", error);

    return NextResponse.json(
      { success: false, error: "Could not update this product." },
      { status: 500 }
    );
  }
}