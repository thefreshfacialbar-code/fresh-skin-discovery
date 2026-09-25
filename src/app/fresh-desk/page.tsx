import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";
export default async function FreshDeskPage() {
  const { data: customers, error } = await supabaseAdmin
  .from("customers")
  .select("id, first_name, last_name, email, created_at")
  .order("created_at", { ascending: false })
  .limit(10);
    return (
    <main className="min-h-screen bg-[#FAF7F1] px-6 py-10 text-[#302C2A]">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#908A9B]">
          Fresh Facial Bar
        </p>

        <h1
          className="mt-3 text-4xl"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Fresh Desk
        </h1>

        <p className="mt-3 text-[#5A5553]">
          Customer 360
        </p>
        <div className="mt-10">
  <h2 className="text-xl font-semibold">Recent Customers</h2>

  {error ? (
    <p className="mt-4 text-red-700">
      Unable to load customers.
    </p>
  ) : (
    <div className="mt-4 space-y-3">
      {customers?.map((customer) => (
  <Link
    key={customer.id}
    href={`/fresh-desk/customers/${customer.id}`}
    className="block rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-5 transition hover:-translate-y-0.5 hover:shadow-md"
  
        >
          <p className="font-semibold">
            {customer.first_name} {customer.last_name}
          </p>

          <p className="mt-1 text-sm text-[#5A5553]">
            {customer.email}
          </p>
        </Link>
      ))}
    </div>
  )}
</div>
      </div>
    </main>
  );
}