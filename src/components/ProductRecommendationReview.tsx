"use client";

import { useState } from "react";

type Props = {
  draftId: string;
  reviewStatus: string;
  researchStatus: string | null;
};

export default function ProductRecommendationReview({
  draftId,
  reviewStatus,
  researchStatus,
}: Props) {
  const researchApproved = researchStatus === "approved";
  const [reviewNotes, setReviewNotes] = useState("");
const [reviewing, setReviewing] = useState(false);
const [reviewError, setReviewError] = useState("");
const [reviewSuccess, setReviewSuccess] = useState("");
async function handleReject() {
  if (reviewStatus !== "pending_review") {
    return;
  }

  if (!reviewNotes.trim()) {
    setReviewError("Please enter a reason for rejecting this draft.");
    return;
  }

  const confirmed = window.confirm(
    "Reject this recommendation draft? The live recommendation profile will remain unchanged."
  );

  if (!confirmed) {
    return;
  }

  setReviewing(true);
  setReviewError("");
  setReviewSuccess("");

  try {
    const response = await fetch(
      "/api/fresh-desk/product-recommendation-review",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draftId,
          decision: "rejected",
          reviewNotes: reviewNotes.trim(),
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error ?? "Unable to reject recommendation draft."
      );
    }

    setReviewSuccess(
      "Recommendation draft rejected. Live settings remain unchanged."
    );

    window.location.reload();
  } catch (error) {
    setReviewError(
      error instanceof Error
        ? error.message
        : "Unable to reject recommendation draft."
    );
  } finally {
    setReviewing(false);
  }
}
async function handleApprove() {
  if (reviewStatus !== "pending_review" || reviewing) {
    return;
  }

  const confirmed = window.confirm(
    "Approve this recommendation draft? Approval will not publish changes to the live recommendation profile."
  );

  if (!confirmed) {
    return;
  }

  setReviewing(true);
  setReviewError("");
  setReviewSuccess("");

  try {
    const response = await fetch(
      "/api/fresh-desk/product-recommendation-review",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draftId,
          decision: "approved",
          reviewNotes: reviewNotes.trim(),
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error ?? "Unable to approve recommendation draft."
      );
    }

    setReviewSuccess(
      "Recommendation draft approved. Live settings remain unchanged."
    );

    window.location.reload();
  } catch (error) {
    setReviewError(
      error instanceof Error
        ? error.message
        : "Unable to approve recommendation draft."
    );
  } finally {
    setReviewing(false);
  }
}
async function handlePublish() {
  if (reviewStatus !== "approved" || reviewing) {
    return;
  }

  const confirmed = window.confirm(
    "Publish these approved recommendation settings to the live product profile? This will affect future Skin Discovery recommendations."
  );

  if (!confirmed) {
    return;
  }

  setReviewing(true);
  setReviewError("");
  setReviewSuccess("");

  try {
    const response = await fetch(
      "/api/fresh-desk/product-recommendation-publish",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ draftId }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error ?? "Unable to publish recommendation settings."
      );
    }

    setReviewSuccess(
      "Approved recommendation settings published successfully."
    );

    window.location.reload();
  } catch (error) {
    setReviewError(
      error instanceof Error
        ? error.message
        : "Unable to publish recommendation settings."
    );
  } finally {
    setReviewing(false);
  }
}
  return (
    <div className="mt-6 rounded-xl border border-[#E5DFD8] bg-white p-5">
      <h3 className="text-lg font-semibold text-[#302C2A]">
        Professional Review
      </h3>

      <p className="mt-2 text-sm text-[#77716D]">
        Review proposed recommendation settings before approving
        or rejecting the draft.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase text-[#77716D]">
            Recommendation Status
          </p>
          <p className="mt-1 text-sm font-medium text-[#302C2A]">
            {reviewStatus.replaceAll("_", " ")}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase text-[#77716D]">
            Manufacturer Research
          </p>
          <p className="mt-1 text-sm font-medium text-[#302C2A]">
            {researchStatus ?? "Not available"}
          </p>
        </div>
      </div>

      {!researchApproved && (
        <p className="mt-4 rounded-lg bg-[#FFF3E5] p-3 text-sm text-[#80521D]">
          Manufacturer research must be approved before this
          recommendation draft can be approved.
        </p>
      )}
<div className="mt-5">
  <label
    htmlFor="recommendation-review-notes"
    className="block text-sm font-medium text-[#302C2A]"
  >
    Review Notes
  </label>

  <textarea
    id="recommendation-review-notes"
    value={reviewNotes}
    onChange={(e) => setReviewNotes(e.target.value)}
    rows={4}
    placeholder="Enter professional review notes..."
    className="mt-2 w-full rounded-lg border border-[#E5DFD8] bg-white px-3 py-2 text-sm text-[#302C2A]"
  />

  <p className="mt-1 text-xs text-[#77716D]">
    Review notes are required when rejecting a recommendation draft.
  </p>
</div>
{reviewStatus === "pending_review" && (
  <div className="mt-4">
    <button
      type="button"
      onClick={handleReject}
      disabled={reviewing || !reviewNotes.trim()}
      className="rounded-lg border border-red-700 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {reviewing ? "Processing..." : "Reject Draft"}
    </button>
    <button
  type="button"
  onClick={handleApprove}
  disabled={reviewing}
  className="ml-3 rounded-lg bg-[#302C2A] px-4 py-2 text-sm font-medium text-white hover:bg-[#4A4440] disabled:cursor-not-allowed disabled:opacity-40"
>
  {reviewing ? "Processing..." : "Approve Draft"}
</button>
  </div>
)}
{reviewStatus === "approved" && (
  <div className="mt-4">
    <button
      type="button"
      onClick={handlePublish}
      disabled={reviewing}
      className="rounded-lg bg-[#6F6578] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5D5366] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {reviewing
        ? "Publishing..."
        : "Publish Approved Recommendation"}
    </button>
  </div>
)}
{reviewError && (
  <p className="mt-3 text-sm text-red-700">
    {reviewError}
  </p>
)}

{reviewSuccess && (
  <p className="mt-3 text-sm text-green-700">
    {reviewSuccess}
  </p>
)}
      <p className="mt-4 text-xs text-[#77716D]">
        Draft reference: {draftId}
      </p>
    </div>
  );
}