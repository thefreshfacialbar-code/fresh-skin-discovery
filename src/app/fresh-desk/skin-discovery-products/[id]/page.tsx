import Link from "next/link";
import { redirect } from "next/navigation";
import { requireFreshDeskOwnerAdmin } from "@/lib/requireFreshDeskEmployee";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ProductExperienceAssignment from "@/components/ProductExperienceAssignment";
import ProductExperienceApproval from "@/components/ProductExperienceApproval";
import ProductExperiencePriority from "@/components/ProductExperiencePriority";
import ProductVendorLookupTest from "@/components/ProductVendorLookupTest";
import ProductVendorResearchReview from "@/components/ProductVendorResearchReview";

type ProductDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SkinDiscoveryProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { id: productId } = await params;
  const employeeSession = await requireFreshDeskOwnerAdmin();

  if (!employeeSession) {
    redirect("/fresh-desk");
  }
const { data: product, error } = await supabaseAdmin
  .from("products")
  .select(`
  id,
  name,
  brand,
  category,
  active,
  recommendable,
  recommendation_status,
  product_recommendation_profiles (
    experience_ids,
    primary_journey,
    supporting_journey,
    recommendation_role,
    intensity,
    recommendation_priority,
    professional_notes,
    customer_guidance
  ),
  product_experience_recommendations (
    experience_id,
    assigned,
    approval_status,
    recommendation_priority,
    reviewed_at
  )
`)

  .eq("id", productId)
  .single();

if (error) {
  console.error(
    "Unable to load Skin Discovery product:",
    error.message
  );
}

const { data: vendorResearch, error: vendorResearchError } =
  await supabaseAdmin
    .from("product_vendor_research")
    .select(`
      id,
      vendor_product_name,
      vendor_product_id,
      vendor_product_url,
      vendor_category,
      vendor_description,
      professional_description,
      research_status,
      researched_at,
      reviewed_at
    `)
    .eq("product_id", productId)
    .maybeSingle();

if (vendorResearchError) {
  console.error(
    "Unable to load vendor research:",
    vendorResearchError.message
  );
}

const rawProfile = product?.product_recommendation_profiles;

const profile = Array.isArray(rawProfile)
  ? rawProfile[0] ?? null
  : rawProfile ?? null;
  return (
    <main className="min-h-screen bg-[#F8F5F0] px-6 py-10 text-[#2F2A28]">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/fresh-desk/skin-discovery-products"
          className="text-sm font-semibold text-[#5A5553] hover:underline"
        >
          ← Back to Skin Discovery Products
        </Link>

        <h1
          className="mt-8 text-4xl"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
         {product?.name ?? "Product not found"}
        </h1>

        <p className="mt-3 text-lg font-medium text-[#6F6578]">
  {product?.brand || "Brand not assigned"}
</p>

<p className="mt-2 text-sm text-[#77716D]">
  {product?.category || "Uncategorized"}
</p>
{product?.id && (
  <ProductVendorLookupTest
  productId={productId}
  researchStatus={vendorResearch?.research_status ?? null}
  manufacturerProductId={vendorResearch?.vendor_product_id ?? null}
/>
)}

<section className="mt-8 rounded-xl border border-[#E5DED6] bg-white p-6">
  <h2 className="text-xl font-semibold">
    Manufacturer Research
  </h2>

  {!vendorResearch ? (
    <p className="mt-3 text-sm text-[#77716D]">
      No manufacturer research available yet.
    </p>
  ) : (
    <div className="mt-4 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase text-[#77716D]">
          Review Status
        </p>
        <p className="mt-1 capitalize">
          {vendorResearch.research_status}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase text-[#77716D]">
          Manufacturer Product
        </p>
        <p className="mt-1">
          {vendorResearch.vendor_product_name}
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase text-[#77716D]">
          Manufacturer Description
        </p>
        <p className="mt-1 whitespace-pre-wrap text-sm">
          {vendorResearch.vendor_description
            ?.replace(/<[^>]*>/g, " ")
            .replace(/&amp;/g, "&")
            .trim() || "Not provided"}
        </p>
      </div>

      {vendorResearch.vendor_product_url && (
        <a
          href={vendorResearch.vendor_product_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-sm font-semibold text-[#6F6578] underline"
        >
          View Official Manufacturer Source
        </a>
      )}
      {vendorResearch.professional_description && (
  <div className="mt-5 rounded-lg border border-[#C8BDB3] bg-[#F8F6F3] p-4">
    <h3 className="mb-2 text-sm font-semibold text-[#2F2A28]">
      Professional Description
    </h3>

    <p className="whitespace-pre-wrap text-sm leading-6 text-[#514B47]">
      {vendorResearch.professional_description}
    </p>

    {vendorResearch.research_status === "approved" && (
      <p className="mt-3 text-xs font-semibold text-green-700">
        Professionally Reviewed & Approved
      </p>
    )}
  </div>
)}
    <ProductVendorResearchReview
  researchId={vendorResearch.id}
  status={vendorResearch.research_status}
  initialProfessionalDescription={
    vendorResearch.professional_description
  }
/>
    </div>
  )}
</section>

{error && (
  <p className="mt-4 text-sm text-red-700">
    Unable to load product details.
  </p>
)}
<section className="mt-8 rounded-2xl border border-[#E5DFD8] bg-white p-6">
  <h2 className="text-xl font-semibold">
    Recommendation Profile
  </h2>

  <p className="mt-2 text-sm text-[#77716D]">
    Skin Discovery recommendation settings for this product.
  </p>

  <div className="mt-6 grid gap-4 sm:grid-cols-2">
    <div>
      <p className="text-xs font-semibold uppercase text-[#908A9B]">
        Product Status
      </p>
      <p className="mt-1">
        {product?.recommendation_status ?? "Not assigned"}
      </p>
    </div>

    <div>
  <p className="text-xs font-semibold uppercase text-[#908A9B]">
    Recommendation Eligibility
  </p>
  <p className="mt-1">
    {product?.recommendable ? "Recommendable" : "Not recommendable"}
  </p>
</div>

<div>
  <p className="text-xs font-semibold uppercase text-[#908A9B]">
    Assigned Experiences
  </p>
  <p className="mt-1">
    {profile?.experience_ids?.includes("fresh-facial-bar-lash-lounge")
      ? "Fresh Facial Bar"
      : ""}
    {profile?.experience_ids?.includes("fresh-facial-bar-lash-lounge") &&
    profile?.experience_ids?.includes("gentlemens-corner")
      ? " · "
      : ""}
    {profile?.experience_ids?.includes("gentlemens-corner")
      ? "Gentlemen's Corner"
      : ""}
    {!profile?.experience_ids?.length ? "Not assigned" : ""}
  </p>
</div>

<div>
  <p className="text-xs font-semibold uppercase text-[#908A9B]">
    Primary Journey
  </p>
  <p className="mt-1">
    {profile?.primary_journey ?? "Not assigned"}
  </p>
</div>

<div>
  <p className="text-xs font-semibold uppercase text-[#908A9B]">
    Supporting Journey
  </p>
  <p className="mt-1">
    {profile?.supporting_journey ?? "Not assigned"}
  </p>
</div>

<div>
  <p className="text-xs font-semibold uppercase text-[#908A9B]">
    Recommendation Role
  </p>
  <p className="mt-1">
    {profile?.recommendation_role ?? "Not assigned"}
  </p>
</div>

<div>
  <p className="text-xs font-semibold uppercase text-[#908A9B]">
    Intensity
  </p>
  <p className="mt-1">
    {profile?.intensity ?? "Not assigned"}
  </p>
</div>

<div>
  <p className="text-xs font-semibold uppercase text-[#908A9B]">
    Recommendation Priority
  </p>
  <p className="mt-1">
    {profile?.recommendation_priority ?? "Not assigned"}
  </p>
</div>
  </div>
</section>
<section className="mt-8 grid gap-6 md:grid-cols-2">
  {[
    {
      id: "fresh-facial-bar-lash-lounge",
      name: "Fresh Facial Bar & Lash Lounge",
    },
    {
      id: "gentlemens-corner",
      name: "Gentlemen's Corner",
    },
  ].map((experience) => {
    const experienceSettings =
  product?.product_experience_recommendations?.find(
    (record) => record.experience_id === experience.id
  );

const assigned = experienceSettings?.assigned ?? false;

    return (
      <div
        key={experience.id}
        className="rounded-2xl border border-[#E5DFD8] bg-white p-6"
      >
        <h2 className="text-xl font-semibold">
          {experience.name}
        </h2>

        <p className="mt-3 text-sm text-[#77716D]">
          Assignment: {assigned ? "Assigned" : "Not assigned"}
        </p>
<ProductExperienceAssignment
  key={experience.id}
  productId={productId}
  experienceId={experience.id}
  experienceName={experience.name}
  assigned={assigned}
/>
        <p className="mt-2 text-sm text-[#77716D]">
  Professional Approval:{" "}
  {experienceSettings?.approval_status ?? "Not reviewed"}
</p>

<p className="mt-2 text-sm text-[#77716D]">
  Experience Priority:{" "}
  {experienceSettings?.recommendation_priority ?? "Not assigned"}
</p>
{assigned && experienceSettings && (
  <ProductExperienceApproval
    productId={productId}
    experienceId={experience.id}
    approvalStatus={experienceSettings.approval_status}
  />
)}
{assigned && experienceSettings && (
  <ProductExperiencePriority
    productId={productId}
    experienceId={experience.id}
    priority={experienceSettings.recommendation_priority}
  />
)}
      </div>
    );
  })}
</section>
      </div>
    </main>
  );
}