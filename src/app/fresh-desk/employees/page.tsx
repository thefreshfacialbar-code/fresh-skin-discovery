import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Link from "next/link";
import { requireFreshDeskOwnerAdmin } from "@/lib/requireFreshDeskEmployee";

export default async function FreshDeskEmployeesPage() {
  const employeeSession = await requireFreshDeskOwnerAdmin();

  if (!employeeSession) {
    redirect("/fresh-desk");
  }
const { data: employees, error } = await supabaseAdmin
  .from("employees")
  .select(
    "id, first_name, last_name, email, role, active, created_at"
  )
  .eq("business_id", employeeSession.employee.business_id)
  .order("last_name", { ascending: true })
  .order("first_name", { ascending: true });
  if (error) {
  console.error("Fresh Desk employee list failed:", error);

  return (
    <main className="min-h-screen bg-[#F8F5F0] px-6 py-10 text-[#2F2A28]">
      <div className="mx-auto max-w-6xl">
        <h1
          className="text-4xl"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Employees
        </h1>

        <p className="mt-4 text-[#5A5553]">
          Employee records could not be loaded.
        </p>
      </div>
    </main>
  );
}
  return (
    <main className="min-h-screen bg-[#F8F5F0] px-6 py-10 text-[#2F2A28]">
      <div className="mx-auto max-w-6xl">
        <Link
  href="/fresh-desk"
  className="mb-6 inline-block text-sm font-semibold text-[#5A5553] hover:underline"
>
  ← Back to Fresh Desk
</Link>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#908A9B]">
          Fresh Facial Bar
        </p>

        <h1
          className="mt-3 text-4xl"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Employees
        </h1>

        <p className="mt-3 text-[#5A5553]">
          Manage Fresh Desk employee access and roles.
        </p>
        <div className="mt-8 space-y-4">
  {employees && employees.length > 0 ? (
    employees.map((employee) => (
      <div
        key={employee.id}
        className="rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold">
              {employee.first_name} {employee.last_name}
            </p>

            <p className="mt-1 text-sm text-[#5A5553]">
              {employee.email}
            </p>
          </div>

          <span className="rounded-full border border-[#DAD6DB] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#5A5553]">
            {employee.active ? "Active" : "Inactive"}
          </span>
        </div>

        <p className="mt-4 text-sm text-[#5A5553]">
          Role:{" "}
          <span className="font-semibold text-[#2F2A28]">
            {employee.role === "owner_admin"
              ? "Owner / Admin"
              : "Professional"}
          </span>
        </p>
      </div>
    ))
  ) : (
    <p className="text-[#5A5553]">No employees found.</p>
  )}
</div>
      </div>
    </main>
  );
}