
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PRODUCT_CATEGORY_OPTIONS,
  PRODUCT_JOURNEY_OPTIONS,
  PRODUCT_ROLE_OPTIONS,
  PRODUCT_INTENSITY_OPTIONS,
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
  product_category: string | null;
  primary_journey: string | null;
  supporting_journey: string | null;
  recommendation_role: string | null;
  intensity: number | null;
  eligibility_rules: ProductEligibilityRules | null;
  featured_eligible: boolean;
};

type RecommendationDraft = {
  id: string;
  review_status: string;
  proposed_settings: Partial<{
    product_category: string | null;
    primary_journey: string | null;
    supporting_journey: string | null;
    recommendation_role: string | null;
    intensity: number | null;
    eligibility_rules: ProductEligibilityRules | null;
    featured_eligible: boolean;
  }>;
};

type Props = {
  productId: string;
  profile: RecommendationProfile;
  draft?: RecommendationDraft | null;
};

export default function ProductRecommendationSettings({
  productId,
  profile,
  draft,
}: Props) {
  const isExistingDraft = draft?.review_status === "draft";
  const isPendingReview = draft?.review_status === "pending_review";
const isApproved = draft?.review_status === "approved";
const isReadOnly = isPendingReview || isApproved;

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
const router = useRouter();
const [saving, setSaving] = useState(false);
const [saveError, setSaveError] = useState("");
const [saveSuccess, setSaveSuccess] = useState("");

async function handleSave() {
  setSaving(true);
  setSaveError("");
  setSaveSuccess("");

  try {
    console.log("Recommendation settings submission:", {
  productId,
  profileId: profile.id,
  productCategory: category,
  primaryJourney,
  supportingJourney,
  recommendationRole: role,
  intensity: Number(intensity),
});

    const response = await fetch(
      "/api/fresh-desk/product-recommendation-draft",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          profileId: profile.id,
          productCategory: category,
          primaryJourney,
          supportingJourney,
          recommendationRole: role,
          intensity: Number(intensity),
          featuredEligible,
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
      <p className="mt-5 text-xs text-[#77716D]">
        Product ID: {productId}
      </p>

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
    disabled={saving}
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
