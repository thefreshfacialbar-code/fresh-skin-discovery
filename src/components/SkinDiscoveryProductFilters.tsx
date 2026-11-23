"use client";

type SkinDiscoveryProductFiltersProps = {
  brands: string[];
  experienceFilter: string;
  brandFilter: string;
  manufacturerFilter: string;
  onExperienceChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  onManufacturerChange: (value: string) => void;
};

export default function SkinDiscoveryProductFilters({
  brands,
  experienceFilter,
  brandFilter,
  manufacturerFilter,
  onExperienceChange,
  onBrandChange,
  onManufacturerChange,
}: SkinDiscoveryProductFiltersProps) {
  return (
    <div className="mt-6 flex flex-wrap gap-4">
      <div>
        <label
          htmlFor="experience-filter"
          className="mb-2 block text-sm font-semibold text-[#5A5553]"
        >
          Experience
        </label>

        <select
          id="experience-filter"
          value={experienceFilter}
          onChange={(event) => onExperienceChange(event.target.value)}
          className="rounded-xl border border-[#DAD6DB] bg-white px-4 py-3 text-sm"
        >
          <option value="all">All Experiences</option>
          <option value="fresh">Fresh Facial Bar</option>
          <option value="men">Gentlemen&apos;s Corner</option>
          <option value="both">Both Experiences</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="brand-filter"
          className="mb-2 block text-sm font-semibold text-[#5A5553]"
        >
          Brand
        </label>

        <select
          id="brand-filter"
          value={brandFilter}
          onChange={(event) => onBrandChange(event.target.value)}
          className="rounded-xl border border-[#DAD6DB] bg-white px-4 py-3 text-sm"
        >
          <option value="all">All Brands</option>

          {brands.map((brand) => (
            <option key={brand} value={brand}>
              {brand}
            </option>
          ))}
        </select>
      </div>
      <div>
  <label
    htmlFor="manufacturer-filter"
    className="mb-2 block text-sm font-semibold text-[#5A5553]"
  >
    Manufacturer Research
  </label>

  <select
    id="manufacturer-filter"
    value={manufacturerFilter}
    onChange={(event) =>
      onManufacturerChange(event.target.value)
    }
    className="rounded-xl border border-[#DAD6DB] bg-white px-4 py-3 text-sm"
  >
    <option value="all">All Research Statuses</option>
    <option value="needs_attention">Needs Attention</option>
    <option value="not_researched">Not Researched</option>
    <option value="draft">Needs Approval</option>
    <option value="approved">Approved</option>
    <option value="rejected">Rejected</option>
  </select>
</div>
    </div>
  );
}