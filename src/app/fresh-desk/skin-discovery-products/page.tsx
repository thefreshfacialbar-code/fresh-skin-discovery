import Link from "next/link";
import { redirect } from "next/navigation";
import { requireFreshDeskOwnerAdmin } from "@/lib/requireFreshDeskEmployee";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import SkinDiscoveryProductLibrary from "@/components/SkinDiscoveryProductLibrary";

export default async function SkinDiscoveryProductsPage() {
  const employeeSession = await requireFreshDeskOwnerAdmin();

  if (!employeeSession) {
    redirect("/fresh-desk");
  }
const { data: products, error } = await supabaseAdmin
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
      experience_ids
    ),
    product_vendor_research (
      research_status
    )
  `)
  .order("name", { ascending: true });

if (error) {
  console.error(
    "Unable to load Skin Discovery products:",
    error.message
  );
}
const sortedProducts = [...(products ?? [])].sort((a, b) => {
  const getExperienceGroup = (product: typeof a) => {
    const profiles = Array.isArray(product.product_recommendation_profiles)
      ? product.product_recommendation_profiles
      : product.product_recommendation_profiles
        ? [product.product_recommendation_profiles]
        : [];

    const fresh = profiles.some((profile) =>
      profile.experience_ids?.includes("fresh-facial-bar-lash-lounge")
    );

    const men = profiles.some((profile) =>
      profile.experience_ids?.includes("gentlemens-corner")
    );

    if (fresh && !men) return 0;
    if (men && !fresh) return 1;
    if (fresh && men) return 2;
    return 3;
  };

  return (
    getExperienceGroup(a) - getExperienceGroup(b) ||
    (a.brand ?? "").localeCompare(b.brand ?? "") ||
    a.name.localeCompare(b.name)
  );
});
  return (
    <main className="min-h-screen bg-[#F8F5F0] px-6 py-10">
      <Link href="/fresh-desk">
        ← Back to Fresh Desk
      </Link>

      <h1 className="mt-8 text-4xl">
        Skin Discovery Products
      </h1>

      <p className="mt-4">
        Product library and recommendation management.
      </p>
      <div className="mt-6">
  <Link
    href="/fresh-desk/skin-discovery-products/batch-research"
    className="inline-flex items-center rounded-lg bg-[#2F2A28] px-5 py-3 text-sm font-semibold text-white hover:bg-[#514B47]"
  >
    Manufacturer Batch Research →
  </Link>
</div>
      <section className="mt-8 rounded-2xl border border-[#E5DFD8] bg-white p-6">
  <h2 className="text-xl font-semibold">
    Product Library
  </h2>

  {error ? (
    <p className="mt-4 text-red-700">
      Unable to load products.
    </p>
  ) : (
    <>
      <p className="mt-2 text-sm text-[#77716D]">
        {products?.length ?? 0} products · Read-only
      </p>
<SkinDiscoveryProductLibrary products={sortedProducts} />

    </>
  )}
</section>
    </main>
  );
}