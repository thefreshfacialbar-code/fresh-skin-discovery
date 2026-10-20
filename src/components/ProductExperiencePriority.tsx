
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ProductExperiencePriorityProps = {
  productId: string;
  experienceId: string;
  priority: number;
};

export default function ProductExperiencePriority({
  productId,
  experienceId,
  priority,
}: ProductExperiencePriorityProps) {
  const router = useRouter();

  const [selectedPriority, setSelectedPriority] =
    useState(priority);
  const [savedPriority, setSavedPriority] =
    useState(priority);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  async function savePriority() {
    setIsSaving(true);
    setSaveMessage("");

    try {
      const response = await fetch(
        "/api/fresh-desk/product-experience-priority",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productId,
            experienceId,
            priority: selectedPriority,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to save priority"
        );
      }

      setSavedPriority(selectedPriority);
      setSaveMessage("Priority saved successfully.");
      router.refresh();
    } catch (error) {
      setSaveMessage(
        error instanceof Error
          ? error.message
          : "Unable to save priority"
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-5 border-t border-[#E5DFD8] pt-5">
      <h3 className="text-sm font-semibold">
        Recommendation Priority
      </h3>

      <p className="mt-2 text-xs text-[#77716D]">
        Set how strongly this product should be prioritized
        within its assigned experience.
      </p>

      <select
        value={selectedPriority}
        onChange={(event) => {
          setSelectedPriority(Number(event.target.value));
          setSaveMessage("");
        }}
        disabled={isSaving}
        className="mt-3 w-full rounded-lg border border-[#D8D1CA] bg-white px-3 py-2 text-sm"
      >
        <option value={80}>80 — Lower Priority</option>
        <option value={100}>100 — Standard Priority</option>
        <option value={120}>120 — Preferred Priority</option>
      </select>

      <button
        type="button"
        onClick={savePriority}
        disabled={
          isSaving || selectedPriority === savedPriority
        }
        className="mt-3 rounded-lg bg-black px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isSaving ? "Saving..." : "Save Priority"}
      </button>

      {saveMessage && (
        <p className="mt-2 text-xs" role="status">
          {saveMessage}
        </p>
      )}
    </div>
  );
}
