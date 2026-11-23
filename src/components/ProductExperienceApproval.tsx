"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ApprovalStatus = "pending" | "approved" | "rejected";

type ProductExperienceApprovalProps = {
  productId: string;
  experienceId: string;
  approvalStatus: ApprovalStatus;
};

export default function ProductExperienceApproval({
  productId,
  experienceId,
  approvalStatus,
}: ProductExperienceApprovalProps) {
    const router = useRouter();

const [savedStatus, setSavedStatus] =
  useState<ApprovalStatus>(approvalStatus);

const [isSaving, setIsSaving] = useState(false);
const [saveMessage, setSaveMessage] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<ApprovalStatus>(approvalStatus);
async function saveApproval() {
  setIsSaving(true);
  setSaveMessage("");

  try {
    const response = await fetch(
      "/api/fresh-desk/product-experience-approval",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          experienceId,
          approvalStatus: selectedStatus,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error || "Unable to save approval"
      );
    }

    setSavedStatus(selectedStatus);
    setSaveMessage("Approval saved successfully.");
    router.refresh();
  } catch (error) {
    setSaveMessage(
      error instanceof Error
        ? error.message
        : "Unable to save approval."
    );
  } finally {
    setIsSaving(false);
  }
}
  return (
    <div className="mt-5 border-t border-[#E5DFD8] pt-5">
      <h3 className="text-sm font-semibold">
        Professional Review
      </h3>

      <label className="mt-3 block text-sm text-[#77716D]">
        Approval Status
      </label>

      <select
        value={selectedStatus}
        onChange={(event) =>
          setSelectedStatus(event.target.value as ApprovalStatus)
        }
        className="mt-2 w-full rounded-lg border border-[#D8D1CA] bg-white px-3 py-2 text-sm"
      >
        <option value="pending">Pending Review</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      </select>

      <button
  type="button"
  onClick={saveApproval}
  disabled={isSaving || selectedStatus === savedStatus}
  className="mt-4 rounded-lg bg-[#6F6578] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
>
  {isSaving ? "Saving..." : "Save Approval"}
</button>

{saveMessage && (
  <p className="mt-2 text-sm text-[#77716D]">
    {saveMessage}
  </p>
)}
    </div>
  );
}