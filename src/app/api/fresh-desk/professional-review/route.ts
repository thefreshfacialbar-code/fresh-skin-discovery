import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const consultationId = body.consultationId;

    if (!consultationId || typeof consultationId !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "Consultation ID is required.",
        },
        { status: 400 }
      );
    }

    const reviewedAt = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from("consultations")
      .update({
        professional_review_status: "reviewed",
        professional_reviewed_at: reviewedAt,
      })
      .eq("id", consultationId)
      .select(
        "id, professional_review_status, professional_reviewed_at"
      )
      .single();

    if (error) {
      console.error("Professional review update failed:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Could not finalize the Skin Plan.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      consultation: data,
    });
  } catch (error) {
    console.error("Professional review request failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Could not finalize the Skin Plan.",
      },
      { status: 500 }
    );
  }
}