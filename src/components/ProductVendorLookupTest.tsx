
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
    manufacturerSearchResults?: {
  manufacturerProductId: string;
  manufacturerName: string;
  manufacturerHandle: string;
  manufacturerBrand: string;
  manufacturerUrl: string;
}[] | null;
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
  const [
  selectedManufacturerProductId,
  setSelectedManufacturerProductId,
] = useState<string>("");

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
  async function saveSelectedManufacturer() {
  if (!selectedManufacturerProductId) {
    setResult("Please select a manufacturer product.");
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
          manufacturerProductId: selectedManufacturerProductId,
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

    if (response.ok && data.success) {
      setLookupData(data);
      if (data.research) {
        window.dispatchEvent(new CustomEvent("freshdesk:stage-manufacturer-research", {
          detail: {
            productId,
            research: {
              research_source: "manufacturer_website",
              vendor_product_name: data.research.vendorProductName ?? null,
              vendor_product_id: selectedManufacturerProductId,
              vendor_product_url: data.research.vendorProductUrl ?? null,
              vendor_category: data.research.vendorCategory ?? null,
              vendor_description: data.research.vendorDescription ?? null,
            },
          },
        }));
        setResult("Manufacturer research staged. Scroll down and select Save Draft to save it with the complete product configuration.");
      }
    }
  } catch (error) {
    setResult(
      error instanceof Error
        ? error.message
        : "Could not retrieve manufacturer research."
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
{lookupData?.manufacturerSearchResults &&
  lookupData.manufacturerSearchResults.length > 0 && (
    <section className="mt-4 rounded-xl border bg-white p-5">
      <h3 className="text-lg font-semibold">
        Select Manufacturer Product
      </h3>

      <p className="mt-2 text-sm text-[#77716D]">
        Select the verified manufacturer product that matches
        your Skin Discovery product.
      </p>

      <select
        value={selectedManufacturerProductId}
        onChange={(event) =>
          setSelectedManufacturerProductId(event.target.value)
        }
        className="mt-4 w-full rounded-lg border border-[#C8BDB3] px-3 py-2 text-sm"
      >
        <option value="">
          Choose a manufacturer product
        </option>

        {lookupData.manufacturerSearchResults.map((product) => (
          <option
            key={product.manufacturerProductId}
            value={product.manufacturerProductId}
          >
            {product.manufacturerName} — {product.manufacturerBrand}
          </option>
        ))}
      </select>
<button
  type="button"
  onClick={saveSelectedManufacturer}
  disabled={loading || !selectedManufacturerProductId}
  className="mt-4 rounded-lg bg-[#2F2A28] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
>
  {loading ? "Looking up..." : "Stage in Product Draft"}
</button>
      {selectedManufacturerProductId && (
        <p className="mt-3 text-sm text-[#77716D]">
          Selected manufacturer product ID:{" "}
          {selectedManufacturerProductId}
        </p>
      )}
    </section>
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
