import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
type SkinPlanPageProps = {
  params: Promise<{
    consultationId: string;
  }>;
};

export default async function SkinPlanPage({
  params,
}: SkinPlanPageProps) {
  const { consultationId } = await params;
const { data: consultation, error } = await supabaseAdmin
  .from("consultations")
  .select(`
    id,
    status,
    consultation_source,
    completed_at,
    professional_review_status,
    professional_reviewed_at
  `)
  .eq("id", consultationId)
  .single();

if (error || !consultation) {
  return (
    <main className="min-h-screen bg-[#FAF7F1] px-5 py-8 text-[#302C2A] sm:px-8">
      <div className="mx-auto max-w-6xl">
        <h1
          className="text-4xl text-[#302C2A]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Skin Plan Not Found
        </h1>
      </div>
    </main>
  );
}
if (consultation.professional_review_status !== "reviewed") {
  return (
    <main className="min-h-screen bg-[#FAF7F1] px-5 py-8 text-[#302C2A] sm:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-[0.8rem] font-semibold uppercase tracking-[0.32em] text-[#908A9B]">
          YOUR SKIN PLAN
        </p>

        <h1
          className="mt-6 text-4xl leading-tight text-[#302C2A]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Your plan is being thoughtfully reviewed.
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#5A5553]">
          Your Fresh professional is reviewing your personalized routine before
          it is ready for you.
        </p>
      </div>
    </main>
  );
}
const { data: skinPlan, error: skinPlanError } = await supabaseAdmin
  .from("skin_plans")
  .select("id, version, created_at")
  .eq("consultation_id", consultationId)
  .order("version", { ascending: false })
  .limit(1)
  .maybeSingle();
  if (skinPlanError || !skinPlan) {
  return (
    <main className="min-h-screen bg-[#FAF7F1] px-5 py-8 text-[#302C2A] sm:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h1
          className="text-4xl text-[#302C2A]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Your Skin Plan Is Not Available Yet
        </h1>

        <p className="mt-5 text-base leading-8 text-[#5A5553]">
          We couldn't load your personalized routine right now.
        </p>
      </div>
    </main>
  );
}
  const { data: skinPlanProducts, error: skinPlanProductsError } = skinPlan
  ? await supabaseAdmin
      .from("skin_plan_products")
      .select(
        "id, product_id, routine_step, routine_order, product_name_snapshot, brand_snapshot, price_snapshot, recommendation_reason, customer_guidance, usage_type, status, professional_note, reviewed_at, replaces_skin_plan_product_id"
      )
      .eq("skin_plan_id", skinPlan.id)
.not("status", "in", '("replaced","removed")')
.order("routine_order", { ascending: true })
  : { data: [], error: null };
  if (skinPlanProductsError) {
  return (
    <main className="min-h-screen bg-[#FAF7F1] px-5 py-8 text-[#302C2A] sm:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h1
          className="text-4xl text-[#302C2A]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          We Couldn't Load Your Routine
        </h1>

        <p className="mt-5 text-base leading-8 text-[#5A5553]">
          Your Skin Plan exists, but the routine couldn't be loaded right now.
        </p>
      </div>
    </main>
  );
}
  return (
    <main className="min-h-screen bg-[#FAF7F1] px-5 py-8 text-[#302C2A] sm:px-8">
      <div className="mx-auto max-w-6xl">
       <section className="text-center">
  <p className="text-[0.8rem] font-semibold uppercase tracking-[0.42em] text-[#908A9B]">
    YOUR FRESH METHOD
  </p>

  <p className="mt-6 text-[0.8rem] font-semibold uppercase tracking-[0.32em] text-[#908A9B]">
    PROFESSIONALLY REVIEWED
  </p>

  <h1
    className="mt-5 text-4xl leading-tight text-[#302C2A] sm:text-[3rem]"
    style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
  >
    Your Personalized Skin Plan
  </h1>

  <p className="mx-auto mt-5 max-w-3xl text-base leading-8 text-[#5A5553] sm:text-lg">
    Your Skin Discovery has been thoughtfully reviewed and refined into a
    routine designed around your skin, your goals, and where you are today.
  </p>
</section>


<section className="mx-auto mt-14 max-w-5xl">
  <div className="text-center">
    <p className="text-[0.75rem] font-semibold uppercase tracking-[0.32em] text-[#908A9B]">
      YOUR ROUTINE
    </p>

    <h2
      className="mt-4 text-3xl text-[#302C2A] sm:text-4xl"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      Your Fresh Method
    </h2>

    <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#5A5553]">
  Your personalized essentials and targeted additions, selected to support your
  skin goals.
</p>
  </div>

  <div className="mt-8 grid gap-5 md:grid-cols-2">
    {skinPlanProducts.map((product) => (
      <div
        key={product.id}
        className="rounded-[2rem] border border-[#DAD6DB] bg-[#FFFDFC] p-6 shadow-[0_12px_30px_rgba(61,52,48,0.04)]"
      >
        <div>
  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.25em] text-[#908A9B]">
    {product.routine_step === "fresh-pick"
      ? "FRESH PICK"
      : product.routine_step}
  </p>
</div>

        <h3
          className="mt-5 text-2xl leading-tight text-[#302C2A]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {product.product_name_snapshot}
        </h3>

        {product.brand_snapshot ? (
          <p className="mt-2 text-sm font-medium uppercase tracking-[0.12em] text-[#908A9B]">
            {product.brand_snapshot}
          </p>
        ) : null}
{product.usage_type ? (
  <p className="mt-4 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#908A9B]">
    {product.usage_type === "Daily"
      ? "Daily Essential"
      : product.usage_type === "Weekly"
        ? "Weekly Treatment"
        : product.usage_type === "Periodic"
          ? "Periodic Treatment"
          : product.usage_type === "As Needed"
            ? "As Needed"
            : product.usage_type === "Weekly / Periodic"
              ? "Weekly / Periodic"
              : product.usage_type === "Daily / As Needed"
                ? "Daily / As Needed"
                : product.usage_type === "Mixo Guided"
                  ? "Mixo Guided"
                  : product.usage_type}
  </p>
) : null}
        {product.customer_guidance ? (
          <p className="mt-5 text-sm leading-7 text-[#5A5553]">
            {product.customer_guidance}
          </p>
        ) : null}
      </div>
    ))}
  </div>
</section>
      </div>
    </main>
  );
}