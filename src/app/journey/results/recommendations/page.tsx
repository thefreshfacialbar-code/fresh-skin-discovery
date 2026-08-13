import Link from "next/link";

export default function RecommendationsPlaceholderPage() {
  return (
    <main className="min-h-screen bg-[#FAF7F1] px-5 py-10 text-[#302C2A] sm:px-8">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-[#DAD6DB] bg-[#FFFDFC] p-8 text-center shadow-[0_20px_60px_rgba(61,52,48,0.06)] sm:p-12">
        <p className="text-[0.8rem] font-semibold uppercase tracking-[0.36em] text-[#908A9B]">
          YOUR RECOMMENDATIONS
        </p>

        <h1
          className="mt-6 text-4xl leading-tight text-[#302C2A] sm:text-5xl"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Your personalized recommendations are coming next.
        </h1>

        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/journey/listening"
            className="inline-flex items-center justify-center rounded-full bg-[#908A9B] px-8 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_10px_28px_rgba(144,138,155,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#817B8B]"
          >
            Return to My Journey
          </Link>
        </div>
      </div>
    </main>
  );
}
