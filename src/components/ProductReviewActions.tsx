"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";


type ProductReviewActionsProps = {
  productId: string;
  status: string;
  productCatalogId: string | null;
  routineStep: string | null;
};

export default function ProductReviewActions({
  productId,
  status,
  productCatalogId,
  routineStep,
}: ProductReviewActionsProps) {
  const router = useRouter();

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
const [isReplacing, setIsReplacing] = useState(false);
const [replacementProducts, setReplacementProducts] = useState<
  Array<{
    id: string;
    name: string;
    category: string;
    role: string;
    experienceIds?: string[];
  }>
>([]);
async function openReplacementPicker() {
  if (isReplacing) {
    setIsReplacing(false);
    return;
  }

  setIsReplacing(true);

  if (replacementProducts.length > 0) {
    return;
  }

  setIsLoadingReplacements(true);
  setError(null);

  try {
    const response = await fetch("/api/product-catalog", {
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok || !result.success || !Array.isArray(result.products)) {
      throw new Error("Could not load replacement products.");
    }

    const validReplacements = result.products.filter(
  (product: {
    id: string;
    name: string;
    category: string;
    role: string;
    experienceIds?: string[];
  }) => {
    const isDifferentProduct = product.id !== productCatalogId;

    const categoriesByRoutineStep: Record<string, string[]> = {
  cleanse: ["Cleanser", "Tonic"],
  treat: [
    "Serum & Treatment",
    "Mask",
    "Exfoliant",
    "Eye Care",
    "Neck & Décolleté",
  ],
  moisturize: ["Moisturizer"],
  protect: ["Sun Protection"],
};

const matchesRoutineStep =
  !!routineStep &&
  (categoriesByRoutineStep[routineStep.toLowerCase()] ?? []).includes(
    product.category
  );

    const matchesExperience =
      !product.experienceIds ||
      product.experienceIds.length === 0 ||
      product.experienceIds.includes("fresh-facial-bar-lash-lounge");

    return (
      isDifferentProduct &&
      matchesRoutineStep &&
      matchesExperience
    );
  }
);

setReplacementProducts(validReplacements);
  } catch (error) {
    setError(
      error instanceof Error
        ? error.message
        : "Could not load replacement products."
    );
  } finally {
    setIsLoadingReplacements(false);
  }
}
const [isLoadingReplacements, setIsLoadingReplacements] = useState(false);
async function replaceProduct(replacementFreshProductId: string) {
  setIsSaving(true);
  setError(null);

  try {
    const response = await fetch(
      "/api/fresh-desk/product-replacement",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          skinPlanProductId: productId,
          replacementFreshProductId,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error ?? "Could not replace this product."
      );
    }

    setIsReplacing(false);
    router.refresh();
  } catch (error) {
    setError(
      error instanceof Error
        ? error.message
        : "Could not replace this product."
    );

    setIsSaving(false);
  }
}
  async function updateStatus(nextStatus: "confirmed" | "removed") {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/fresh-desk/product-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          status: nextStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "Could not update this product.");
      }

      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not update this product."
      );

      setIsSaving(false);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => updateStatus("confirmed")}
          className="rounded-full border border-[#2F2A28] px-4 py-2 text-sm font-semibold text-[#2F2A28] disabled:opacity-50"
        >
          {status === "confirmed" ? "Kept ✓" : "Keep"}
        </button>

        <button
          type="button"
          disabled={isSaving}
          onClick={() => updateStatus("removed")}
          className="px-2 py-2 text-sm font-semibold text-[#5A5553] disabled:opacity-50"
        >
          {status === "removed" ? "Removed ✓" : "Remove"}
        </button>
        <button
  type="button"
  disabled={isSaving || !productCatalogId || !routineStep}
  onClick={openReplacementPicker}   
  className="px-2 py-2 text-sm font-semibold text-[#5A5553] disabled:opacity-50"
>
  Replace
</button>
      </div>
{isReplacing && (
  <div className="mt-3 rounded-xl border border-[#DAD6DB] bg-white p-4">
    <p className="font-semibold">Choose a Replacement</p>

    {isLoadingReplacements ? (
      <p className="mt-2 text-sm text-[#5A5553]">
        Loading replacement products...
      </p>
    ) : replacementProducts.length > 0 ? (
      <div className="mt-3 space-y-3">
        {replacementProducts.map((product) => (
          <div
            key={product.id}
            className="rounded-lg border border-[#E8E4E7] p-3"
          >
            <p className="font-semibold">
              {product.name}
            </p>

            <p className="mt-1 text-sm text-[#5A5553]">
              {product.category}
            </p>
            <button
  type="button"
  disabled={isSaving}
  onClick={() => replaceProduct(product.id)}
  className="mt-3 rounded-full border border-[#2F2A28] px-4 py-2 text-sm font-semibold text-[#2F2A28] disabled:opacity-50"
>
  {isSaving ? "Saving..." : "Select Replacement"}
</button>
          </div>
        ))}
      </div>
    ) : (
      <p className="mt-2 text-sm text-[#5A5553]">
        No suitable replacement products found.
      </p>
    )}
  </div>
)}
      {error && (
        <p className="mt-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}