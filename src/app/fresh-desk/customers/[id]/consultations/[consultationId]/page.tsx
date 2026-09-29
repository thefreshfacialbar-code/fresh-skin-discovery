import "server-only";
import Link from "next/link";
import ProfessionalReviewActions from "@/components/ProfessionalReviewActions";
import ProductReviewActions from "@/components/ProductReviewActions";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  desiredOutcomesLabels,
  primaryMotivationLabels,
  skinExperienceLabels,
} from "@/lib/journeyReviewMappings";
type ConsultationDetailPageProps = {
  params: Promise<{
    id: string;
    consultationId: string;
    professional_review_note: string | null;
  }>;
};

export default async function ConsultationDetailPage({
  params,
}: ConsultationDetailPageProps) {
  const { id, consultationId } = await params;

  const { data: consultation, error } = await supabaseAdmin
    .from("consultations")
   .select(
  "id, customer_id, status, consultation_source, completed_at, created_at, professional_review_status, professional_reviewed_at, professional_review_note"
)
    .eq("id", consultationId)
    .eq("customer_id", id)
    .maybeSingle();
const { data: consultationAnswers } = await supabaseAdmin
  .from("consultation_answers")
  .select(
    "id, question_key, question_text, answer_key, answer_text, answer_keys"
  )
  .eq("consultation_id", consultationId)
  .order("created_at", { ascending: true });
  const { data: journeyScores } = await supabaseAdmin
  .from("consultation_journey_scores")
  .select("journey, score, role")
  .eq("consultation_id", consultationId)
  .order("score", { ascending: false });
  const { data: skinPlan } = await supabaseAdmin
  .from("skin_plans")
  .select("id, version, created_at")
  .eq("consultation_id", consultationId)
  .maybeSingle();

let skinPlanProducts: {
  id: string;
  routine_step: string;
  routine_order: number | null;
  product_name_snapshot: string;
  brand_snapshot: string | null;
  price_snapshot: number | null;
  recommendation_reason: string | null;
  customer_guidance: string | null;
  product_id: string | null;
status: string;
professional_note: string | null;
reviewed_at: string | null;
replaces_skin_plan_product_id: string | null;
}[] = [];

if (skinPlan?.id) {
  const { data } = await supabaseAdmin
    .from("skin_plan_products")
    .select(
     "id, product_id, routine_step, routine_order, product_name_snapshot, brand_snapshot, price_snapshot, recommendation_reason, customer_guidance, status, professional_note, reviewed_at, replaces_skin_plan_product_id"
    )
    .eq("skin_plan_id", skinPlan.id)
    .neq("status", "replaced")
    .order("routine_order", { ascending: true });

  skinPlanProducts = data ?? [];
}
let skinPlanEnhancements: {
  id: string;
  enhancement_name_snapshot: string;
  recommendation_order: number | null;
  customer_guidance: string | null;
  status: string;
}[] = [];

if (skinPlan?.id) {
  const { data } = await supabaseAdmin
    .from("skin_plan_enhancements")
    .select(
      "id, enhancement_name_snapshot, recommendation_order, customer_guidance, status"
    )
    .eq("skin_plan_id", skinPlan.id)
    .order("recommendation_order", { ascending: true });

  skinPlanEnhancements = data ?? [];
}
const allProductsReviewed =
  skinPlanProducts.length > 0 &&
  skinPlanProducts.every(
    (product) => product.status !== "recommended"
  );
  return (
    <main className="min-h-screen bg-[#F7F4F2] px-6 py-12 text-[#2F2A28]">
      <div className="mx-auto max-w-3xl">
        <Link
  href={`/fresh-desk/customers/${id}`}
  className="mb-6 inline-block text-sm text-[#5A5553] hover:text-[#2F2A28]"
>
  ← Back to Customer
</Link>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#908A9B]">
          Fresh Desk
        </p>

        <h1
          className="mt-3 text-4xl"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Consultation Detail
        </h1>

        {error ? (
          <p className="mt-8">Consultation could not be loaded.</p>
        ) : !consultation ? (
          <p className="mt-8">Consultation not found.</p>
        ) : (
            <>
          <div className="mt-8 rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-6">
            <p className="font-semibold">
              {new Date(
                consultation.completed_at ?? consultation.created_at
              ).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>

            <p className="mt-2 text-sm text-[#5A5553]">
              {consultation.status === "completed"  
                ? "Completed"
                : consultation.status}
              {" · "}
              {consultation.consultation_source === "web"
                ? "Skin Discovery"
                : consultation.consultation_source}
            </p>
           <div className="mt-5 border-t border-[#E8E4E7] pt-4">
  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#908A9B]">
    Professional Review
  </p>

  <p className="mt-2 font-semibold">
    {consultation.professional_review_status === "reviewed"
      ? "Reviewed"
      : allProductsReviewed
        ? "Ready to Finalize"
        : "Review Needed"}
  </p>

  <p className="mt-1 text-sm text-[#5A5553]">
    {consultation.professional_review_status === "reviewed"
      ? consultation.professional_reviewed_at
        ? `Reviewed ${new Date(
            consultation.professional_reviewed_at
          ).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}`
        : "Professionally reviewed and personalized."
      : "Review the recommended products and personalization suggestions before finalizing this Skin Plan."}
  </p>

  {consultation.professional_review_status === "reviewed" &&
    consultation.professional_review_note && (
      <div className="mt-4 rounded-xl border border-[#DAD6DB] bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#908A9B]">
          Professional Review Notes
        </p>

        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#5A5553]">
          {consultation.professional_review_note}
        </p>
      </div>
    )}

  {consultation.professional_review_status !== "reviewed" && (
    <ProfessionalReviewActions
      consultationId={consultation.id}
      readyToFinalize={allProductsReviewed}
      initialReviewNote={consultation.professional_review_note}
    />
  )}
</div>
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
{journeyScores && journeyScores.length > 0 && (
  <div className="mt-8 rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-6">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#908A9B]">
      Fresh Method
    </p>

    <div className="mt-4 space-y-3">
      {journeyScores.map((journey) => (
        <div
          key={journey.journey}
          className="flex items-center justify-between"
        >
          <p className="font-semibold capitalize">{journey.journey}</p>

          <p className="text-sm capitalize text-[#5A5553]">
            {journey.role}
          </p>
        </div>
      ))}
    </div>
  </div>
)}
{skinPlan && (
  <div className="mt-8 rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-6">
    <div className="flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#908A9B]">
        Recommended Products
      </p>

      <p className="text-sm text-[#5A5553]">
        Skin Plan v{skinPlan.version}
      </p>
    </div>

    {skinPlanProducts.length > 0 ? (
      <div className="mt-4 space-y-5">
        {skinPlanProducts.map((product) => (
  <div key={product.id}>
    <p className="font-semibold">
      {product.product_name_snapshot}
    </p>

    <p className="mt-1 text-sm text-[#5A5553]">
      {product.brand_snapshot}
      {product.routine_step ? ` · ${product.routine_step}` : ""}
    </p>

    {product.customer_guidance && (
      <p className="mt-2 text-sm leading-6 text-[#5A5553]">
        {product.customer_guidance}
      </p>
    )}
    {consultation.professional_review_status !== "reviewed" && (
        
  <ProductReviewActions
  productId={product.id}
  status={product.status}
  productCatalogId={product.product_id}
  routineStep={product.routine_step}
/>
)}
  </div>
))}
      </div>
    ) : (
      <p className="mt-4 text-sm text-[#5A5553]">
        No products were saved with this Skin Plan.
      </p>
    )}
  </div>
)}

{skinPlanEnhancements.length > 0 && (
  <div className="mt-8 rounded-2xl border border-[#DAD6DB] bg-[#FFFDFC] p-6">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#908A9B]">
      Personalization Suggestions
    </p>

    <div className="mt-4 space-y-5">
      {skinPlanEnhancements.map((enhancement) => (
        <div key={enhancement.id}>
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