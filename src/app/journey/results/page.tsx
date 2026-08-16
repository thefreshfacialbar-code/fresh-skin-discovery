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
import { readStoredRecommendation } from "@/lib/recommendationSession";
import { clearProductRecommendationSession } from "@/lib/productRecommendationSession";

type JourneyKey = "quench" | "calm" | "purify" | "illuminate" | "renew";

type JourneyContent = {
  name: string;
  eyebrow: string;
  headline: string;
  description: string;
  focusAreas: string[];
  editorialLine: string;
  icon: string;
};

const JOURNEY_CONTENT: Record<JourneyKey, JourneyContent> = {
  quench: {
    name: "Quench",
    eyebrow: "Hydration + Comfort",
    headline: "Your skin is asking for deeper hydration.",
    description:
      "Your answers point toward skin that may benefit from more consistent hydration, replenishment and support for a comfortable, healthy-looking barrier.",
    focusAreas: ["Hydration", "Comfort", "Barrier support", "Softness and suppleness"],
    editorialLine:
      "The goal: skin that feels replenished, comfortable and beautifully balanced.",
    icon: "quench",
  },
  calm: {
    name: "Calm",
    eyebrow: "Comfort + Resilience",
    headline: "Your skin is asking for a gentler approach.",
    description:
      "Your answers suggest that comfort, sensitivity support and a more considered routine should lead the way.",
    focusAreas: ["Calm", "Comfort", "Sensitivity support", "Barrier resilience"],
    editorialLine:
      "The goal: skin that feels soothed, supported and less easily unsettled.",
    icon: "calm",
  },
  purify: {
    name: "Purify",
    eyebrow: "Clarity + Balance",
    headline: "Your skin is asking for more clarity and balance.",
    description:
      "Your answers point toward congestion, breakouts or excess oil playing an important role in your skin story.",
    focusAreas: ["Clarity", "Congestion support", "Oil balance", "Healthy-looking pores"],
    editorialLine:
      "The goal: clearer-looking skin that still feels comfortable and supported.",
    icon: "purify",
  },
  illuminate: {
    name: "Illuminate",
    eyebrow: "Radiance + Tone",
    headline: "Your skin is asking to rediscover its glow.",
    description:
      "Your answers suggest that brightness, luminosity and a fresher-looking complexion are important parts of your journey.",
    focusAreas: ["Radiance", "Brightness", "Tone", "Healthy-looking glow"],
    editorialLine:
      "The goal: a complexion that looks fresher, brighter and naturally luminous.",
    icon: "illuminate",
  },
  renew: {
    name: "Renew",
    eyebrow: "Smoothness + Healthy Aging",
    headline: "Your skin is asking for thoughtful renewal.",
    description:
      "Your answers point toward texture, firmness and visible signs of aging becoming more important in your skincare goals.",
    focusAreas: ["Smoothness", "Firmness", "Texture", "Healthy aging support"],
    editorialLine:
      "The goal: skin that looks smoother, supported and beautifully refreshed.",
    icon: "renew",
  },
};

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

function JourneyGlyph({ journeyId, className = "" }: { journeyId: JourneyKey; className?: string }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  if (journeyId === "quench") {
    return (
      <svg {...commonProps}>
        <path d="M12 2.7S6.5 9 6.5 13.6A5.5 5.5 0 0 0 17.5 13.6C17.5 9 12 2.7 12 2.7Z" />
        <path d="M12 8.3v4.2" />
      </svg>
    );
  }

  if (journeyId === "calm") {
    return (
      <svg {...commonProps}>
        <path d="M12 5.2c1.8 1.5 2.7 3.2 2.7 5.1 0 1.1-.3 2.1-.8 3" />
        <path d="M12 5.2c-1.8 1.5-2.7 3.2-2.7 5.1 0 1.1.3 2.1.8 3" />
        <path d="M8.9 9.4c-2 .5-3.5 1.5-4.7 3 1.3 2.2 3.2 3.5 5.8 3.8" />
        <path d="M15.1 9.4c2 .5 3.5 1.5 4.7 3-1.3 2.2-3.2 3.5-5.8 3.8" />
        <path d="M9.8 13.4c.6 1.9 1.3 3.2 2.2 4.1.9-.9 1.6-2.2 2.2-4.1" />
        <path d="M6.4 16.1c1.7 1.7 3.6 2.6 5.6 2.6s3.9-.9 5.6-2.6" />
      </svg>
    );
  }

  if (journeyId === "purify") {
    return (
      <svg {...commonProps}>
        <path d="M12 3 19 6v5c0 4.6-2.9 8-7 10-4.1-2-7-5.4-7-10V6l7-3Z" />
        <path d="M9.5 12.5h5" />
        <path d="m12 10 0 5" />
      </svg>
    );
  }

  if (journeyId === "illuminate") {
    return (
      <svg {...commonProps}>
        <path d="m12 3 1.05 3.05L16 7.1l-2.95 1.05L12 11.2l-1.05-3.05L8 7.1l2.95-1.05L12 3Z" />
        <path d="m18 13 .8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13Z" />
        <path d="m6 13 .65 1.85L8.5 15.5l-1.85.65L6 18l-.65-1.85-1.85-.65 1.85-.65L6 13Z" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M20 4.5C13 4.5 7 7.5 5 13c-1 2.7.2 5.6 2.6 6.5 2.5.9 5.4-.1 6.9-2.4C17.1 13.1 18.5 8.7 20 4.5Z" />
      <path d="M6.5 18.5c2.7-3.6 5.6-6.3 9-8.5" />
    </svg>
  );
}

function JourneyCard({
  journeyId,
  isPrimary = false,
  isSecondary = false,
}: {
  journeyId: JourneyKey;
  isPrimary?: boolean;
  isSecondary?: boolean;
}) {
  const content = JOURNEY_CONTENT[journeyId];

  return (
    <article
      className={[
        "rounded-[2rem] border border-[#DAD6DB] bg-[#FFFDFC] p-6 shadow-[0_18px_42px_rgba(61,52,48,0.06)] sm:p-7",
        isPrimary ? "ring-1 ring-[#DAD6DB]" : "",
        isSecondary ? "border-[#E5E0E4] bg-[#F9F4F5]" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#908A9B]">
            {content.eyebrow}
          </p>
          <h3
            className="mt-4 text-3xl leading-tight text-[#302C2A]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {content.name}
          </h3>
        </div>
        <div
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-full border border-[#DAD6DB] bg-[#F5F2F4] text-xl text-[#908A9B]"
        >
          <JourneyGlyph journeyId={journeyId} className={journeyId === "renew" ? "h-5 w-5" : "text-xl"} />
        </div>
      </div>

      <h4 className="mt-6 text-2xl leading-tight text-[#302C2A] sm:text-[2rem]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
        {content.headline}
      </h4>

      <p className="mt-4 text-base leading-8 text-[#5A5553]">{content.description}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {content.focusAreas.map((focus) => (
          <span
            key={focus}
            className="inline-flex items-center rounded-full border border-[#DAD6DB] bg-[#F6F3F5] px-3 py-2 text-[0.65rem] font-medium uppercase tracking-[0.12em] text-[#473E41]"
          >
            {focus}
          </span>
        ))}
      </div>

      <p className="mt-6 border-t border-[#E8E2E5] pt-5 text-[0.72rem] uppercase tracking-[0.14em] text-[#5A5553]">
        {content.editorialLine}
      </p>
    </article>
  );
}

function clearSkinDiscoverySession() {
  if (typeof window === "undefined") {
    return;
  }

  const keys = [
    "skinDiscoveryPrimaryMotivation",
    "skinDiscoverySkinExperience",
    "skinDiscoveryDesiredOutcomes",
    "skinDiscoveryRecommendation",
    "skinDiscoveryProductRecommendations",
    "skinDiscoveryEnhancementRecommendations",
    "skinDiscoveryContact",
    "skinDiscoverySubmission",
  ];

  keys.forEach((key) => window.sessionStorage.removeItem(key));
}

export default function ResultsPage() {
  const router = useRouter();
  const recommendation = useMemo(() => readStoredRecommendation(), []);
  const journeySummary = useMemo(() => readJourneySummary(), []);

  const primaryMotivation = journeySummary ? mapPrimaryMotivation(journeySummary.primaryMotivation) : null;
  const skinExperience = journeySummary ? mapSelectedValues(journeySummary.skinExperience, skinExperienceLabels) : [];
  const desiredOutcomes = journeySummary ? mapSelectedValues(journeySummary.desiredOutcomes, desiredOutcomesLabels) : [];

  if (!recommendation) {
    return (
      <main className="min-h-screen bg-[#FAF7F1] px-5 py-6 text-[#302C2A] sm:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex justify-center">
            <div className="flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48 lg:h-56 lg:w-56">
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

          <section className="mt-5 text-center">
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.42em] text-[#908A9B] sm:text-sm">
              YOUR JOURNEY
            </p>

            <p className="mt-6 text-[0.8rem] font-semibold uppercase tracking-[0.32em] text-[#908A9B] sm:text-[0.95rem]">
              FRESH THOUGHT
            </p>

            <p
              className="mt-4 text-[1.4rem] italic leading-snug text-[#403A3D] sm:text-[2rem]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              “Thoughtfully crafted. Personally yours.”
            </p>
          </section>

          <div className="mx-auto mt-10 max-w-3xl rounded-[2rem] border border-[#DAD6DB] bg-[#FFFDFC] p-7 shadow-[0_16px_40px_rgba(61,52,48,0.06)] sm:p-10">
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.3em] text-[#908A9B]">
              We need a little more of your story first.
            </p>
            <p className="mt-5 text-base leading-8 text-[#5A5553] sm:text-lg">
              Complete your Skin Discovery Journey so we can thoughtfully reveal your personalized direction.
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

  const primaryJourneys: JourneyKey[] = Array.isArray(recommendation.primaryJourneys)
    ? (recommendation.primaryJourneys as JourneyKey[])
    : [];
  const primaryJourney = primaryJourneys[0] ?? null;
  const secondaryJourney = recommendation.secondaryJourney as JourneyKey | null;

  return (
    <main className="min-h-screen bg-[#FAF7F1] px-5 py-6 text-[#302C2A] sm:px-8 md:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex justify-center">
          <div className="flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48 lg:h-56 lg:w-56">
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

        <section className="mt-5 text-center">
          <p className="text-[0.8rem] font-semibold uppercase tracking-[0.42em] text-[#908A9B] sm:text-sm">
            YOUR JOURNEY
          </p>

          <p className="mt-6 text-[0.8rem] font-semibold uppercase tracking-[0.32em] text-[#908A9B] sm:text-[0.95rem]">
            FRESH THOUGHT
          </p>

          <p
            className="mt-4 text-[1.4rem] italic leading-snug text-[#403A3D] sm:text-[2rem]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            “Thoughtfully crafted. Personally yours.”
          </p>

          <h1
            className="mt-6 text-4xl leading-tight text-[#302C2A] sm:text-[3rem]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Your Skin Discovery Journey
          </h1>

          <p className="mx-auto mt-4 max-w-4xl text-base leading-8 text-[#5A5553] sm:text-lg">
            Everything you shared helped us uncover the direction your skin may be asking for today. Your
            Skintender can personalize this journey even further as your skin changes.
          </p>
        </section>

        {recommendation.resultType === "single-primary" && primaryJourney ? (
          <div className="mt-8">
            <div className="mb-4 text-center">
              <p className="text-[0.75rem] font-semibold uppercase tracking-[0.32em] text-[#908A9B]">
                YOUR PRIMARY JOURNEY
              </p>
            </div>

            <div className="mx-auto max-w-5xl">
              <JourneyCard journeyId={primaryJourney} isPrimary />
            </div>

            {secondaryJourney && secondaryJourney !== primaryJourney ? (
              <div className="mx-auto mt-8 max-w-3xl">
                <p className="text-center text-[0.75rem] font-semibold uppercase tracking-[0.32em] text-[#908A9B]">
                  ALSO SUPPORTING YOUR JOURNEY
                </p>

                <div className="mt-4 rounded-[2rem] border border-[#E7DFE2] bg-[#F9F4F5] p-5 shadow-[0_12px_30px_rgba(61,52,48,0.04)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#908A9B]">
                        {JOURNEY_CONTENT[secondaryJourney].eyebrow}
                      </p>
                      <h3
                        className="mt-3 text-2xl text-[#302C2A]"
                        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                      >
                        {JOURNEY_CONTENT[secondaryJourney].name}
                      </h3>
                    </div>
                    <div
                      aria-hidden="true"
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-[#DAD6DB] bg-[#F5F2F4] text-lg text-[#908A9B]"
                    >
                      {JOURNEY_CONTENT[secondaryJourney].icon}
                    </div>
                  </div>

                  <p className="mt-4 text-base leading-8 text-[#5A5553]">
                    Your answers also consistently point toward {JOURNEY_CONTENT[secondaryJourney].name}, so your
                    Skintender may thoughtfully weave elements of this journey into your recommendations.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {recommendation.resultType === "dual-primary" ? (
          <div className="mt-12">
            <div className="text-center">
              <h2 className="text-3xl leading-tight text-[#302C2A] sm:text-[2.5rem]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                Your skin is asking for two things.
              </h2>
              <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-[#5A5553] sm:text-lg">
                Your answers revealed two equally meaningful directions. Rather than choosing one over the other,
                your Skin Discovery Journey brings them together.
              </p>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {primaryJourneys.map((journeyId, index) => (
                <div key={journeyId} className="flex items-center gap-4 lg:gap-5">
                  <div className="flex-1">
                    <JourneyCard journeyId={journeyId} isPrimary />
                  </div>
                  {index === 0 ? (
                    <div className="hidden items-center justify-center text-3xl text-[#908A9B] lg:flex">+</div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-6 text-center">
              <p className="text-lg italic text-[#403A3D]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                Your Skintender can thoughtfully blend both directions into one personalized approach.
              </p>
            </div>
          </div>
        ) : null}

        {recommendation.resultType === "no-strong-journey" ? (
          <div className="mt-12">
            <div className="mx-auto max-w-3xl rounded-[2rem] border border-[#DAD6DB] bg-[#FFFDFC] p-7 shadow-[0_18px_42px_rgba(61,52,48,0.06)] sm:p-10">
              <p className="text-[0.8rem] font-semibold uppercase tracking-[0.32em] text-[#908A9B]">
                YOUR JOURNEY
              </p>

              <h2
                className="mt-6 text-4xl leading-tight text-[#302C2A] sm:text-[3rem]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Your skin story deserves a little more discovery.
              </h2>

              <p className="mt-5 text-base leading-8 text-[#5A5553] sm:text-lg">
                Your answers don&apos;t point strongly to just one Skin Journey—and that&apos;s completely okay. Skin
                can be nuanced, and sometimes the most thoughtful recommendation begins with a closer conversation.
              </p>

              <p className="mt-5 text-base leading-8 text-[#5A5553] sm:text-lg">
                Your Skintender can use everything you&apos;ve shared to personalize your next step.
              </p>

              <button
                type="button"
                onClick={() => router.push("/journey/results/recommendations")}
                className="mt-8 inline-flex items-center justify-center rounded-full bg-[#908A9B] px-8 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_10px_28px_rgba(144,138,155,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#817B8B]"
              >
                Let&apos;s Personalize My Journey →
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-12 rounded-[2rem] border border-[#DAD6DB] bg-[#FFFDFC] p-6 shadow-[0_18px_42px_rgba(61,52,48,0.06)] sm:p-8 lg:p-10">
          <h2
            className="text-3xl leading-tight text-[#302C2A] sm:text-[2.3rem]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            What We Heard
          </h2>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="rounded-[1.5rem] border border-[#DAD6DB] bg-[#F9F5F2] p-5">
              <p className="text-[0.8rem] font-semibold uppercase tracking-[0.26em] text-[#908A9B]">
                What brought you here
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {primaryMotivation ? <SummaryPill>{primaryMotivation}</SummaryPill> : <SummaryPill>Your skin story</SummaryPill>}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[#DAD6DB] bg-[#F9F5F2] p-5">
              <p className="text-[0.8rem] font-semibold uppercase tracking-[0.26em] text-[#908A9B]">
                What your skin is telling us
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {skinExperience.length > 0 ? (
                  skinExperience.map((label) => <SummaryPill key={label}>{label}</SummaryPill>)
                ) : (
                  <SummaryPill>Not yet narrowed down</SummaryPill>
                )}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[#DAD6DB] bg-[#F9F5F2] p-5">
              <p className="text-[0.8rem] font-semibold uppercase tracking-[0.26em] text-[#908A9B]">
                What you&apos;d love to improve
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {desiredOutcomes.length > 0 ? (
                  desiredOutcomes.map((label) => <SummaryPill key={label}>{label}</SummaryPill>)
                ) : (
                  <SummaryPill>Still discovering</SummaryPill>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <div className="mx-auto max-w-4xl rounded-[2rem] border border-[#DAD6DB] bg-[#FFFDFC] p-6 shadow-[0_18px_42px_rgba(61,52,48,0.06)] sm:p-8">
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.32em] text-[#908A9B]">
              YOUR NEXT STEP
            </p>

            <h2
              className="mt-5 text-3xl leading-tight text-[#302C2A] sm:text-[2.4rem]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Your journey is just beginning.
            </h2>

            <p className="mt-5 text-base leading-8 text-[#5A5553] sm:text-lg">
              Your Skin Discovery gives your Skintender a thoughtful starting point. From here, your recommendations
              can be refined around your skin, your goals and how your complexion changes over time.
            </p>

            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => router.push("/journey/results/recommendations")}
                className="inline-flex items-center justify-center rounded-full bg-[#908A9B] px-8 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_10px_28px_rgba(144,138,155,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#817B8B]"
              >
                View My Recommendations →
              </button>

              <button
                type="button"
                onClick={() => {
                  clearSkinDiscoverySession();
                  clearProductRecommendationSession();
                  router.push("/journey/listening");
                }}
                className="text-sm font-medium uppercase tracking-[0.18em] text-[#908A9B] underline-offset-4 transition hover:text-[#403A3D] hover:underline"
              >
                Start My Discovery Again
              </button>
            </div>
          </div>
        </div>

        <div className="pb-12 pt-10 text-center">
          <p
            className="text-[1.05rem] italic text-[#403A3D] sm:text-[1.3rem]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            Freshly considered. Thoughtfully curated. Uniquely yours.
          </p>
        </div>
      </div>
    </main>
  );
}
