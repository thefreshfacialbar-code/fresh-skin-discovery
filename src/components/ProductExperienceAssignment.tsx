"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ProductExperienceAssignmentProps = {
  productId: string;
  experienceId: string;
  experienceName: string;
  assigned: boolean;
};

export default function ProductExperienceAssignment({
  productId,
  experienceId,
  experienceName,
  assigned,
}: ProductExperienceAssignmentProps) {
    const router = useRouter();
  const [isAssigned, setIsAssigned] = useState(assigned);
  const [savedAssigned, setSavedAssigned] = useState(assigned);
const [isSaving, setIsSaving] = useState(false);
const [saveMessage, setSaveMessage] = useState("");

async function saveAssignment() {
  setIsSaving(true);
  setSaveMessage("");

  try {
    const response = await fetch(
      "/api/fresh-desk/product-experience-assignment",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          experienceId,
          assigned: isAssigned,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Unable to save assignment");
    }

   setSavedAssigned(isAssigned);
setSaveMessage("Assignment saved successfully.");
router.refresh();
  } catch (error) {
    setSaveMessage(
      error instanceof Error
        ? error.message
        : "Unable to save assignment."
    );
  } finally {
    setIsSaving(false);
  }
}
  return (
    <div className="mt-4">
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={isAssigned}
          onChange={(event) => setIsAssigned(event.target.checked)}
          className="h-4 w-4"
        />

        <span>
          Assign to {experienceName}
        </span>
      </label>

      <p className="mt-2 text-xs text-[#77716D]">
        {isAssigned
          ? "Selected for this experience"
          : "Not selected for this experience"}
      </p>

      <button
  type="button"
  onClick={saveAssignment}
  disabled={isSaving || isAssigned === savedAssigned}
  className="mt-4 rounded-lg bg-[#6F6578] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
>
  {isSaving ? "Saving..." : "Save Assignment"}
</button>

{saveMessage && (
  <p className="mt-2 text-sm text-[#77716D]">
    {saveMessage}
  </p>
)}
    </div>
  );
}