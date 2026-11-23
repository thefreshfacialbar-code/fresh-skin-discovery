"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ProfessionalReviewActionsProps = {
  consultationId: string;
  readyToFinalize?: boolean;
  initialReviewNote?: string | null;
};

export default function ProfessionalReviewActions({
  consultationId,
  readyToFinalize = false,
  initialReviewNote = null,
}: ProfessionalReviewActionsProps) {
  const router = useRouter();
const [reviewNote, setReviewNote] = useState(
  initialReviewNote ?? ""
);
  const [isReviewing, setIsReviewing] = useState(readyToFinalize);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function finalizeSkinPlan() {
    setIsFinalizing(true);
    setError(null);

    try {
      const response = await fetch("/api/fresh-desk/professional-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
       body: JSON.stringify({
  consultationId,
  professionalReviewNote: reviewNote.trim() || null,
}),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ?? "Could not finalize the Skin Plan."
        );
      }

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not finalize the Skin Plan."
      );

      setIsFinalizing(false);
    }
  }

  if (isReviewing) {
    return (
      <div className="mt-5 rounded-xl border border-[#DAD6DB] bg-white p-4">
        <p className="font-semibold">Skin Plan Review</p>

        <p className="mt-1 text-sm leading-6 text-[#5A5553]">
          Review the recommended products and personalization suggestions below.
          Finalizing confirms that this Skin Plan has been professionally reviewed.
        </p>
<div className="mt-5">
  <label
    htmlFor="professional-review-note"
    className="text-xs font-semibold uppercase tracking-[0.16em] text-[#908A9B]"
  >
    Professional Review Notes
  </label>

  <textarea
    id="professional-review-note"
    value={reviewNote}
    onChange={(event) => setReviewNote(event.target.value)}
    rows={5}
    placeholder="Add personalized observations, adjustments, follow-up guidance, or other notes for this Skin Plan..."
    className="mt-2 w-full rounded-xl border border-[#DAD6DB] bg-[#FFFDFC] px-4 py-3 text-sm leading-6 text-[#2F2A28] outline-none focus:border-[#908A9B]"
  />
</div>
        {error && (
          <p className="mt-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={finalizeSkinPlan}
            disabled={isFinalizing}
            className="rounded-full bg-[#2F2A28] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isFinalizing ? "Finalizing..." : "Finalize Skin Plan"}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsReviewing(false);
              setError(null);
            }}
            disabled={isFinalizing}
            className="px-2 py-2.5 text-sm font-semibold text-[#5A5553] hover:text-[#2F2A28] disabled:opacity-50"
          >
            Cancel Review
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsReviewing(true)}
      className="mt-4 rounded-full bg-[#2F2A28] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
    >
      Review Skin Plan
    </button>
  );
}