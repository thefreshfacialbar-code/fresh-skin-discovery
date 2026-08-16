"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { generateEnhancementRecommendation } from "@/lib/enhancementRecommendationEngine";
import {
  clearEnhancementRecommendationSession,
  readStoredEnhancementRecommendation,
  writeEnhancementRecommendationToStorage,
} from "@/lib/enhancementRecommendationSession";
import { generateProductRecommendation } from "@/lib/productRecommendationEngine";
import {
  clearProductRecommendationSession,
  readStoredProductRecommendation,
  writeProductRecommendationToStorage,
} from "@/lib/productRecommendationSession";
import { readStoredRecommendation } from "@/lib/recommendationSession";
import type { RecommendedEnhancement } from "@/types/enhancementRecommendation";
import type { ProductRecommendationResult, RecommendedProduct } from "@/types/productRecommendation";

const FEATURED_TITLES = {
  cleanse: "CLEANSE",
  treat: "TREAT",
  moisturize: "MOISTURIZE",
  protect: "PROTECT",
} as const;

function ProductCard({
  step,
  product,
}: {
  step: keyof typeof FEATURED_TITLES;
  product: RecommendedProduct | null;
}) {
  if (!product) {
    return (
      <div className="rounded-[2rem] border border-dashed border-[#DAD6DB] bg-[#FFFDFC] p-6 text-left shadow-[0_12px_30px_rgba(61,52,48,0.04)]">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#908A9B]">{FEATURED_TITLES[step]}</p>
        <p className="mt-4 text-lg text-[#5A5553]">Not selected yet.</p>
      </div>
    );
  }

  const usageText =
    product.usageType === "daily"
      ? "Daily treatment"
      : product.usageType === "weekly"
        ? "Weekly ritual"
        : product.usageType === "farmacist-guided"
          ? "Skintender-guided treatment"
          : product.usageType === "periodic"
            ? "Targeted treatment"
            : "Targeted treatment";

  return (
    <div className="rounded-[2rem] border border-[#DAD6DB] bg-[#FFFDFC] p-6 text-left shadow-[0_18px_42px_rgba(61,52,48,0.06)]">
      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#908A9B]">{FEATURED_TITLES[step]}</p>
      <h3 className="mt-4 text-[1.75rem] leading-tight text-[#302C2A]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
        {product.productName}
      </h3>
      <p className="mt-3 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#908A9B]">{product.category}</p>
      <p className="mt-2 text-[0.7rem] font-medium uppercase tracking-[0.18em] text-[#7E7A80]">{usageText}</p>
      <p className="mt-4 text-base leading-8 text-[#5A5553]">{product.guestBenefit}</p>
      <div className="mt-5 border-t border-[#E8E2E5] pt-4">
        <p className="text-[0.8rem] font-semibold uppercase tracking-[0.22em] text-[#908A9B]">Why we picked it</p>
        <ul className="mt-3 space-y-2 text-base leading-7 text-[#5A5553]">
          {product.matchReasons.map((reason) => (
            <li key={reason}>• {reason}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function RecommendationsPage() {
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const [productRecommendation, setProductRecommendation] = useState<ProductRecommendationResult | null>(null);
  const [enhancementRecommendations, setEnhancementRecommendations] = useState<RecommendedEnhancement[]>([]);

  useEffect(() => {
    const storedEnhancements = readStoredEnhancementRecommendation();
    if (storedEnhancements.length > 0) {
      setEnhancementRecommendations(storedEnhancements);
    }

    const stored = readStoredProductRecommendation();
    if (stored) {
      setProductRecommendation(stored);
      setIsHydrated(true);
      return;
    }

    const journeyRecommendation = readStoredRecommendation();
    if (!journeyRecommendation) {
      setProductRecommendation(null);
      setIsHydrated(true);
      return;
    }

    const generated = generateProductRecommendation({
      journeyResult: journeyRecommendation,
      selectedAnswers: {
        primaryMotivation: journeyRecommendation.selectedAnswers.primaryMotivation,
        skinExperience: journeyRecommendation.selectedAnswers.skinExperience,
        desiredOutcomes: journeyRecommendation.selectedAnswers.desiredOutcomes,
      },
    });

    writeProductRecommendationToStorage(generated);
    setProductRecommendation(generated);

    const generatedEnhancements = generateEnhancementRecommendation({
      journeyResult: journeyRecommendation,
      selectedAnswers: {
        primaryMotivation: journeyRecommendation.selectedAnswers.primaryMotivation,
        skinExperience: journeyRecommendation.selectedAnswers.skinExperience,
        desiredOutcomes: journeyRecommendation.selectedAnswers.desiredOutcomes,
      },
    });

    writeEnhancementRecommendationToStorage(generatedEnhancements);
    setEnhancementRecommendations(generatedEnhancements);
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return (
      <main className="min-h-screen bg-[#FAF7F1] px-5 py-8 text-[#302C2A] sm:px-8 md:py-12">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-[#DAD6DB] bg-[#FFFDFC] p-8 text-center shadow-[0_20px_60px_rgba(61,52,48,0.06)] sm:p-12">
          <div className="flex justify-center">
            <div className="flex h-32 w-32 items-center justify-center sm:h-36 sm:w-36">
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
          <p className="mt-6 text-[0.8rem] font-semibold uppercase tracking-[0.38em] text-[#908A9B]">YOUR FRESH PICKS</p>
          <h1 className="mt-6 text-4xl leading-tight text-[#302C2A] sm:text-5xl" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Thoughtfully gathering your Fresh Picks...
          </h1>
        </div>
      </main>
    );
  }

  if (!productRecommendation) {
    return (
      <main className="min-h-screen bg-[#FAF7F1] px-5 py-8 text-[#302C2A] sm:px-8 md:py-12">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-[#DAD6DB] bg-[#FFFDFC] p-8 text-center shadow-[0_20px_60px_rgba(61,52,48,0.06)] sm:p-12">
          <p className="text-[0.8rem] font-semibold uppercase tracking-[0.38em] text-[#908A9B]">YOUR FRESH PICKS</p>
          <h1 className="mt-6 text-4xl leading-tight text-[#302C2A] sm:text-5xl" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Freshly picked for your skin.
          </h1>
          <p className="mt-6 text-base leading-8 text-[#5A5553] sm:text-lg">
            Your Skin Discovery Journey needs a little more information before we can build your starting point.
          </p>
          <button
            type="button"
            onClick={() => router.push("/journey/listening")}
            className="mt-8 inline-flex items-center justify-center rounded-full bg-[#908A9B] px-8 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_10px_28px_rgba(144,138,155,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#817B8B]"
          >
            Return to My Journey
          </button>
        </div>
      </main>
    );
  }

  if (productRecommendation.resultType === "needs-farmacist-personalization") {
    return (
      <main className="min-h-screen bg-[#FAF7F1] px-5 py-8 text-[#302C2A] sm:px-8 md:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex justify-center pt-2">
            <div className="flex h-44 w-44 items-center justify-center sm:h-54 sm:w-54 lg:h-68 lg:w-68">
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

          <section className="mt-3 text-center">
            <p className="text-[0.8rem] font-semibold uppercase tracking-[0.42em] text-[#908A9B] sm:text-sm">
              YOUR FRESH PICKS
            </p>
            <p className="mt-6 text-[0.8rem] font-semibold uppercase tracking-[0.32em] text-[#908A9B] sm:text-[0.95rem]">
              FRESH THOUGHT
            </p>
            <p className="mt-4 text-[1.3rem] italic leading-snug text-[#403A3D] sm:text-[1.9rem]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              “Freshly picked for your skin.”
            </p>
            <h1 className="mt-6 text-4xl leading-tight text-[#302C2A] sm:text-[3rem]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              Your home-care edit deserves a little more personalization.
            </h1>
            <p className="mx-auto mt-5 max-w-4xl text-base leading-8 text-[#5A5553] sm:text-lg">
              Your Discovery didn&apos;t point strongly enough in one direction for us to thoughtfully choose products automatically. Your Skintender can use everything you&apos;ve shared to build the right starting point with you.
            </p>
          </section>

          <div className="mt-10 flex justify-center pb-8">
            <button
              type="button"
              onClick={() => {
                clearProductRecommendationSession();
                router.push("/journey/listening");
              }}
              className="inline-flex items-center justify-center rounded-full bg-[#908A9B] px-8 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_10px_28px_rgba(144,138,155,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#817B8B]"
            >
              Start My Discovery Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF7F1] px-5 py-8 text-[#302C2A] sm:px-8 md:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex justify-center pt-2">
          <div className="flex h-44 w-44 items-center justify-center sm:h-54 sm:w-54 lg:h-68 lg:w-68">
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

        <section className="mt-3 text-center">
          <p className="text-[0.8rem] font-semibold uppercase tracking-[0.42em] text-[#908A9B] sm:text-sm">
            YOUR FRESH PICKS
          </p>
          <p className="mt-6 text-[0.8rem] font-semibold uppercase tracking-[0.32em] text-[#908A9B] sm:text-[0.95rem]">
            FRESH THOUGHT
          </p>
          <p className="mt-4 text-[1.3rem] italic leading-snug text-[#403A3D] sm:text-[1.9rem]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            “Freshly picked for your skin.”
          </p>
          <h1 className="mt-6 text-4xl leading-tight text-[#302C2A] sm:text-[3rem]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            A few thoughtful places to begin.
          </h1>
          <p className="mx-auto mt-5 max-w-4xl text-base leading-8 text-[#5A5553] sm:text-lg">
            Your Discovery helped us narrow our product library to a few Fresh Picks that align with what your skin is asking for today. Your Skintender can fine-tune these selections around what you&apos;re already using, your preferences and how your skin is feeling.
          </p>
        </section>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <ProductCard step="cleanse" product={productRecommendation.featured.cleanse} />
          <ProductCard step="treat" product={productRecommendation.featured.treat} />
          <ProductCard step="moisturize" product={productRecommendation.featured.moisturize} />
          <ProductCard step="protect" product={productRecommendation.featured.protect} />
        </div>

        {enhancementRecommendations.length > 0 ? (
          <div className="mt-12 rounded-[2rem] border border-[#DAD6DB] bg-[#FFFDFC] p-6 shadow-[0_18px_42px_rgba(61,52,48,0.06)] sm:p-8 lg:p-10">
            <h2 className="text-3xl leading-tight text-[#302C2A] sm:text-[2.2rem]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
              Worth Considering
            </h2>
            <p className="mt-4 text-base leading-8 text-[#5A5553] sm:text-lg">
              Your Skintender can help determine whether these Enhancements make sense for your custom facial.
            </p>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              {enhancementRecommendations.map((enhancement) => (
                <div key={enhancement.enhancementId} className="rounded-[2rem] border border-[#DAD6DB] bg-[#F9F5F2] p-5 text-left">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#908A9B]">{enhancement.category === "results-driven" ? "RESULTS-DRIVEN" : "COMFORT / EXPERIENCE"}</p>
                  <h3 className="mt-3 text-[1.65rem] leading-tight text-[#302C2A]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                    {enhancement.name}
                  </h3>
                  <p className="mt-4 text-base leading-8 text-[#5A5553]">{enhancement.guestBenefit}</p>
                  <div className="mt-5 border-t border-[#E8E2E5] pt-4">
                    <p className="text-[0.8rem] font-semibold uppercase tracking-[0.22em] text-[#908A9B]">Why it fits your Journey</p>
                    <ul className="mt-3 space-y-2 text-base leading-7 text-[#5A5553]">
                      {enhancement.matchReasons.map((reason) => (
                        <li key={reason}>• {reason}</li>
                      ))}
                    </ul>
                  </div>
                  {enhancement.name === "FarmHouse Fresh Peel" ? (
                    <p className="mt-4 text-sm italic text-[#5A5553]">Your Skintender can determine which peel, if any, best complements your Journey.</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-12 rounded-[2rem] border border-[#DAD6DB] bg-[#FFFDFC] p-6 shadow-[0_18px_42px_rgba(61,52,48,0.06)] sm:p-8 lg:p-10">
          <h2 className="text-3xl leading-tight text-[#302C2A] sm:text-[2.2rem]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            More Fresh Picks for Your Journey
          </h2>
          <p className="mt-4 text-base leading-8 text-[#5A5553] sm:text-lg">
            A few additional options your Skintender may consider as your routine evolves.
          </p>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {productRecommendation.moreFreshPicks.map((product) => (
              <div key={product.productId} className="rounded-[2rem] border border-[#DAD6DB] bg-[#F9F5F2] p-5 text-left">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#908A9B]">{product.category}</p>
                    <h3 className="mt-3 text-[1.6rem] leading-tight text-[#302C2A]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
                      {product.productName}
                    </h3>
                  </div>
                  {product.farmacistReviewRecommended ? (
                    <span className="rounded-full border border-[#DAD6DB] bg-[#F5F2F4] px-3 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-[#908A9B]">
                      Skintender review
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 text-base leading-8 text-[#5A5553]">{product.guestBenefit}</p>
                {product.farmacistReviewRecommended ? (
                  <p className="mt-4 text-sm italic text-[#5A5553]">Ask your Skintender if this Fresh Pick is right for your routine.</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center pb-8">
          <button
            type="button"
            onClick={() => {
              clearProductRecommendationSession();
              clearEnhancementRecommendationSession();
              router.push("/journey/listening");
            }}
            className="inline-flex items-center justify-center rounded-full bg-[#908A9B] px-8 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_10px_28px_rgba(144,138,155,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#817B8B]"
          >
            Start My Discovery Again
          </button>
        </div>
      </div>
    </main>
  );
}
