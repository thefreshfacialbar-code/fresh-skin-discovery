
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  researchId: string;
  status: string;
  initialProfessionalDescription?: string | null;
};

export default function ProductVendorResearchReview({
  researchId,
  status,
  initialProfessionalDescription,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
const [professionalDescription, setProfessionalDescription] =
  useState(initialProfessionalDescription ?? "");

const [rejectionReason, setRejectionReason] =
  useState("");
  async function review(nextStatus: "approved" | "rejected") {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/fresh-desk/product-vendor-review",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
         body: JSON.stringify({
  researchId,
  status: nextStatus,
  professionalDescription,
  ...(nextStatus === "rejected"
    ? { rejectionReason }
    : {}),
}),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to save review.");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save review."
      );
    } finally {
      setLoading(false);
    }
  }

  if (status !== "draft") {
    return (
      <p className="mt-4 text-sm text-[#77716D]">
        Manufacturer research has been {status}.
      </p>
    );
  }

  return (
    <div className="mt-6">
        <div className="mb-5">
  <label
    htmlFor="professional-description"
    className="mb-2 block text-sm font-semibold text-[#2F2A28]"
  >
    Professional Description (Optional)
  </label>

  <textarea
    id="professional-description"
    value={professionalDescription}
    onChange={(event) =>
      setProfessionalDescription(event.target.value)
    }
    maxLength={10000}
    rows={5}
    placeholder="Enter your professionally reviewed product description..."
    disabled={loading}
    className="w-full rounded-lg border border-[#C8BDB3] p-3 text-sm"
  />

  <p className="mt-1 text-xs text-[#77716D]">
    This description is stored separately from the original
    manufacturer description.
  </p>
</div>
<div className="mb-5">
  <label
    htmlFor="rejection-reason"
    className="mb-2 block text-sm font-semibold text-[#2F2A28]"
  >
    Rejection Reason (Required When Rejecting)
  </label>

  <textarea
    id="rejection-reason"
    value={rejectionReason}
    onChange={(event) =>
      setRejectionReason(event.target.value)
    }
    maxLength={2000}
    rows={3}
    placeholder="Explain why this manufacturer match should be rejected..."
    disabled={loading}
    className="w-full rounded-lg border border-[#C8BDB3] p-3 text-sm"
  />

  <p className="mt-1 text-xs text-[#77716D]">
    Required only when rejecting manufacturer research.
  </p>
</div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={loading}
          onClick={() => review("approved")}
          className="rounded-lg bg-[#2F2A28] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Saving..." : "Approve Research"}
        </button>

        <button
          type="button"
          disabled={loading}
          onClick={() => review("rejected")}
          className="rounded-lg border border-[#C8BDB3] px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          Reject Research
        </button>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}
