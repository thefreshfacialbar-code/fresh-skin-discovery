
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PRODUCT_CATEGORY_OPTIONS,
  PRODUCT_JOURNEY_OPTIONS,
  PRODUCT_ROLE_OPTIONS,
  PRODUCT_INTENSITY_OPTIONS,
  PRODUCT_USAGE_OPTIONS,
  PRODUCT_SKIN_TYPE_OPTIONS,
  PRODUCT_SKIN_CONCERN_OPTIONS,
  PRODUCT_SKIN_BENEFIT_OPTIONS,
  PRODUCT_ROUTINE_STEP_OPTIONS,
  PRODUCT_TIMING_OPTIONS,
} from "@/lib/productResearchOptions";

type ManualResearchDraft = {
  research_source: string | null;
  research_status: string;
  vendor_category: string | null;
  vendor_description: string | null;
  key_ingredients: string | null;
  skin_benefits: string | null;
  suitable_skin_types: string | null;
  skin_concerns: string | null;
  application_instructions: string | null;
  usage_frequency: string | null;
  precautions: string | null;
  routine_step: string | null;
  internal_notes: string | null;
  vendor_product_url: string | null;
  primary_journey?: string | null;
  supporting_journey?: string | null;
  recommendation_role?: string | null;
  intensity?: number | null;
  skin_benefit_codes?: string[] | null;
  suitable_skin_type_codes?: string[] | null;
  skin_concern_codes?: string[] | null;
  application_timing?: string[] | null;
};

type Props = {
  productId: string;
  productName: string;
  existingResearch?: ManualResearchDraft | null;
};

const selectClass = "mt-1 w-full rounded-lg border p-3";
const labelClass = "block text-sm font-medium";

function MultiSelect({
    title,
    name,
    options,
    selected,
    required = false,
  }: {
    title: string;
    name: string;
    options: readonly { value: string; label: string }[];
    selected: string[];
    required?: boolean;
  }) {
     return (
    <fieldset className="rounded-lg border p-4">
      <legend className="px-2 text-sm font-medium">
        {title}{required ? " *" : ""}
      </legend>

      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-2 text-sm"
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={selected.includes(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
export default function ProductManualResearch({
  productId,
  productName,
  existingResearch = null,
}: Props) {
    const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const manualDraft =
    existingResearch?.research_source === "manual" &&
    existingResearch?.research_status === "draft"
      ? existingResearch
      : null;

  const canEditManualResearch =
    !existingResearch ||
    (existingResearch.research_source === "manual" &&
      existingResearch.research_status === "draft");

  const savedValue = (field: keyof ManualResearchDraft): string => {
    const value = manualDraft?.[field];
    return typeof value === "string" ? value : "";
  };

  const fields = [
    ["keyIngredients", "Key Ingredients", "key_ingredients", false],
    [
      "applicationInstructions",
      "Application Instructions",
      "application_instructions",
      true,
    ],
    ["precautions", "Precautions", "precautions", false],
    ["internalNotes", "Internal Notes", "internal_notes", false],
    ["productUrl", "Product URL (Optional)", "vendor_product_url", false],
  ] as const;

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const formData = new FormData(event.currentTarget);

    const payload: Record<string, string | string[]> = {};

    for (const [key, value] of formData.entries()) {
      if (
        key === "skinBenefitCodes" ||
        key === "suitableSkinTypeCodes" ||
        key === "skinConcernCodes" ||
        key === "applicationTiming"
      ) {
        continue;
      }

      payload[key] = String(value);
    }

    for (const key of [
      "skinBenefitCodes",
      "suitableSkinTypeCodes",
      "skinConcernCodes",
      "applicationTiming",
    ]) {
      payload[key] = formData.getAll(key).map(String);
    }

    try {
      const response = await fetch(
        "/api/fresh-desk/product-manual-research",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, ...payload }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Could not save manual research."
        );
      }

      setMessage("Manual product research saved as draft.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-[#E5DED6] bg-white p-6">
      <h2 className="text-xl font-semibold">
        Manual Product Research
      </h2>

      <p className="mt-2 text-sm text-[#77716D]">
        Enter product information manually for private-label products
        or products without a manufacturer website.
      </p>

      <p className="mt-4 text-sm font-medium">
        Product: {productName}
      </p>

      <p className="mt-1 text-xs text-[#77716D]">
        Product ID: {productId}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <div>
          <label htmlFor="manual-product-category" className={labelClass}>
            Product Category *
          </label>
          <select
            id="manual-product-category"
            name="productCategory"
            required
            defaultValue={savedValue("vendor_category")}
            className={selectClass}
          >
            <option value="">Select a category</option>
            {PRODUCT_CATEGORY_OPTIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>

        {[
          {
            name: "primaryJourney",
            label: "Primary Journey",
            saved: savedValue("primary_journey"),
          },
          {
            name: "supportingJourney",
            label: "Supporting Journey",
            saved: savedValue("supporting_journey"),
          },
        ].map((field) => (
          <div key={field.name}>
            <label htmlFor={field.name} className={labelClass}>
              {field.label}
            </label>
            <select
              id={field.name}
              name={field.name}
              defaultValue={field.saved}
              className={selectClass}
            >
              <option value="">Select journey</option>
              {PRODUCT_JOURNEY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value.charAt(0).toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
          </div>
        ))}

        <div>
          <label htmlFor="recommendationRole" className={labelClass}>
            Recommendation Role
          </label>
          <select
            id="recommendationRole"
            name="recommendationRole"
            defaultValue={savedValue("recommendation_role")}
            className={selectClass}
          >
            <option value="">Select role</option>
            {PRODUCT_ROLE_OPTIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="intensity" className={labelClass}>
            Product Intensity
          </label>
          <select
            id="intensity"
            name="intensity"
            defaultValue={manualDraft?.intensity?.toString() ?? ""}
            className={selectClass}
          >
            <option value="">Select intensity</option>
            {PRODUCT_INTENSITY_OPTIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="productDescription" className={labelClass}>
            Product Description *
          </label>
          <textarea
            id="productDescription"
            name="productDescription"
            required
            rows={4}
            defaultValue={savedValue("vendor_description")}
            className={selectClass}
          />
        </div>

        <MultiSelect
          title="Skin Benefits"
          name="skinBenefitCodes"
          options={PRODUCT_SKIN_BENEFIT_OPTIONS}
          selected={manualDraft?.skin_benefit_codes ?? []}
          required
        />

        <MultiSelect
          title="Suitable Skin Types"
          name="suitableSkinTypeCodes"
          options={PRODUCT_SKIN_TYPE_OPTIONS}
          selected={manualDraft?.suitable_skin_type_codes ?? []}
          required
        />

        <MultiSelect
          title="Skin Concerns"
          name="skinConcernCodes"
          options={PRODUCT_SKIN_CONCERN_OPTIONS}
          selected={manualDraft?.skin_concern_codes ?? []}
        />

        <div>
          <label htmlFor="usageFrequency" className={labelClass}>
            Usage Frequency *
          </label>
          <select
            id="usageFrequency"
            name="usageFrequency"
            required
            defaultValue={savedValue("usage_frequency")}
            className={selectClass}
          >
            <option value="">Select frequency</option>
            {PRODUCT_USAGE_OPTIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="routineStep" className={labelClass}>
            Routine Step *
          </label>
          <select
            id="routineStep"
            name="routineStep"
            required
            defaultValue={savedValue("routine_step")}
            className={selectClass}
          >
            <option value="">Select routine step</option>
            {PRODUCT_ROUTINE_STEP_OPTIONS.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>

        <MultiSelect
          title="Application Timing"
          name="applicationTiming"
          options={PRODUCT_TIMING_OPTIONS}
          selected={manualDraft?.application_timing ?? []}
        />

        {fields.map(([name, label, dbField, required]) => (
          <div key={name}>
            <label htmlFor={name} className={labelClass}>
              {label}{required ? " *" : ""}
            </label>
            <textarea
              id={name}
              name={name}
              required={required}
              rows={2}
              defaultValue={savedValue(dbField)}
              className={selectClass}
            />
          </div>
        ))}

        {message && (
          <p role="status" className="text-sm text-green-700">
            {message}
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        {!canEditManualResearch && (
          <p className="text-sm text-amber-700">
            Manual research cannot be saved because this product
            already has manufacturer, approved, or rejected research.
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !canEditManualResearch}
          className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save as Draft Research"}
        </button>
      </form>
    </section>
  );
}
