
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
  const [lookupData, setLookupData] = useState<{
    success?: boolean;
    research?: {
      vendorProductName?: string;
      vendorDescription?: string;
      vendorProductUrl?: string;
      vendorName?: string;
    } | null;
    vendor?: {
      name?: string;
    };
  } | null>(null);
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

      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.includes("application/json")) {
        setResult(
          `Vendor lookup returned HTTP ${response.status} ` +
          `(${contentType || "unknown content type"}) instead of JSON.`
        );
        return;
      }

      const data = await response.json();

      setLookupData(response.ok && data.success ? data : null);

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

      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.includes("application/json")) {
        setResult(
          `Vendor lookup returned HTTP ${response.status} ` +
          `(${contentType || "unknown content type"}) instead of JSON.`
        );
        return;
      }

      const data = await response.json();

      setLookupData(response.ok && data.success ? data : null);

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
      {lookupData?.research && (
        <section className="mt-4 rounded-xl border bg-white p-5">
          <h3 className="text-lg font-semibold">
            Manufacturer Lookup Results
          </h3>
          <h4 className="mt-5 text-sm font-semibold">
            Manufacturer Description
          </h4>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
            {lookupData.research.vendorDescription
              ?.replace(/<[^>]*>/g, " ")
              .replace(/&amp;/g, "&")
              .trim() || "No manufacturer description available."}
          </p>
          <p className="mt-3 font-semibold">
            {lookupData.research.vendorProductName || "Unknown product"}
          </p>
          <p className="mt-1 text-sm text-[#77716D]">
            {lookupData.research.vendorName ||
              lookupData.vendor?.name ||
              "Unknown manufacturer"}
          </p>
          {lookupData.research.vendorProductUrl && (
            <a
              href={lookupData.research.vendorProductUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm font-semibold text-[#6F6578] underline"
            >
              View Manufacturer Product
            </a>
          )}
        </section>
      )}

      {result && (
        <details className="mt-3 rounded-lg border bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            Technical Details
          </summary>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-xs">
            {result}
          </pre>
        </details>
      )}
    </div>
  );
}
