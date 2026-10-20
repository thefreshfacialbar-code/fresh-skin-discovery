
"use client";

import { useState } from "react";

export default function ProductVendorLookupTest({
  productId,
  researchStatus,
  manufacturerProductId,
}: {
  productId: string;
  researchStatus?: string | null;
  manufacturerProductId?: string | null;
}) {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function testLookup() {
    setLoading(true);
    setResult("");
console.log("Vendor Lookup Product ID:", productId);
    try {
      const response = await fetch(
        "/api/fresh-desk/product-vendor-research",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ productId }),
        }
      );

      const data = await response.json();

      setResult(
        JSON.stringify(
          { httpStatus: response.status, ...data },
          null,
          2
        )
      );
    } catch (error) {
      setResult(
        error instanceof Error
          ? error.message
          : "Vendor lookup failed."
      );
    } finally {
      setLoading(false);
    }
  }
  async function resubmitResearch() {
    if (
      researchStatus !== "rejected" ||
      !manufacturerProductId
    ) {
      setResult("Only rejected research can be resubmitted.");
      return;
    }

    if (
      !window.confirm(
        "Resubmit this manufacturer match for professional review?"
      )
    ) {
      return;
    }

    setLoading(true);
    setResult("");

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

      const data = await response.json();

      setResult(
        JSON.stringify(
          { httpStatus: response.status, ...data },
          null,
          2
        )
      );
    } catch (error) {
      setResult(
        error instanceof Error
          ? error.message
          : "Research resubmission failed."
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={testLookup}
        disabled={loading}
        className="rounded-lg bg-[#2F2A28] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {loading ? "Testing..." : "Test Vendor Lookup"}
      </button>
{researchStatus === "rejected" && manufacturerProductId && (
  <button
    type="button"
    onClick={resubmitResearch}
    disabled={loading}
    className="ml-3 rounded-lg border border-[#C8BDB3] px-4 py-2 text-sm font-semibold text-[#2F2A28] disabled:opacity-50"
  >
    {loading ? "Resubmitting..." : "Resubmit Research"}
  </button>
)}
      {result && (
        <pre className="mt-3 overflow-x-auto rounded-lg bg-white p-4 text-xs">
          {result}
        </pre>
      )}
    </div>
  );
}
