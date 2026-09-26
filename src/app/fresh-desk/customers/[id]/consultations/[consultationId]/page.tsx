import "server-only";

import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ConsultationDetailPageProps = {
  params: Promise<{
    id: string;
    consultationId: string;
  }>;
};

export default async function ConsultationDetailPage({
  params,
}: ConsultationDetailPageProps) {
  const { id, consultationId } = await params;

  const { data: consultation, error } = await supabaseAdmin
    .from("consultations")
    .select(
      "id, customer_id, status, consultation_source, completed_at, created_at"
    )
    .eq("id", consultationId)
    .eq("customer_id", id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-[#F7F4F2] px-6 py-12 text-[#2F2A28]">
      <div className="mx-auto max-w-3xl">
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
          </div>
        )}
      </div>
    </main>
  );
}