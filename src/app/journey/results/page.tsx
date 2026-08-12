"use client";

import { getJourneyName } from "@/lib/recommendationEngine";
import { readStoredRecommendation } from "@/lib/recommendationSession";
import type { JourneyId } from "@/types/recommendation";
import { useMemo } from "react";

const journeyLabel = {
  quench: "Quench",
  calm: "Calm",
  purify: "Purify",
  illuminate: "Illuminate",
  renew: "Renew",
} as const;

export default function ResultsPage() {
  const recommendation = useMemo(() => readStoredRecommendation(), []);

  if (!recommendation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF7F1] px-6 py-12 text-[#302C2A]">
        <div className="w-full max-w-2xl rounded-[2rem] border border-[#DAD6DB] bg-[#fffdf9]/95 p-10 text-center shadow-[0_24px_75px_rgba(144,138,155,0.14)]">
          <p className="text-[0.8rem] font-semibold uppercase tracking-[0.4em] text-[#908A9B]">
            YOUR JOURNEY
          </p>
          <h1 className="mt-6 font-serif text-4xl leading-tight text-[#302C2A] sm:text-5xl">
            Your skin story deserves a little more discovery.
          </h1>
          <p className="mt-4 text-base leading-8 text-[#5A5553] sm:text-lg">
            Your answers don&apos;t point strongly to just one Skin Journey—and that&apos;s completely okay.
            Your Farmacist can use everything you&apos;ve shared to thoughtfully personalize your next step.
          </p>
        </div>
      </main>
    );
  }

  const primaryJourneys: JourneyId[] = Array.isArray(recommendation.primaryJourneys)
    ? (recommendation.primaryJourneys as JourneyId[])
    : [];
  const secondaryJourney: JourneyId | null = recommendation.secondaryJourney ?? null;
  const primaryJourney = primaryJourneys[0] ?? null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAF7F1] px-6 py-12 text-[#302C2A]">
      <div className="w-full max-w-3xl rounded-[2rem] border border-[#DAD6DB] bg-[#fffdf9]/95 p-10 text-center shadow-[0_24px_75px_rgba(144,138,155,0.14)]">
        <p className="text-[0.8rem] font-semibold uppercase tracking-[0.4em] text-[#908A9B]">
          YOUR JOURNEY
        </p>

        {recommendation.resultType === "dual-primary" ? (
          <>
            <h1 className="mt-6 font-serif text-4xl leading-tight text-[#302C2A] sm:text-5xl">
              Your Skin Is Asking for Two Things
            </h1>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              {primaryJourneys.map((journeyId) => (
                <span
                  key={journeyId}
                  className="inline-flex items-center justify-center rounded-full border border-[#DAD6DB] bg-[#F5F2F4] px-5 py-3 text-base font-semibold uppercase tracking-[0.14em] text-[#302C2A]"
                >
                  {journeyLabel[journeyId as keyof typeof journeyLabel]}
                </span>
              ))}
            </div>
          </>
        ) : recommendation.resultType === "single-primary" ? (
          <>
            <h1 className="mt-6 font-serif text-4xl leading-tight text-[#302C2A] sm:text-5xl">
              Your Primary Journey
            </h1>
            <div className="mt-8">
              <span className="inline-flex items-center justify-center rounded-full border border-[#DAD6DB] bg-[#F5F2F4] px-6 py-3 text-base font-semibold uppercase tracking-[0.14em] text-[#302C2A]">
                {primaryJourney ? getJourneyName(primaryJourney) : "Your Journey"}
              </span>
            </div>

            {secondaryJourney ? (
              <div className="mt-8">
                <p className="text-[0.8rem] font-semibold uppercase tracking-[0.32em] text-[#908A9B]">
                  Also Supporting Your Journey
                </p>
                <div className="mt-4">
                  <span className="inline-flex items-center justify-center rounded-full border border-[#DAD6DB] bg-[#F5F2F4] px-5 py-3 text-base font-semibold uppercase tracking-[0.14em] text-[#302C2A]">
                    {getJourneyName(secondaryJourney)}
                  </span>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <h1 className="mt-6 font-serif text-4xl leading-tight text-[#302C2A] sm:text-5xl">
              Your skin story deserves a little more discovery.
            </h1>
            <p className="mt-4 text-base leading-8 text-[#5A5553] sm:text-lg">
              Your answers don&apos;t point strongly to just one Skin Journey—and that&apos;s completely okay.
              Your Farmacist can use everything you&apos;ve shared to thoughtfully personalize your next step.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
