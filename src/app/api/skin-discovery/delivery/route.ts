import { NextResponse } from "next/server";
import { deliverSkinDiscoverySubmission } from "@/lib/email/deliverSkinDiscoverySubmission";
import { saveSkinDiscoverySubmission } from "@/lib/supabase/saveSkinDiscoverySubmission";
export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { submission?: unknown };
    if (!payload || typeof payload !== "object" || payload.submission === undefined) {
      return NextResponse.json(
        {
          ok: false,
          error: "submission payload is required",
        },
        { status: 400 },
      );
    }

   const persistence = await saveSkinDiscoverySubmission(
  payload.submission as never
);

if (!persistence.success) {
  console.error(
    "Skin Discovery completed, but Customer 360 persistence failed:",
    persistence.error
  );
}

const delivery = await deliverSkinDiscoverySubmission(payload.submission);

return NextResponse.json({
  ok: true,
  delivery,
  persistence,
});
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unexpected delivery error.";
console.error("Skin Discovery delivery route error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
