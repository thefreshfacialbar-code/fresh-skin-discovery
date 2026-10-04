import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireFreshDeskEmployee } from "@/lib/requireFreshDeskEmployee";
import FreshDeskCustomerSearch from "@/components/FreshDeskCustomerSearch";
import FreshDeskLogoutButton from "@/components/FreshDeskLogoutButton";

export default async function FreshDeskPage() {
     const employeeSession = await requireFreshDeskEmployee();

if (!employeeSession) {
  redirect("/fresh-desk/login");
}
  const { data: customers, error } = await supabaseAdmin
  .from("customers")
  .select("id, first_name, last_name, email, mobile_phone, created_at")
  .eq("business_id", employeeSession.employee.business_id)
  .order("created_at", { ascending: false });

    return (
    <main className="min-h-screen bg-[#FAF7F1] px-6 py-10 text-[#302C2A]">
      <div className="mx-auto max-w-6xl">
      <div className="flex items-start justify-between gap-4">
  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#908A9B]">
    Fresh Facial Bar
  </p>

  <div className="flex items-center gap-4">
  <div className="text-right">
    <p className="text-sm font-semibold text-[#2F2A28]">
      {employeeSession.employee.first_name}{" "}
      {employeeSession.employee.last_name}
    </p>

    <p className="text-xs text-[#908A9B]">
      {employeeSession.employee.role === "owner_admin"
        ? "Owner / Admin"
        : "Professional"}
    </p>
  </div>
<Link
  href="/fresh-desk/events"
  className="rounded-full border border-[#DAD6DB] bg-[#FFFDFC] px-4 py-2 text-sm font-semibold text-[#5A5553] transition hover:bg-[#F4F0EA]"
>
  Events
</Link>
  {employeeSession.employee.role === "owner_admin" && (
    <Link
      href="/fresh-desk/employees"
      className="rounded-full border border-[#DAD6DB] bg-[#FFFDFC] px-4 py-2 text-sm font-semibold text-[#5A5553] transition hover:bg-[#F4F0EA]"
    >
      Employees
    </Link>
  )}

  <FreshDeskLogoutButton />
</div>
</div>

<h1
  className="mt-3 text-4xl"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Fresh Desk
        </h1>

        <p className="mt-3 text-[#5A5553]">
          Customer 360
        </p>
       {error ? (
  <p className="mt-10 text-red-700">
    Unable to load customers.
  </p>
) : (
  <FreshDeskCustomerSearch customers={customers ?? []} />
)}
  

      </div>
    </main>
  );
}