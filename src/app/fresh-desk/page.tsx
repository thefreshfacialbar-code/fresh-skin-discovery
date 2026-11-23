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
const { data: recentShopifyOrders, error: shopifyOrdersError } =
  await supabaseAdmin
    .from("shopify_orders")
    .select(`
      id,
      customer_id,
      shopify_order_number,
      customer_first_name,
      customer_last_name,
      financial_status,
      total_price,
      currency,
      order_created_at
    `)
    .eq("business_id", employeeSession.employee.business_id)
    .order("order_created_at", { ascending: false })
    .limit(10);

if (shopifyOrdersError) {
  console.error(
    "Unable to load recent Shopify orders:",
    shopifyOrdersError.message
  );
}
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
    href="/fresh-desk/skin-discovery-products"
    className="rounded-full border border-[#DAD6DB] bg-[#FFFDFC] px-4 py-2 text-sm font-semibold text-[#5A5553] transition hover:bg-[#F4F0EA]"
  >
    Skin Discovery Products
  </Link>
)}
{employeeSession.employee.role === "owner_admin" && (
  <Link
    href="/fresh-desk/skin-discovery-products/batch-research"
    className="rounded-full border border-[#DAD6DB] bg-[#FFFDFC] px-4 py-2 text-sm font-semibold text-[#5A5553] transition hover:bg-[#F4F0EA]"
  >
    Manufacturer Batch Research
  </Link>
)}
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
          Fresh 360
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
  <section className="mt-10 rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-6">
  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#908A9B]">
    Shopify Activity
  </p>

  <h2
    className="mt-2 text-2xl"
    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
  >
    Recent Shopify Purchases
  </h2>

  {shopifyOrdersError ? (
    <p className="mt-5 text-sm text-red-700">
      Unable to load Shopify purchases.
    </p>
  ) : recentShopifyOrders && recentShopifyOrders.length > 0 ? (
    <div className="mt-5 divide-y divide-[#E6E0E3]">
      {recentShopifyOrders.map((order) => (
        <div
          key={order.id}
          className="flex flex-wrap items-center justify-between gap-4 py-4"
        >
          <div>
            <p className="font-semibold">
              {order.shopify_order_number}
            </p>

            <p className="mt-1 text-sm text-[#5A5553]">
              {[order.customer_first_name, order.customer_last_name]
                .filter(Boolean)
                .join(" ") || "Unknown customer"}
            </p>

            <p className="mt-1 text-xs text-[#908A9B]">
              {order.order_created_at
                ? new Date(order.order_created_at).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }
                  )
                : "Date unavailable"}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: order.currency ?? "USD",
                }).format(Number(order.total_price ?? 0))}
              </p>

              <p className="mt-1 text-xs text-[#5A5553]">
                {order.financial_status ?? "Unknown status"}
              </p>
            </div>

            {order.customer_id && (
              <Link
                href={`/fresh-desk/customers/${order.customer_id}`}
                className="rounded-full border border-[#DAD6DB] px-4 py-2 text-sm font-semibold text-[#5A5553] transition hover:bg-[#F4F0EA]"
              >
                View Customer
              </Link>
            )}
          </div>
        </div>
      ))}
    </div>
  ) : (
    <p className="mt-5 text-sm text-[#5A5553]">
      No Shopify purchases recorded yet.
    </p>
  )}
</section>

      </div>
    </main>
  );
}