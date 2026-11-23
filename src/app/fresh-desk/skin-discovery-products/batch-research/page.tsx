
import { redirect } from "next/navigation";
import { requireFreshDeskOwnerAdmin } from "@/lib/requireFreshDeskEmployee";
import ManufacturerBatchResearchReview from "@/components/ManufacturerBatchResearchReview";
import Link from "next/link";
export const dynamic = "force-dynamic";

export default async function BatchResearchPage() {
  const employeeSession = await requireFreshDeskOwnerAdmin();

  if (!employeeSession) {
    redirect("/fresh-desk/login");
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
        <Link
  href="/fresh-desk/skin-discovery-products"
  className="mb-6 inline-flex items-center text-sm font-semibold text-[#6F6578] hover:underline"
>
  ← Back to Products
</Link>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold">
          Manufacturer Research Review
        </h1>

        <p className="mt-3 text-gray-600">
          Review manufacturer product matches before approving
          research for Skin Discovery recommendations.
        </p>
      </div>

      <section className="rounded-xl border p-6">
        <h2 className="text-xl font-semibold">
          FarmHouse Fresh
        </h2>

        <p className="mt-3 text-gray-600">
          Batch manufacturer research preview.
          No changes will be saved until reviewed and approved.
        </p>

       <ManufacturerBatchResearchReview />
      </section>
    </main>
  );
}
