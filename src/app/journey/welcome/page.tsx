import Link from "next/link";

export default function JourneyWelcomePage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,_#f7efe7_0%,_#f2e8dd_100%)] px-4 py-8 text-stone-700 sm:px-6 lg:px-8">
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center justify-center">
        <section className="w-full rounded-[2rem] border border-[#DAD6DB] bg-[#fcf8f2]/95 p-8 text-center shadow-[0_24px_75px_rgba(144,138,155,0.14)] sm:p-10 lg:p-16">
          <p className="text-[0.8rem] font-semibold uppercase tracking-[0.4em] text-[#908A9B] sm:text-sm">
            Your Skin Discovery Journey
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-tight text-stone-800 sm:text-5xl">
            Welcome to your next step.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-stone-600 sm:text-lg">
            This placeholder page will soon guide you into the next stage of the experience.
          </p>
          <Link
            href="/discovery"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-[#908A9B] px-8 py-4 text-base font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#7d7688]"
          >
            Back to Selection
          </Link>
        </section>
      </main>
    </div>
  );
}
