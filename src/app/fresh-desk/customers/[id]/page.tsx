import "server-only";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
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
  const { id } = await params;

  const { data: customer, error } = await supabaseAdmin
    .from("customers")
    .select("id, first_name, last_name, email, created_at")
    .eq("id", id)
    .single();
    const { data: latestSkinPlan, error: skinPlanError } = await supabaseAdmin
  .from("skin_plans")
  .select("*")
  .eq("customer_id", id)
  .order("version", { ascending: false })
  .limit(1)
  .maybeSingle();
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

<p className="mt-6 text-sm font-semibold text-[#908A9B]">
  {skinPlanError
    ? `Skin Plan error: ${skinPlanError.message}`
    : latestSkinPlan
      ? `Skin Plan v${latestSkinPlan.version}`
      : "No Skin Plan yet"}
</p>

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
          </>
        )}
      </div>
    </main>
  );
 
}