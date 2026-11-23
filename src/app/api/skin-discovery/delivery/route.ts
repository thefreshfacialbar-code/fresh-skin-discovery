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
    "Skin Discovery persistence failed:",
    persistence.error
  );

  return NextResponse.json(
    {
      ok: false,
      error: "Skin Discovery could not be saved. Email delivery was not attempted.",
      persistence,
    },
    { status: 500 }
  );
}

let delivery;

try {
  delivery = await deliverSkinDiscoverySubmission(
    payload.submission,
    {
      consultationId: persistence.consultationId,
      skinPlanId: persistence.skinPlanId,
    },
  );
} catch (error) {
  console.error(
    "Skin Discovery saved, but email delivery encountered an error:",
    error,
  );

  return NextResponse.json(
    {
      ok: false,
      persistence,
      delivery: null,
      error:
        "Skin Discovery was saved successfully, but email delivery could not be completed or verified.",
    },
    { status: 500 },
  );
}



if (!delivery.overallSuccess) {
  return NextResponse.json(
    {
      ok: false,
      persistence,
      delivery,
      error:
        "Skin Discovery was saved successfully, but email delivery was not fully completed.",
    },
    { status: 502 },
  );
}

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
