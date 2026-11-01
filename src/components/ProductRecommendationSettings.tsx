
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PRODUCT_CATEGORY_OPTIONS,
  PRODUCT_JOURNEY_OPTIONS,
  PRODUCT_ROLE_OPTIONS,
  PRODUCT_INTENSITY_OPTIONS,
  PRODUCT_SKIN_BENEFIT_OPTIONS,
  PRODUCT_SKIN_TYPE_OPTIONS,
  PRODUCT_SKIN_CONCERN_OPTIONS,
  PRODUCT_TIMING_OPTIONS,
} from "@/lib/productResearchOptions";
import type {
  ProductEligibilityRules,
} from "@/lib/productEligibilityPolicies";
import {
  isProductEligibilityRules,
  type ProductEligibilityPolicy,
} from "@/lib/productEligibilityPolicies";

type RecommendationProfile = {
  id: string;
  customer_guidance: string | null;
  product_category: string | null;
  primary_journey: string | null;
  supporting_journey: string | null;
  recommendation_role: string | null;
  intensity: number | null;
  eligibility_rules: ProductEligibilityRules | null;
  featured_eligible: boolean;
};

type ResearchSettings = Record<string, string | number | string[] | null>;

type RecommendationDraft = {
  id: string;
  review_status: string;
  proposed_settings: Partial<{
  customer_guidance: string | null;
  product_category: string | null;
    primary_journey: string | null;
    supporting_journey: string | null;
    recommendation_role: string | null;
    intensity: number | null;
    eligibility_rules: ProductEligibilityRules | null;
    featured_eligible: boolean;
    experience_assignments: ExperienceAssignment[];
    manufacturer_research: ResearchSettings;
  }>;
};

type ExperienceAssignment = {
  experience_id: string;
  assigned: boolean;
  recommendation_priority: number;
};

const EXPERIENCE_OPTIONS = [
  { id: "fresh-facial-bar-lash-lounge", name: "Fresh Facial Bar & Lash Lounge" },
  { id: "gentlemens-corner", name: "Gentlemen's Corner" },
] as const;

type Props = {
  experienceAssignments: ExperienceAssignment[];
  manufacturerResearch?: ResearchSettings | null;
  productId: string;
  profile: RecommendationProfile;
  draft?: RecommendationDraft | null;
};

export default function ProductRecommendationSettings({
  productId,
  profile,
  draft,
  experienceAssignments,
  manufacturerResearch,
}: Props) {
  const isExistingDraft = draft?.review_status === "draft";
  const isPendingReview = draft?.review_status === "pending_review";
const isApproved = draft?.review_status === "approved";
const isReadOnly = isPendingReview || isApproved;
const [customerGuidance, setCustomerGuidance] = useState(
  draft?.proposed_settings.customer_guidance ??
    profile.customer_guidance ??
    ""
);
  const [category, setCategory] = useState(
  draft?.proposed_settings.product_category ??
    profile.product_category ??
    ""
);

const [primaryJourney, setPrimaryJourney] = useState(
  draft?.proposed_settings.primary_journey ??
    profile.primary_journey ??
    ""
);

const [supportingJourney, setSupportingJourney] = useState(
  draft?.proposed_settings.supporting_journey ??
    profile.supporting_journey ??
    ""
);

const [role, setRole] = useState(
  draft?.proposed_settings.recommendation_role ??
    profile.recommendation_role ??
    ""
);

const [intensity, setIntensity] = useState(
  String(
    draft?.proposed_settings.intensity ??
      profile.intensity ??
      1
  )
);
const initialEligibilityRules =
  draft?.proposed_settings?.eligibility_rules ??
  profile.eligibility_rules;

const [eligibilityPolicy, setEligibilityPolicy] =
  useState<ProductEligibilityPolicy>(
    isProductEligibilityRules(initialEligibilityRules)
      ? initialEligibilityRules.policy
      : "none"
  );
  const [featuredEligible, setFeaturedEligible] = useState<boolean>(
  draft?.proposed_settings?.featured_eligible ??
    profile.featured_eligible
);
const [assignments, setAssignments] = useState<ExperienceAssignment[]>(() => {
  const draftAssignments = draft?.proposed_settings.experience_assignments;
  const source = Array.isArray(draftAssignments) ? draftAssignments : experienceAssignments;
  return EXPERIENCE_OPTIONS.map((experience) => {
    const existing = source.find((item) => item.experience_id === experience.id);
    return {
      experience_id: experience.id,
      assigned: existing?.assigned ?? false,
      recommendation_priority: existing?.recommendation_priority ?? 100,
    };
  });
});

const [research, setResearch] = useState<ResearchSettings>(() => ({
  ...(manufacturerResearch ?? {}),
  ...(draft?.proposed_settings.manufacturer_research ?? {}),
}));
useEffect(() => {
  function stageManufacturerResearch(event: Event) {
    const detail = (event as CustomEvent<{ productId: string; research: ResearchSettings }>).detail;
    if (detail?.productId !== productId || !detail.research || isReadOnly) return;
    setResearch((current) => ({ ...current, ...detail.research }));
  }
  window.addEventListener("freshdesk:stage-manufacturer-research", stageManufacturerResearch);
  return () => window.removeEventListener("freshdesk:stage-manufacturer-research", stageManufacturerResearch);
}, [productId, isReadOnly]);

function updateResearch(field: string, value: string | string[]) {
  setResearch((current) => ({ ...current, [field]: value }));
}

function updateAssignment(experienceId: string, patch: Partial<ExperienceAssignment>) {
  setAssignments((current) => current.map((item) =>
    item.experience_id === experienceId ? { ...item, ...patch } : item
  ));
}
const router = useRouter();
const [saving, setSaving] = useState(false);
const [saveError, setSaveError] = useState("");
const [saveSuccess, setSaveSuccess] = useState("");

async function handleSave() {
  setSaving(true);
  setSaveError("");
  setSaveSuccess("");

  try {

    const response = await fetch(
      "/api/fresh-desk/product-recommendation-draft",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          customerGuidance,
          profileId: profile.id,
          productCategory: category,
          primaryJourney,
          supportingJourney,
          recommendationRole: role,
          intensity: Number(intensity),
          featuredEligible,
          experienceAssignments: assignments,
          manufacturerResearch: research,
           eligibilityRules: {
    version: 1,
    policy: eligibilityPolicy,
  },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error ?? "Unable to save recommendation settings."
      );
    }

   setSaveSuccess(
  isExistingDraft
    ? "Recommendation draft updated successfully. Live settings remain unchanged."
    : "Recommendation draft created successfully. Live settings remain unchanged."
);
    router.refresh();
  } catch (error) {
    setSaveError(
      error instanceof Error ? error.message : "Unable to save."
    );
    } finally {
    setSaving(false);
  }
}

async function handleSubmitForReview() {
  if (!draft || draft.review_status !== "draft") {
    return;
  }

  const confirmed = window.confirm(
    "Submit this recommendation draft for review? You will not be able to edit it while review is pending."
  );

  if (!confirmed) {
    return;
  }

  setSaving(true);
  setSaveError("");
  setSaveSuccess("");

  try {
    const response = await fetch(
      "/api/fresh-desk/product-recommendation-submit",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draftId: draft.id,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error ?? "Unable to submit recommendation draft."
      );
    }

    setSaveSuccess(
      "Recommendation draft submitted for review. Live settings remain unchanged."
    );

    router.refresh();
  } catch (error) {
    setSaveError(
      error instanceof Error
        ? error.message
        : "Unable to submit recommendation draft."
    );
  } finally {
    setSaving(false);
  }
}

  const selectClass =
    "mt-1 w-full rounded-lg border border-[#E5DFD8] bg-white px-3 py-2 text-sm";

  return (
    <div className="mt-6 rounded-xl border border-[#E5DFD8] bg-[#FAF9F7] p-5">
      <h3 className="text-lg font-semibold text-[#302C2A]">
        Edit Recommendation Settings
      </h3>

      <p className="mt-2 text-sm text-[#77716D]">
        Configure how this product participates in Skin Discovery
        recommendations.
      </p>

      <section className="mt-5 rounded-lg border border-[#E5DFD8] bg-white p-4">
        <h4 className="font-semibold">Manufacturer Research — Unified Draft</h4>
        <p className="mt-1 text-sm text-[#77716D]">Edit research alongside Fresh Method and experience settings. All changes are reviewed and published together.</p>
        <label className="mt-4 block text-sm font-medium">
          Research Source
          <select className="mt-1 w-full rounded-lg border p-2" disabled={isReadOnly}
            value={research.research_source === "manual" ? "manual" : "manufacturer_website"}
            onChange={(e) => updateResearch("research_source", e.target.value)}>
            <option value="manufacturer_website">Manufacturer website / lookup</option>
            <option value="manual">Manual entry / private label</option>
          </select>
        </label>
        <p className="mt-2 text-xs text-[#77716D]">Manual entries are staged here and saved only when you select Save Draft. No separate research approval is needed.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {([
            ["skin_benefit_codes", "Skin Benefit Codes", PRODUCT_SKIN_BENEFIT_OPTIONS],
            ["suitable_skin_type_codes", "Suitable Skin Types", PRODUCT_SKIN_TYPE_OPTIONS],
            ["skin_concern_codes", "Skin Concerns", PRODUCT_SKIN_CONCERN_OPTIONS],
            ["application_timing", "Application Timing", PRODUCT_TIMING_OPTIONS],
          ] as const).map(([key, label, options]) => (
            <fieldset key={key} className="rounded-lg border p-3" disabled={isReadOnly}>
              <legend className="px-1 text-sm font-medium">{label}</legend>
              <div className="grid gap-2">
                {options.map((option) => {
                  const selected = Array.isArray(research[key]) ? research[key] as string[] : [];
                  const value = typeof option === "string" ? option : option.value;
                  const text = typeof option === "string" ? option : option.label;
                  return <label key={value} className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={selected.includes(value)} onChange={(e) =>
                      updateResearch(key, e.target.checked ? [...selected, value] : selected.filter((v) => v !== value))} />
                    {text}
                  </label>;
                })}
              </div>
            </fieldset>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {([
            ["vendor_product_name", "Manufacturer Product Name"],
            ["vendor_product_url", "Manufacturer Source URL"],
            ["vendor_category", "Manufacturer Category"],
            ["vendor_description", "Manufacturer Description"],
            ["professional_description", "Professional Description"],
            ["key_ingredients", "Key Ingredients"],
            ["skin_benefits", "Skin Benefits"],
            ["suitable_skin_types", "Suitable Skin Types"],
            ["skin_concerns", "Skin Concerns"],
            ["application_instructions", "Application Instructions"],
            ["usage_frequency", "Usage Frequency"],
            ["precautions", "Precautions"],
            ["routine_step", "Routine Step"],
            ["internal_notes", "Internal Notes"],
          ] as const).map(([key, label]) => (
            <label key={key} className="text-sm">
              {label}
              <textarea
                className="mt-1 w-full rounded-lg border border-[#E5DFD8] p-2"
                rows={key.includes("description") || key === "application_instructions" ? 3 : 2}
                disabled={isReadOnly}
                value={typeof research[key] === "string" ? research[key] as string : ""}
                onChange={(e) => updateResearch(key, e.target.value)}
              />
            </label>
          ))}
        </div>
      </section>
            <div className="mt-5 rounded-lg border border-[#E5DFD8] bg-white p-4">
        <label
          htmlFor="customer-guidance"
          className="block text-sm font-semibold text-[#302C2A]"
        >
          Customer Guidance
        </label>

        <p className="mt-1 text-xs text-[#77716D]">
          Describe the product's benefits and how it supports the
          customer's skincare routine. This guidance appears in
          Skin Discovery recommendations.
        </p>

        <textarea
          id="customer-guidance"
          className="mt-3 w-full rounded-lg border border-[#E5DFD8] p-3 text-sm"
          rows={4}
          maxLength={2000}
            required
          disabled={isReadOnly}
          value={customerGuidance}
          onChange={(e) => setCustomerGuidance(e.target.value)}
          placeholder="Example: Helps replenish moisture and support a smoother, more comfortable complexion."
        />
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Product Category
          <select
            className={selectClass}
            disabled={isReadOnly}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select category</option>
            {PRODUCT_CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          Primary Journey
          <select
            className={selectClass}
            disabled={isReadOnly}
            value={primaryJourney}
            onChange={(e) => setPrimaryJourney(e.target.value)}
          >
            <option value="">Select journey</option>
            {PRODUCT_JOURNEY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          Supporting Journey
          <select
            className={selectClass}
            disabled={isReadOnly}
            value={supportingJourney}
            onChange={(e) => setSupportingJourney(e.target.value)}
          >
            <option value="">Select journey</option>
            {PRODUCT_JOURNEY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          Recommendation Role
          <select
            className={selectClass}
            disabled={isReadOnly}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">Select role</option>
            {PRODUCT_ROLE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          Intensity
          <select
            className={selectClass}
            disabled={isReadOnly}
            value={intensity}
            onChange={(e) => setIntensity(e.target.value)}
          >
            <option value="">Select intensity</option>
            {PRODUCT_INTENSITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
                    </select>
        </label>

        <div className="space-y-2">
          <label
            htmlFor="eligibility-policy"
    className="block text-sm font-medium text-[#2D2438]"
  >
    Eligibility Policy
  </label>

  <select
    id="eligibility-policy"
    value={eligibilityPolicy}
    onChange={(event) =>
      setEligibilityPolicy(
        event.target.value as ProductEligibilityPolicy
      )
    }
    disabled={isReadOnly}
    className="w-full rounded-lg border border-[#D9D1E2] bg-white px-3 py-2 text-sm"
  >
    <option value="none">None — Standard Eligibility</option>
    <option value="renew_targeted">
      Renew — Targeted Treatment
    </option>
    <option value="renew_quench_hydration">
      Renew / Quench — Hydration & Aging
    </option>
  </select>

  <p className="text-xs text-gray-500">
    Additional eligibility conditions applied during product
    recommendations. Changes require professional review
    and publication.
  </p>
</div>
        
      </div>
<div className="mt-5 rounded-lg border border-[#E5DFD8] bg-white p-4">
  <label className="flex items-start gap-3">
    <input
      type="checkbox"
      checked={featuredEligible}
      onChange={(event) =>
        setFeaturedEligible(event.target.checked)
      }
      disabled={isReadOnly}
      className="mt-1 h-4 w-4 accent-[#302C2A]"
    />

    <span>
      <span className="block text-sm font-medium text-[#302C2A]">
        Featured Eligible
      </span>

      <span className="mt-1 block text-xs text-[#77716D]">
        Allow this product to appear in the featured Skin Discovery
        routine. Unchecking this does not exclude the product
        from More Fresh Picks.
      </span>
    </span>
  </label>
</div>
      <section className="mt-6">
        <h4 className="text-base font-semibold">Business Experiences</h4>
        <p className="mt-1 text-sm text-[#77716D]">
          Assign this product to either or both experiences. Changes are saved in the same draft
          as the Fresh Method settings and do not go live until publication.
        </p>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          {EXPERIENCE_OPTIONS.map((experience) => {
            const current = assignments.find((item) => item.experience_id === experience.id)!;
            return (
              <div key={experience.id} className="rounded-xl border border-[#E5DFD8] bg-white p-5">
                <h5 className="font-semibold">{experience.name}</h5>
                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input type="checkbox" disabled={isReadOnly} checked={current.assigned}
                    onChange={(event) => updateAssignment(experience.id, { assigned: event.target.checked })} />
                  Assign to {experience.name}
                </label>
                <label className="mt-4 block text-sm">
                  Recommendation Priority
                  <select className={selectClass} disabled={isReadOnly || !current.assigned}
                    value={current.recommendation_priority}
                    onChange={(event) => updateAssignment(experience.id, {
                      recommendation_priority: Number(event.target.value),
                    })}>
                    {[0, 25, 50, 75, 100, 125, 150, 200, 300].map((value) => (
                      <option key={value} value={value}>{value}{value === 100 ? " — Standard Priority" : ""}</option>
                    ))}
                  </select>
                </label>
              </div>
            );
          })}
        </div>
      </section>
      <p className="mt-5 text-xs text-[#77716D]">Product ID: {productId}</p>

      <div className="mt-5">
  {saveError && (
    <p role="alert" className="mb-3 text-sm text-red-700">
      {saveError}
    </p>
  )}

  {saveSuccess && (
    <p role="status" className="mb-3 text-sm text-green-700">
      {saveSuccess}
    </p>
  )}
<div className="flex flex-wrap items-center gap-4">
  <button
    type="button"
    onClick={handleSave}
    disabled={saving || isReadOnly}
    className="rounded-lg bg-[#6F6578] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
  >
    {saving
      ? "Saving Draft..."
      : isPendingReview
        ? "Pending Review"
        : isExistingDraft
          ? "Update Draft"
          : "Save as Draft"}
  </button>

  {isExistingDraft && (
    <button
      type="button"
      onClick={handleSubmitForReview}
      disabled={saving}
      className="rounded-lg border border-[#302C2A] bg-white px-4 py-2 text-sm font-medium text-[#302C2A] hover:bg-[#F3EFEA] disabled:opacity-50"
    >
      {saving ? "Processing..." : "Submit for Review"}
    </button>
  )}
</div>
      </div>
    </div>
  );
}
