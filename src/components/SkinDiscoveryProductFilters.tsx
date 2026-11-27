
"use client";

type SkinDiscoveryProductFiltersProps = {
  brands: string[];
  visibilityFilter: string;
  searchQuery: string;
  experienceFilter: string;
  brandFilter: string;
  manufacturerFilter: string;
  onVisibilityChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onExperienceChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  onManufacturerChange: (value: string) => void;
};

export default function SkinDiscoveryProductFilters({
  brands,
  visibilityFilter,
  searchQuery,
  experienceFilter,
  brandFilter,
  manufacturerFilter,
  onVisibilityChange,
  onSearchChange,
  onExperienceChange,
  onBrandChange,
  onManufacturerChange,
}: SkinDiscoveryProductFiltersProps) {
  const selectClass =
    "rounded-xl border border-[#DAD6DB] bg-white px-4 py-3 text-sm";

  const labelClass =
    "mb-2 block text-sm font-semibold text-[#5A5553]";

  return (
    <div className="mt-6 space-y-4">
      <div>
        <label htmlFor="product-search" className={labelClass}>
          Product Search
        </label>
        <input
          id="product-search"
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by product name or brand..."
          className="w-full rounded-xl border border-[#DAD6DB] bg-white px-4 py-3 text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <div>
          <label htmlFor="visibility-filter" className={labelClass}>
            Product Visibility
          </label>
          <select
            id="visibility-filter"
            value={visibilityFilter}
            onChange={(event) =>
              onVisibilityChange(event.target.value)
            }
            className={selectClass}
          >
            <option value="all">All Products</option>
            <option value="discovery">Skin Discovery Products</option>
          </select>
        </div>

        <div>
          <label htmlFor="experience-filter" className={labelClass}>
            Experience
          </label>
          <select
            id="experience-filter"
            value={experienceFilter}
            onChange={(event) =>
              onExperienceChange(event.target.value)
            }
            className={selectClass}
          >
            <option value="all">All Experiences</option>
            <option value="fresh">Fresh Facial Bar</option>
            <option value="men">Gentlemen&apos;s Corner</option>
            <option value="both">Both Experiences</option>
          </select>
        </div>

        <div>
          <label htmlFor="brand-filter" className={labelClass}>
            Brand
          </label>
          <select
            id="brand-filter"
            value={brandFilter}
            onChange={(event) =>
              onBrandChange(event.target.value)
            }
            className={selectClass}
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
          <label htmlFor="manufacturer-filter" className={labelClass}>
            Manufacturer Research
          </label>
          <select
            id="manufacturer-filter"
            value={manufacturerFilter}
            onChange={(event) =>
              onManufacturerChange(event.target.value)
            }
            className={selectClass}
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
    </div>
  );
}
