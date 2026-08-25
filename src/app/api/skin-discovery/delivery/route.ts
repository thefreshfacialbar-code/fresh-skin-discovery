import { NextResponse } from "next/server";
import { deliverSkinDiscoverySubmission } from "@/lib/email/deliverSkinDiscoverySubmission";

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

    const delivery = await deliverSkinDiscoverySubmission(payload.submission);
    return NextResponse.json({ ok: true, delivery });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unexpected delivery error.";

    return NextResponse.json(
      {
        ok: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}
