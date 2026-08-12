"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  mapPrimaryMotivation,
  mapSelectedValues,
  readJourneySummary,
  skinExperienceLabels,
  desiredOutcomesLabels,
} from "@/lib/journeyReviewMappings";

function SummaryPill({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center rounded-full border border-[#DAD6DB] bg-[#F5F2F4] px-3 py-2 text-sm leading-5 text-[#403A3D]"
      style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
    >
      {children}
    </span>
  );
}

export default function ReviewingPage() {
  const router = useRouter();
  const journeySummary = useMemo(() => readJourneySummary(), []);

  const hasJourneyData = Boolean(journeySummary);

  const primaryMotivation = journeySummary
    ? mapPrimaryMotivation(journeySummary.primaryMotivation)
    : null;

  const skinExperience = journeySummary
    ? mapSelectedValues(journeySummary.skinExperience, skinExperienceLabels)
    : [];

  const desiredOutcomes = journeySummary
    ? mapSelectedValues(journeySummary.desiredOutcomes, desiredOutcomesLabels)
    : [];

  if (!hasJourneyData) {
    return (
      <main className="min-h-screen bg-[#FAF7F1] px-5 py-8 text-[#302C2A] sm:px-8 md:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex justify-center">
            <div className="flex h-52 w-52 items-center justify-center sm:h-60 sm:w-60 lg:h-72 lg:w-72">
              <Image
                src="/ffb-logo.png"
                alt="Fresh Facial Bar & Lash Lounge"
                width={512}
                height={512}
                priority
                className="h-auto w-full opacity-90"
              />
            </div>
          </div>

          <section className="mt-8 text-center">
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.42em] text-[#908A9B] sm:text-sm">
              REVIEWING
            </p>

            <p className="mt-8 text-[0.8rem] font-semibold uppercase tracking-[0.32em] text-[#908A9B] sm:text-[0.95rem]">
              FRESH THOUGHT
            </p>

            <p
              className="mt-6 text-[1.6rem] italic leading-snug text-[#403A3D] sm:text-[2.05rem]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              “Your skin has been telling us a story. Now, let&apos;s bring it together.”
            </p>
          </section>

          <div className="mx-auto mt-10 max-w-3xl rounded-[2rem] border border-[#DAD6DB] bg-[#FFFDFC] p-7 shadow-[0_16px_40px_rgba(61,52,48,0.06)] sm:p-10">
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.32em] text-[#908A9B]">
              We need a little more of your story first.
            </p>
            <p className="mt-4 text-base leading-8 text-[#5A5553] sm:text-lg">
              Return to your Skin Discovery Journey so we can thoughtfully craft your recommendation.
            </p>
            <button
              type="button"
              onClick={() => router.push("/journey/listening")}
              className="mt-8 inline-flex items-center justify-center rounded-full bg-[#908A9B] px-8 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_10px_28px_rgba(144,138,155,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#817B8B]"
            >
              Return to My Journey
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF7F1] px-5 py-8 text-[#302C2A] sm:px-8 md:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex justify-center">
          <div className="flex h-52 w-52 items-center justify-center sm:h-60 sm:w-60 lg:h-72 lg:w-72">
            <Image
              src="/ffb-logo.png"
              alt="Fresh Facial Bar & Lash Lounge"
              width={512}
              height={512}
              priority
              className="h-auto w-full opacity-90"
            />
          </div>
        </div>

        <section className="mt-8 text-center">
          <p className="text-[0.8rem] font-semibold uppercase tracking-[0.42em] text-[#908A9B] sm:text-sm">
            REVIEWING
          </p>

          <p className="mt-8 text-[0.8rem] font-semibold uppercase tracking-[0.32em] text-[#908A9B] sm:text-[0.95rem]">
            FRESH THOUGHT
          </p>

          <p
            className="mt-6 text-[1.6rem] italic leading-snug text-[#403A3D] sm:text-[2.05rem]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            “Your skin has been telling us a story. Now, let&apos;s bring it together.”
          </p>

          <h1
            className="mt-8 text-4xl leading-tight text-[#302C2A] sm:text-[3rem]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Here&apos;s what we discovered together.
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-[#5A5553] sm:text-lg">
            Your answers give us a thoughtful starting point. Your Farmacist can use this discovery to personalize your recommendations even further.
          </p>
        </section>

        <div className="mt-12 rounded-[2rem] border border-[#DAD6DB] bg-[#FFFDFC] p-6 shadow-[0_18px_42px_rgba(61,52,48,0.06)] sm:p-8 lg:p-10">
          <h2
            className="text-3xl leading-tight text-[#302C2A] sm:text-[2.2rem]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Your Skin Story
          </h2>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="rounded-[1.5rem] border border-[#DAD6DB] bg-[#F9F5F2] p-5">
              <p className="text-[0.8rem] font-semibold uppercase tracking-[0.26em] text-[#908A9B]">
                What brought you here
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <SummaryPill>{primaryMotivation}</SummaryPill>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[#DAD6DB] bg-[#F9F5F2] p-5">
              <p className="text-[0.8rem] font-semibold uppercase tracking-[0.26em] text-[#908A9B]">
                What your skin is telling us
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {skinExperience.map((label) => (
                  <SummaryPill key={label}>{label}</SummaryPill>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[#DAD6DB] bg-[#F9F5F2] p-5">
              <p className="text-[0.8rem] font-semibold uppercase tracking-[0.26em] text-[#908A9B]">
                What you&apos;d love to improve
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {desiredOutcomes.map((label) => (
                  <SummaryPill key={label}>{label}</SummaryPill>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[2rem] border border-[#DAD6DB] bg-[#FFFDFC] p-6 shadow-[0_18px_42px_rgba(61,52,48,0.06)] sm:p-8">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-[#DAD6DB]" />
            <span className="text-[0.8rem] font-semibold uppercase tracking-[0.28em] text-[#908A9B]">
              Your Recommended Starting Point
            </span>
            <div className="h-px flex-1 bg-[#DAD6DB]" />
          </div>

          <div className="mt-6 rounded-[1.5rem] border border-[#DAD6DB] bg-[#F7F3F6] p-6 text-center">
            <p className="text-[1.85rem] leading-tight text-[#302C2A]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              Your personalized Skin Journey is ready to be revealed.
            </p>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#5A5553] sm:text-lg">
              We&apos;ve brought your answers together and are ready to show you the direction that best fits your skin today.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center pb-12">
          <button
            type="button"
            onClick={() => router.push("/journey/results")}
            className="inline-flex items-center justify-center rounded-full bg-[#908A9B] px-9 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_10px_28px_rgba(144,138,155,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#817B8B]"
          >
            Reveal My Journey →
          </button>

          <p className="mt-6 text-sm text-[#77706F]">
            Thoughtfully crafted from everything you shared.
          </p>
        </div>
      </div>
    </main>
  );
}
