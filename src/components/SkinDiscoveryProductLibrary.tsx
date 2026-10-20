"use client";

import { useMemo, useState } from "react";
import SkinDiscoveryProductFilters from "./SkinDiscoveryProductFilters";
import Link from "next/link";

type ProductProfile = {
  experience_ids: string[] | null;
};
type ManufacturerResearch = {
  research_status: "draft" | "approved" | "rejected";
};
type Product = {
  id: string;
  name: string;
  brand: string | null;
  category: string | null;
  active: boolean | null;
  recommendable: boolean | null;
  recommendation_status: string | null;
    product_vendor_research:
    | ManufacturerResearch
    | ManufacturerResearch[]
    | null;
  product_recommendation_profiles:
    | ProductProfile
    | ProductProfile[]
    | null;
};

type Props = {
  products: Product[];
};

export default function SkinDiscoveryProductLibrary({
  products,
}: Props) {
  const [experienceFilter, setExperienceFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
const [manufacturerFilter, setManufacturerFilter] = useState("all");
  const brands = useMemo(
    () =>
      [...new Set(products.map((p) => p.brand).filter(
        (brand): brand is string => Boolean(brand)
      ))].sort((a, b) => a.localeCompare(b)),
    [products]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const rawProfiles = product.product_recommendation_profiles;

      const profiles = Array.isArray(rawProfiles)
        ? rawProfiles
        : rawProfiles
          ? [rawProfiles]
          : [];

      const fresh = profiles.some((profile) =>
        profile.experience_ids?.includes("fresh-facial-bar-lash-lounge")
      );

      const men = profiles.some((profile) =>
        profile.experience_ids?.includes("gentlemens-corner")
      );

      const matchesExperience =
        experienceFilter === "all" ||
        (experienceFilter === "fresh" && fresh) ||
        (experienceFilter === "men" && men) ||
        (experienceFilter === "both" && fresh && men);

      const matchesBrand =
  brandFilter === "all" || product.brand === brandFilter;

const rawResearch = product.product_vendor_research;

const research = Array.isArray(rawResearch)
  ? rawResearch[0] ?? null
  : rawResearch;

const manufacturerStatus =
  research?.research_status ?? "not_researched";

const matchesManufacturer =
  manufacturerFilter === "all" ||
  (manufacturerFilter === "needs_attention" &&
    manufacturerStatus !== "approved") ||
  manufacturerFilter === manufacturerStatus;

return (
  matchesExperience &&
  matchesBrand &&
  matchesManufacturer
);
    });
  }, [products, experienceFilter, brandFilter, manufacturerFilter]);

  return (
    <div>
      <SkinDiscoveryProductFilters
  brands={brands}
  experienceFilter={experienceFilter}
  brandFilter={brandFilter}
  manufacturerFilter={manufacturerFilter}
  onExperienceChange={setExperienceFilter}
  onBrandChange={setBrandFilter}
  onManufacturerChange={setManufacturerFilter}
/>

      <p className="mt-4 text-sm text-[#77716D]">
        Showing {filteredProducts.length} of {products.length} products
      </p>
      <div className="mt-6 space-y-3">
  {filteredProducts.map((product) => {
    const rawProfiles = product.product_recommendation_profiles;

    const profiles = Array.isArray(rawProfiles)
      ? rawProfiles
      : rawProfiles
        ? [rawProfiles]
        : [];

    const fresh = profiles.some((profile) =>
      profile.experience_ids?.includes("fresh-facial-bar-lash-lounge")
    );

    const men = profiles.some((profile) =>
      profile.experience_ids?.includes("gentlemens-corner")
    );
const rawResearch = product.product_vendor_research;

const research = Array.isArray(rawResearch)
  ? rawResearch[0] ?? null
  : rawResearch;

const manufacturerStatus =
  research?.research_status ?? "not_researched";

const manufacturerLabel =
  manufacturerStatus === "approved"
    ? "Manufacturer Approved"
    : manufacturerStatus === "draft"
      ? "Needs Manufacturer Approval"
      : manufacturerStatus === "rejected"
        ? "Manufacturer Rejected"
        : "Not Researched";
    return (
      <div
        key={product.id}
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#EAE5DF] bg-white p-4"
      >
        <div>
          <Link
  href={`/fresh-desk/skin-discovery-products/${product.id}`}
  className="font-semibold text-[#302C2A] hover:text-[#6F6578] hover:underline"
>
  {product.name}
</Link>
          <p className="mt-1 text-sm font-medium text-[#6F6578]">
            {product.brand || "Brand not assigned"}
          </p>
          <p className="mt-1 text-sm text-[#77716D]">
            {product.category ?? "Uncategorized"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs">
            <span
  className={`rounded-full px-3 py-1 font-medium ${
    manufacturerStatus === "approved"
      ? "bg-green-100 text-green-800"
      : manufacturerStatus === "draft"
        ? "bg-amber-100 text-amber-800"
        : manufacturerStatus === "rejected"
          ? "bg-red-100 text-red-800"
          : "bg-gray-100 text-gray-700"
  }`}
>
  {manufacturerLabel}
</span>
          {fresh && (
            <span className="rounded-full bg-[#E9F0E8] px-3 py-1 text-[#45634B]">
              Fresh Facial Bar
            </span>
          )}

          {men && (
            <span className="rounded-full bg-[#EEE9F3] px-3 py-1 text-[#655475]">
              Gentlemen&apos;s Corner
            </span>
          )}

          <span className="rounded-full bg-[#F3F0EB] px-3 py-1">
            {product.active ? "Active" : "Inactive"}
          </span>

          <span className="rounded-full bg-[#F3F0EB] px-3 py-1">
            {product.recommendable ? "Recommendable" : "Not recommendable"}
          </span>

          <span className="rounded-full bg-[#F3F0EB] px-3 py-1">
            {product.recommendation_status ?? "No status"}
          </span>
        </div>
      </div>
    );
  })}
</div>
    </div>
  );
}