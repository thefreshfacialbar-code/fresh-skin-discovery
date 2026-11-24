import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireFreshDeskOwnerAdmin } from "@/lib/requireFreshDeskEmployee";

export default async function FreshDeskReportsPage() {
  const employeeSession = await requireFreshDeskOwnerAdmin();

  if (!employeeSession) {
    redirect("/fresh-desk");
  }

  return (
    <main className="min-h-screen bg-[#FAF7F1] px-6 py-10 text-[#302C2A]">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/fresh-desk"
          className="text-sm font-semibold text-[#908A9B] hover:text-[#302C2A]"
        >
          ← Fresh 360
        </Link>

        <h1
          className="mt-6 text-4xl"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Reports
        </h1>

        <p className="mt-3 text-[#5A5553]">
          Fresh Desk 360 business activity and performance.
        </p>

        <section className="mt-10 grid gap-5 md:grid-cols-2">
          <Link
            href="/fresh-desk/reports/skin-discovery"
            className="rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-6 transition hover:border-[#908A9B] hover:shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#908A9B]">
              Skin Discovery
            </p>

            <h2
              className="mt-3 text-2xl"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Skin Discovery Activity
            </h2>

            <p className="mt-3 text-sm text-[#5A5553]">
              Monitor completed discoveries, customer activity,
              experiences, and professional reviews.
            </p>

            <p className="mt-5 text-sm font-semibold text-[#6D617C]">
              View Report →
            </p>
          </Link>
        </section>
      </div>
    </main>
  );
}