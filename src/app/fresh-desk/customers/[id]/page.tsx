import "server-only";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireFreshDeskEmployee } from "@/lib/requireFreshDeskEmployee";

import Link from "next/link";
import {
  desiredOutcomesLabels,
  primaryMotivationLabels,
  skinExperienceLabels,
} from "@/lib/journeyReviewMappings";
type FreshDeskCustomerPageProps = {
  params: Promise<{ id: string }>;
};

export default async function FreshDeskCustomerPage({
  params,
}: FreshDeskCustomerPageProps) {
    const employeeSession = await requireFreshDeskEmployee();

if (!employeeSession) {
  redirect("/fresh-desk/login");
}
  const { id } = await params;

  const { data: customer, error } = await supabaseAdmin
    .from("customers")
    .select("id, first_name, last_name, email, created_at")
    .eq("id", id)
   .eq("business_id", employeeSession.employee.business_id) 
    .single();
    if (error || !customer) {
  return (
    <main className="min-h-screen bg-[#FAF7F1] px-6 py-10 text-[#302C2A]">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/fresh-desk"
          className="inline-flex items-center text-sm font-semibold text-[#5A5553] transition hover:text-[#2F2A28]"
        >
          ← Back to Fresh Desk
        </Link>

        <h1 className="mt-4 text-3xl">Customer not found</h1>
      </div>
    </main>
  );
}
const { data: shopifyOrders, error: shopifyOrdersError } =
  await supabaseAdmin
    .from("shopify_orders")
    .select(`
      id,
      shopify_order_number,
      financial_status,
      fulfillment_status,
      total_price,
      currency,
      order_created_at
    `)
    .eq("customer_id", id)
    .eq("business_id", employeeSession.employee.business_id)
    .order("order_created_at", { ascending: false });

if (shopifyOrdersError) {
  throw new Error(
    `Could not load Shopify purchase history: ${shopifyOrdersError.message}`
  );
}
const shopifyOrderIds = (shopifyOrders ?? []).map(
  (order) => order.id
);

const { data: shopifyOrderItems, error: orderItemsError } =
  shopifyOrderIds.length > 0
    ? await supabaseAdmin
        .from("shopify_order_items")
        .select(`
          id,
          shopify_order_id,
          product_name,
          variant_name,
          quantity,
          current_quantity,
          unit_price,
          total_price,
          item_type
        `)
        .in("shopify_order_id", shopifyOrderIds)
    : { data: [], error: null };

if (orderItemsError) {
  throw new Error(
    `Could not load Shopify order items: ${orderItemsError.message}`
  );
}
    const { data: latestSkinPlan, error: skinPlanError } = await supabaseAdmin
  .from("skin_plans")
  .select("*")
  .eq("customer_id", id)
  .order("version", { ascending: false })
  .limit(1)
  .maybeSingle();
  const { data: latestConsultation } = latestSkinPlan?.consultation_id
  ? await supabaseAdmin
      .from("consultations")
      .select(
        "id, consultation_source, professional_review_status, professional_reviewed_at"
      )
      .eq("id", latestSkinPlan.consultation_id)
      .maybeSingle()
  : { data: null };
  const { data: consultationHistory } = await supabaseAdmin
  .from("consultations")
  .select("id, status, consultation_source, completed_at, created_at")
  .eq("customer_id", id)
  .order("completed_at", { ascending: false });
  const { data: skinPlanHistory } = await supabaseAdmin
  .from("skin_plans")
  .select("id, consultation_id, version, created_at")
  .eq("customer_id", id)
  .order("version", { ascending: false });
  const { data: consultationResult } = latestSkinPlan?.consultation_id
  ? await supabaseAdmin
      .from("consultation_results")
      .select(
        "primary_journey, secondary_journey, result_summary, recommendation_engine_version"
      )
      .eq("consultation_id", latestSkinPlan.consultation_id)
      .maybeSingle()
  : { data: null };
  const { data: journeyScores } = latestSkinPlan?.consultation_id
  ? await supabaseAdmin
      .from("consultation_journey_scores")
      .select("journey, score, role")
      .eq("consultation_id", latestSkinPlan.consultation_id)
      .order("score", { ascending: false })
  : { data: [] };
  const { data: consultationAnswers } = latestSkinPlan?.consultation_id
  ? await supabaseAdmin
      .from("consultation_answers")
      .select(
        "id, question_key, question_text, answer_key, answer_text, answer_keys"
      )
      .eq("consultation_id", latestSkinPlan.consultation_id)
      .order("created_at", { ascending: true })
  : { data: [] };
const { data: skinPlanProducts } = latestSkinPlan
  ? await supabaseAdmin
      .from("skin_plan_products")
      .select(
        "id, routine_step, routine_order, product_name_snapshot, brand_snapshot, recommendation_reason, customer_guidance"
      )
      .eq("skin_plan_id", latestSkinPlan.id)
      .order("routine_order", { ascending: true })
  : { data: [] };
  const { data: skinPlanEnhancements } = latestSkinPlan
  ? await supabaseAdmin
      .from("skin_plan_enhancements")
      .select(
        "id, enhancement_name_snapshot, recommendation_order, customer_guidance, status"
      )
      .eq("skin_plan_id", latestSkinPlan.id)
      .order("recommendation_order", { ascending: true })
  : { data: [] };
  return (
    <main className="min-h-screen bg-[#FAF7F1] px-6 py-10 text-[#302C2A]">
      <div className="mx-auto max-w-6xl">
        <Link
  href="/fresh-desk"
  className="inline-flex items-center text-sm font-semibold text-[#5A5553] transition hover:text-[#2F2A28]"
>
  ← Back to Fresh Desk
</Link>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#908A9B]">
          Fresh Desk
        </p>

   {error || !customer ? (
  <h1 className="mt-4 text-3xl">Customer not found</h1>
        ) : (
          <>
            <h1
              className="mt-3 text-4xl"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {customer.first_name} {customer.last_name}
            </h1>

            <p className="mt-3 text-[#5A5553]">{customer.email}</p>
{/* Shopify Purchase History */}
<div className="mt-8 rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-6">
  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#908A9B]">
    Purchase History
  </p>

  <h2 className="mt-2 text-xl font-semibold">
    Shopify Orders
  </h2>

  {shopifyOrders && shopifyOrders.length > 0 ? (
    <div className="mt-5 space-y-3">
      {shopifyOrders.map((order) => (
        <div
          key={order.id}
          className="rounded-xl border border-[#E6E0E3] bg-white p-4"
        >
          <div className="flex items-center justify-between gap-4">
            <p className="font-semibold">
              {order.shopify_order_number}
            </p>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                order.financial_status === "PAID"
                  ? "bg-green-100 text-green-800"
                  : order.financial_status === "REFUNDED"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-700"
              }`}
            >
              {order.financial_status ?? "Unknown"}
            </span>
          </div>

          <p className="mt-2 text-sm text-[#5A5553]">
            {order.order_created_at
              ? new Date(order.order_created_at).toLocaleDateString(
                  "en-US",
                  {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  }
                )
              : "Date unavailable"}
          </p>

          <p className="mt-2 text-lg font-semibold">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: order.currency ?? "USD",
            }).format(Number(order.total_price ?? 0))}
          </p>

          {order.fulfillment_status && (
            <p className="mt-2 text-sm text-[#5A5553]">
              Fulfillment: {order.fulfillment_status}
            </p>
          )}
          {/* Purchased Products and Event Tickets */}
{(() => {
  const items = (shopifyOrderItems ?? []).filter(
    (item) => item.shopify_order_id === order.id
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-[#E6E0E3] pt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#908A9B]">
        Items Purchased
      </p>

      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start justify-between gap-4"
          >
            <div>
              <p className="text-sm font-semibold">
                {item.product_name}
              </p>

              {item.variant_name &&
                item.variant_name !== "Default Title" && (
                  <p className="mt-1 text-xs text-[#5A5553]">
                    {item.variant_name}
                  </p>
                )}

              <p className="mt-1 text-xs text-[#5A5553]">
                Quantity: {item.quantity}
              </p>

              {item.item_type === "event" && (
                <span className="mt-2 inline-block rounded-full bg-[#F1E8D9] px-3 py-1 text-xs font-semibold text-[#6A5540]">
                  Event Ticket
                </span>
              )}

              {item.current_quantity < item.quantity && (
                <p className="mt-1 text-xs font-semibold text-red-700">
                  {item.current_quantity === 0
                    ? "Item removed or refunded"
                    : `Current quantity: ${item.current_quantity}`}
                </p>
              )}
            </div>

            <p className="whitespace-nowrap text-sm font-semibold">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: order.currency ?? "USD",
              }).format(Number(item.total_price ?? 0))}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
})()}
        </div>
      ))}
    </div>
  ) : (
    <p className="mt-4 text-sm text-[#5A5553]">
      No Shopify purchases recorded for this customer.
    </p>
  )}
</div>
<div className="mt-8 rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-6">
  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#908A9B]">
    Current Skin Plan
  </p>

  {latestSkinPlan ? (
    <div className="mt-4">
      <p className="text-xl font-semibold">
        Skin Plan v{latestSkinPlan.version}
      </p>

      <p className="mt-2 text-sm text-[#5A5553]">
  {latestConsultation?.professional_review_status === "reviewed"
    ? "Professionally reviewed and personalized by Fresh Facial Bar."
    : "Online Skin Discovery results · Professional review not yet completed."}
</p>
      {latestSkinPlan.consultation_id && (
  <Link
    href={`/fresh-desk/customers/${id}/consultations/${latestSkinPlan.consultation_id}`}
    className="mt-4 inline-block text-sm font-semibold text-[#5A5553] hover:text-[#2F2A28]"
  >
    View Current Plan →
  </Link>
)}
    </div>
  ) : (
    <p className="mt-4 text-sm text-[#5A5553]">
      No Skin Plan has been created yet.
    </p>
  )}
</div>

{consultationAnswers && consultationAnswers.length > 0 && (
  <div className="mt-8 rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-6">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#908A9B]">
      Consultation
    </p>

    <div className="mt-4 space-y-5">
      {consultationAnswers.map((answer) => {
        const labels =
          answer.question_key === "primary_motivation"
            ? primaryMotivationLabels
            : answer.question_key === "skin_experience"
              ? skinExperienceLabels
              : answer.question_key === "desired_outcomes"
                ? desiredOutcomesLabels
                : {};

        const answerValues =
          answer.answer_keys && answer.answer_keys.length > 0
            ? answer.answer_keys
            : answer.answer_key
              ? [answer.answer_key]
              : [];

        return (
          <div key={answer.id}>
            <p className="font-semibold">
              {answer.question_text ?? answer.question_key}
            </p>

            <p className="mt-1 text-sm leading-6 text-[#5A5553]">
              {answerValues
                .map((value: string) => labels[value] ?? value)
                .join(" ")}
            </p>
          </div>
        );
      })}
    </div>
  </div>
)}
{consultationResult && (
  <div className="mt-8 rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-6">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#908A9B]">
      Fresh Method
    </p>

    <div className="mt-2">
  {(journeyScores ?? [])
    .filter((journey) => journey.role === "primary")
    .map((journey) => (
      <h2
        key={journey.journey}
        className="text-xl font-semibold capitalize"
      >
        {journey.journey}
      </h2>
    ))}
</div>

{(journeyScores ?? []).some(
  (journey) => journey.role === "supporting"
) && (
  <p className="mt-2 text-sm text-[#5A5553]">
    Supporting Journey:{" "}
    {(journeyScores ?? [])
      .filter((journey) => journey.role === "supporting")
      .map((journey) => journey.journey)
      .join(", ")}
  </p>
)}
  </div>
)}
 
        {latestSkinPlan && (
  <div className="mt-8">
    <h2 className="text-xl font-semibold">Recommended Products</h2>

    <div className="mt-4 space-y-3">
      {skinPlanProducts?.map((product) => (
        <div
          key={product.id}
          className="rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#908A9B]">
            {product.routine_step}
          </p>

          <p className="mt-2 font-semibold">
            {product.product_name_snapshot}
          </p>

          {product.brand_snapshot && (
            <p className="mt-1 text-sm text-[#5A5553]">
              {product.brand_snapshot}
            </p>
          )}
        </div>
      ))}
    </div>
  </div>
)}
 {latestSkinPlan && (
  <div className="mt-8">
    <h2 className="text-xl font-semibold">Personalization Suggestions</h2>

    <div className="mt-4 space-y-3">
      {skinPlanEnhancements?.map((enhancement) => (
        <div
          key={enhancement.id}
          className="rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-5"
        >
          <p className="font-semibold">
            {enhancement.enhancement_name_snapshot}
          </p>

          {enhancement.customer_guidance && (
            <p className="mt-2 text-sm leading-6 text-[#5A5553]">
              {enhancement.customer_guidance}
            </p>
          )}
        </div>
      ))}
    </div>
  </div>
)}
{consultationHistory && consultationHistory.length > 0 && (
  <div className="mt-10">
    <h2 className="text-xl font-semibold">Consultation History</h2>

    <div className="mt-4 space-y-3">
      {consultationHistory.map((consultation) => {
        const relatedSkinPlan = skinPlanHistory?.find(
          (plan) => plan.consultation_id === consultation.id
        );

        return (
  <Link
    key={consultation.id}
    href={`/fresh-desk/customers/${id}/consultations/${consultation.id}`}
    className="block rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-5 transition hover:border-[#908A9B]"
  >
    <p className="font-semibold">
      {new Date(
        consultation.completed_at ?? consultation.created_at
      ).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })}
    </p>

    <p className="mt-1 text-sm text-[#5A5553]">
      {consultation.status === "completed"
        ? "Completed"
        : consultation.status}
      {" · "}
      {consultation.consultation_source === "web"
        ? "Skin Discovery"
        : consultation.consultation_source}
    </p>

    <p className="mt-2 text-sm font-semibold text-[#908A9B]">
  {relatedSkinPlan
    ? relatedSkinPlan.id === latestSkinPlan?.id
      ? `Current Plan · Skin Plan v${relatedSkinPlan.version}`
      : `Skin Plan v${relatedSkinPlan.version}`
    : "No Skin Plan"}
</p>
  </Link>
);
        
      })}
    </div>
  </div>
)}
          </>
        )}
      </div>
    </main>
  );
 
}