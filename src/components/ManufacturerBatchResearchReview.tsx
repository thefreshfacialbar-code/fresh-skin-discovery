
"use client";
import Link from "next/link";
import { useState } from "react";

type ManufacturerMatch = {
  manufacturerProductId: string;
  manufacturerName: string;
  manufacturerCategory: string | null;
  manufacturerUrl: string;
};

type ProductMatch = {
  productId: string;
  productName: string;
  matchStatus?: string;
  hasGiftSet?: boolean;
  exactMatches?: ManufacturerMatch[];
  potentialMatches?: ManufacturerMatch[];
  error?: string;
};

export default function ManufacturerBatchResearchReview() {
  const [products, setProducts] = useState<ProductMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
const [selectedPage, setSelectedPage] = useState(1);
  const [selectedMatches, setSelectedMatches] = useState<
  Record<string, string>
>({});
const [savingProductId, setSavingProductId] = useState<string | null>(
  null
);

const [saveMessages, setSaveMessages] = useState<
  Record<string, string>
>({});
  if (loading) {
    return <p className="mt-6">Loading manufacturer research...</p>;
  }

  if (error) {
    return <p className="mt-6 text-red-600">{error}</p>;
  }
async function loadResearch(page: number) {
  setLoading(true);
  setError(null);

  try {
    const response = await fetch(
  `/api/fresh-desk/product-vendor-batch-research?page=${page}`,
  { cache: "no-store" }
);

    if (!response.ok) {
  const errorData = await response.json().catch(() => null);

  if (response.status === 429) {
    throw new Error(
      errorData?.retryAfter
        ? `Manufacturer research is paused until ${new Date(
            errorData.retryAfter
          ).toLocaleString()}.`
        : errorData?.error ??
            "Manufacturer research is temporarily unavailable."
    );
  }

  throw new Error(
    errorData?.error ?? "Could not load manufacturer research."
  );
}

    const data = await response.json();

    if (!data.success || !Array.isArray(data.testMatches)) {
      throw new Error("Invalid manufacturer research response.");
    }

    setProducts(data.testMatches);
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Unexpected error."
    );
  } finally {
    setLoading(false);
  }
}
async function saveSelectedManufacturerDraft(
  productId: string
) {
  const manufacturerProductId = selectedMatches[productId];

  if (!manufacturerProductId) {
    setSaveMessages((previous) => ({
      ...previous,
      [productId]: "Select a manufacturer product first.",
    }));
    return;
  }

  if (savingProductId !== null) {
    return;
  }

  setSavingProductId(productId);

  setSaveMessages((previous) => ({
    ...previous,
    [productId]: "",
  }));

  try {
    const response = await fetch(
      "/api/fresh-desk/product-vendor-research",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          manufacturerProductId,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error || "Could not save manufacturer research."
      );
    }

    setSaveMessages((previous) => ({
      ...previous,
      [productId]:
        "Manufacturer research saved as draft. Professional review required.",
    }));
  } catch (error) {
    setSaveMessages((previous) => ({
      ...previous,
      [productId]:
        error instanceof Error
          ? error.message
          : "Could not save manufacturer research.",
    }));
  } finally {
    setSavingProductId(null);
  }
}
  return (
    <div className="mt-6 space-y-4">
        <div className="mb-4">
  <label
    htmlFor="research-page"
    className="mb-2 block text-sm font-medium text-gray-700"
  >
    Research batch
  </label>

  <select
    id="research-page"
    value={selectedPage}
    onChange={(event) =>
      setSelectedPage(Number(event.target.value))
    }
    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
  >
    {Array.from({ length: 14 }, (_, index) => (
      <option key={index + 1} value={index + 1}>
        Batch {index + 1}
      </option>
    ))}
  </select>
</div>
        <button
  type="button"
  onClick={() => loadResearch(selectedPage)}
  disabled={loading}
  className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
>
  {loading ? "Researching..." : `Run Research — Batch ${selectedPage}`}
</button>
      <p className="text-sm text-gray-600">
        {products.length} products loaded for review.
      </p>

      {products.map((product) => {
        const candidates = Array.from(
          new Map(
            [
              ...(product.exactMatches ?? []),
              ...(product.potentialMatches ?? []),
            ].map((match) => [match.manufacturerProductId, match])
          ).values()
        );

        return (
          <article
            key={product.productId}
            className="rounded-lg border p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
  <h3 className="font-semibold">
    {product.productName}
  </h3>

  <Link
    href={`/fresh-desk/skin-discovery-products/${product.productId}`}
    target="_blank"
    rel="noopener noreferrer"
    className="text-sm font-semibold text-[#6F6578] hover:underline"
  >
    Open Product ↗
  </Link>
</div>

            <p className="mt-1 text-sm">
              Match status: {product.matchStatus ?? "unavailable"}
            </p>

            {product.hasGiftSet && (
              <p className="mt-1 text-sm text-amber-700">
                Gift-set candidate detected — review required.
              </p>
            )}

            {product.error && (
              <p className="mt-2 text-sm text-red-600">
                {product.error}
              </p>
            )}

            <ul className="mt-3 space-y-2">
              {candidates.map((candidate) => (
                <li
                  key={candidate.manufacturerProductId}
                  className="text-sm"
                >
                    <input
  type="radio"
  name={`manufacturer-match-${product.productId}`}
  value={String(candidate.manufacturerProductId)}
  checked={
    selectedMatches[product.productId] ===
    String(candidate.manufacturerProductId)
  }
  onChange={() =>
    setSelectedMatches((previous) => ({
      ...previous,
      [product.productId]: String(candidate.manufacturerProductId),
    }))
  }
  className="mr-3"
/>
                  <a
                    href={candidate.manufacturerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-700 underline"
                  >
                    {candidate.manufacturerName}
                  </a>

                  <span className="ml-2 text-gray-500">
                    {candidate.manufacturerCategory ?? "Category unknown"}
                  </span>
                </li>
              ))}
                        </ul>

            {selectedMatches[product.productId] && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-800">
                  Selected manufacturer product
                </p>

                <p className="mt-1 text-sm text-gray-600">
                  Product ID: {selectedMatches[product.productId]}
                </p>

                <p className="mt-2 text-xs text-amber-700">
                  Selection only — not saved or approved.
                </p>
                <button
  type="button"
  disabled={savingProductId !== null}
  onClick={() =>
    saveSelectedManufacturerDraft(product.productId)
  }
  className="mt-3 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
>
  {savingProductId === product.productId
    ? "Saving Draft..."
    : "Save Draft"}
</button>

{saveMessages[product.productId] && (
  <p className="mt-2 text-sm text-gray-700" role="status">
    {saveMessages[product.productId]}
  </p>
)}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
