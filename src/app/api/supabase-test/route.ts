import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { count, error } = await supabaseAdmin
    .from("businesses")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Supabase connection test failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Supabase connection failed",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Fresh Skin Discovery is connected to Supabase.",
    businessCount: count ?? 0,
  });
}

