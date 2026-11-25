import "server-only";

import Link from "next/link";
import { redirect } from "next/navigation";
import { requireFreshDeskOwnerAdmin } from "@/lib/requireFreshDeskEmployee";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export default async function SkinDiscoveryConversionPage() {
  const employeeSession = await requireFreshDeskOwnerAdmin();

  if (!employeeSession) {
    redirect("/fresh-desk");
  }
const goLiveTimestamp = "2026-11-24T05:00:00.000Z";

const { data: consultations, error: consultationsError } =
  await supabaseAdmin
    .from("consultations")
    .select("customer_id, completed_at")
    .eq("business_id", employeeSession.employee.business_id)
    .not("submission_id", "is", null)
    .not("customer_id", "is", null)
    .not("completed_at", "is", null)
    .gte("completed_at", goLiveTimestamp);

if (consultationsError) {
  throw new Error(
    `Could not load Skin Discovery conversions: ${consultationsError.message}`
  );
}

const skinDiscoveryCustomerCount = new Set(
  (consultations ?? []).map(
    (consultation) => consultation.customer_id
  )
).size;
const firstSkinDiscoveryByCustomer = new Map<string, string>();

for (const consultation of consultations ?? []) {
  const customerId = consultation.customer_id;
  const completedAt = consultation.completed_at;

  if (!customerId || !completedAt) continue;

  const existingDate = firstSkinDiscoveryByCustomer.get(customerId);

  if (!existingDate || completedAt < existingDate) {
    firstSkinDiscoveryByCustomer.set(customerId, completedAt);
  }
}
const eligibleCustomerIds = Array.from(
  firstSkinDiscoveryByCustomer.keys()
);

const { data: shopifyOrders, error: shopifyOrdersError } =
  eligibleCustomerIds.length > 0
    ? await supabaseAdmin
        .from("shopify_orders")
        .select("id, customer_id, order_created_at")
        .eq("business_id", employeeSession.employee.business_id)
        .in("customer_id", eligibleCustomerIds)
        .not("order_created_at", "is", null)
    : { data: [], error: null };

if (shopifyOrdersError) {
  throw new Error(
    `Could not load Shopify conversion orders: ${shopifyOrdersError.message}`
  );
}
const qualifyingShopifyOrders = (shopifyOrders ?? []).filter(
  (order) => {
    if (!order.customer_id || !order.order_created_at) {
      return false;
    }

    const firstDiscoveryDate = firstSkinDiscoveryByCustomer.get(
      order.customer_id
    );

    return (
      firstDiscoveryDate !== undefined &&
      new Date(order.order_created_at).getTime() >
        new Date(firstDiscoveryDate).getTime()
    );
  }
);

const shopifyProductOrderCount = new Set(
  qualifyingShopifyOrders.map((order) => order.id)
).size;

const shopifyPurchasingCustomerIds = new Set(
  qualifyingShopifyOrders.map((order) => order.customer_id)
);
const { data: boulevardOrders, error: boulevardOrdersError } =
  eligibleCustomerIds.length > 0
    ? await supabaseAdmin
        .from("boulevard_orders")
        .select(
          "id, customer_id, historical_order_date, created_at"
        )
        .eq("business_id", employeeSession.employee.business_id)
        .in("customer_id", eligibleCustomerIds)
    : { data: [], error: null };

if (boulevardOrdersError) {
  throw new Error(
    `Could not load Boulevard conversion orders: ${boulevardOrdersError.message}`
  );
}
const qualifyingBoulevardOrders = (boulevardOrders ?? []).filter(
  (order) => {
    if (!order.customer_id) return false;

    const firstDiscoveryDate = firstSkinDiscoveryByCustomer.get(
      order.customer_id
    );

    if (!firstDiscoveryDate) return false;

    if (order.historical_order_date) {
      // A date-only historical record cannot establish
      // whether a same-day purchase occurred after discovery.
      const discoveryEasternDate = new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone: "America/New_York",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }
      ).format(new Date(firstDiscoveryDate));

      return order.historical_order_date > discoveryEasternDate;
    }

    if (!order.created_at) return false;

    // For orders delivered by Zapier, use the first
    // Supabase insertion time as an approximate completion time.
    return (
      new Date(order.created_at).getTime() >
      new Date(firstDiscoveryDate).getTime()
    );
  }
);
const qualifyingBoulevardOrderIds = qualifyingBoulevardOrders.map(
  (order) => order.id
);

const { data: boulevardOrderItems, error: boulevardItemsError } =
  qualifyingBoulevardOrderIds.length > 0
    ? await supabaseAdmin
        .from("boulevard_order_items")
        .select("boulevard_order_id, item_type")
        .in("boulevard_order_id", qualifyingBoulevardOrderIds)
        .in("item_type", ["service", "product"])
    : { data: [], error: null };

if (boulevardItemsError) {
  throw new Error(
    `Could not load Boulevard conversion items: ${boulevardItemsError.message}`
  );
}
const boulevardServiceOrderIds = new Set(
  (boulevardOrderItems ?? [])
    .filter((item) => item.item_type === "service")
    .map((item) => item.boulevard_order_id)
);

const boulevardProductOrderIds = new Set(
  (boulevardOrderItems ?? [])
    .filter((item) => item.item_type === "product")
    .map((item) => item.boulevard_order_id)
);

const boulevardServiceOrderCount = boulevardServiceOrderIds.size;
const boulevardProductOrderCount = boulevardProductOrderIds.size;
const qualifyingBoulevardOrderIdSet = new Set([
  ...boulevardServiceOrderIds,
  ...boulevardProductOrderIds,
]);

const convertedCustomerIds = new Set(
  Array.from(shopifyPurchasingCustomerIds).filter(
    (customerId): customerId is string => customerId !== null
  )
);

for (const order of qualifyingBoulevardOrders) {
  if (
    order.customer_id &&
    qualifyingBoulevardOrderIdSet.has(order.id)
  ) {
    convertedCustomerIds.add(order.customer_id);
  }
}

const convertedCustomerCount = convertedCustomerIds.size;

const conversionRate =
  skinDiscoveryCustomerCount > 0
    ? (convertedCustomerCount / skinDiscoveryCustomerCount) * 100
    : 0;
  return (
    <main className="min-h-screen bg-[#FAF7F1] px-6 py-10 text-[#302C2A]">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/fresh-desk/reports"
          className="text-sm font-semibold text-[#908A9B] hover:text-[#302C2A]"
        >
          ← Reports
        </Link>

        <h1
          className="mt-6 text-4xl"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Skin Discovery Conversion
        </h1>

        <p className="mt-3 text-[#5A5553]">
          Track customers who make purchases after completing
          their Skin Discovery.
        </p>

        <p className="mt-6 text-sm text-[#6D617C]">
          Reporting go-live: November 24, 2026
        </p>
        <section className="mt-10 grid gap-5 md:grid-cols-3">
  <div className="rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-6">
    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#908A9B]">
      Skin Discovery Customers
    </p>

    <p
      className="mt-4 text-4xl font-semibold"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      {skinDiscoveryCustomerCount}
    </p>

    <p className="mt-3 text-sm text-[#5A5553]">
      Unique customers who completed Skin Discovery
      since go-live.
    </p>
  </div>
  <div className="rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-6">
  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#908A9B]">
    Converted Customers
  </p>

  <p
    className="mt-4 text-4xl font-semibold"
    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
  >
    {convertedCustomerCount}
  </p>

  <p className="mt-3 text-sm text-[#5A5553]">
    Unique customers who purchased a service or product
    after Skin Discovery.
  </p>
</div>

<div className="rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-6">
  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#908A9B]">
    Conversion Rate
  </p>

  <p
    className="mt-4 text-4xl font-semibold"
    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
  >
    {conversionRate.toFixed(1)}%
  </p>

  <p className="mt-3 text-sm text-[#5A5553]">
    Percentage of Skin Discovery customers who made
    a qualifying purchase.
  </p>
</div>
  <div className="rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-6">
  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#908A9B]">
    Shopify Purchasing Customers
  </p>

  <p
    className="mt-4 text-4xl font-semibold"
    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
  >
    {shopifyPurchasingCustomerIds.size}
  </p>

  <p className="mt-3 text-sm text-[#5A5553]">
    Unique customers who purchased through Shopify after Skin Discovery.
  </p>
</div>

<div className="rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-6">
  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#908A9B]">
    Shopify Product Orders
  </p>

  <p
    className="mt-4 text-4xl font-semibold"
    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
  >
    {shopifyProductOrderCount}
  </p>

  <p className="mt-3 text-sm text-[#5A5553]">
    Shopify orders placed after Skin Discovery.
  </p>
</div>
<div className="rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-6">
  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#908A9B]">
    Boulevard Service Orders
  </p>

  <p
    className="mt-4 text-4xl font-semibold"
    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
  >
    {boulevardServiceOrderCount}
  </p>

  <p className="mt-3 text-sm text-[#5A5553]">
    Service orders placed after Skin Discovery.
  </p>
</div>

<div className="rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-6">
  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#908A9B]">
    Boulevard Product Orders
  </p>

  <p
    className="mt-4 text-4xl font-semibold"
    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
  >
    {boulevardProductOrderCount}
  </p>

  <p className="mt-3 text-sm text-[#5A5553]">
    Product orders placed after Skin Discovery.
  </p>
</div>
</section>
      </div>
    </main>
  );
}
