"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const progressSteps = [
  "Reviewing your Skin Discovery Journey...",
  "Thoughtfully selecting your recommendations...",
  "Crafting your personalized journey...",
  "Preparing your next step...",
];

export default function CuratingTransitionPage() {
  const router = useRouter();
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [isVisible, setIsVisible] = useState(true);
  const [activeStep, setActiveStep] = useState(
    prefersReducedMotion ? progressSteps.length - 1 : 0,
  );

  useEffect(() => {
    if (prefersReducedMotion) {
      const timer = window.setTimeout(() => {
        router.push("/journey/reviewing");
      }, 1200);

      return () => window.clearTimeout(timer);
    }

    const timers: number[] = [];

    progressSteps.forEach((_, index) => {
      const timer = window.setTimeout(() => {
        setActiveStep(index);
      }, index * 1200);

      timers.push(timer);
    });

    const exitTimer = window.setTimeout(() => {
      setIsVisible(false);
      const navigateTimer = window.setTimeout(() => {
        router.push("/journey/reviewing");
      }, 350);

      timers.push(navigateTimer);
    }, progressSteps.length * 1200 + 1000);

    timers.push(exitTimer);

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [prefersReducedMotion, router]);

  return (
    <main
      className={[
        "flex min-h-screen items-center justify-center bg-[#FAF7F1] px-6 py-12 text-[#302C2A] transition-opacity duration-500 ease-out",
        isVisible ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
      <div className="w-full max-w-4xl text-center">
        <div className="flex justify-center">
          <div className="flex h-60 w-60 items-center justify-center sm:h-72 sm:w-72 lg:h-80 lg:w-80">
            <Image
              src="/ffb-logo.png"
              alt="Fresh Facial Bar & Lash Lounge logo"
              width={512}
              height={512}
              priority
              className="h-auto w-full opacity-90"
            />
          </div>
        </div>

        <p className="mt-8 text-[0.8rem] font-semibold uppercase tracking-[0.42em] text-[#908A9B] sm:text-sm">
          CURATING
        </p>

        <div className="mt-10">
          <p className="text-[0.8rem] font-semibold uppercase tracking-[0.32em] text-[#908A9B] sm:text-[0.95rem]">
            FRESH THOUGHT
          </p>

          <h1
            className="mt-6 text-[#403A3D] sm:text-[2.2rem]"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            <span className="block text-[2rem] italic leading-[1.06] sm:text-[2.85rem]">
              Your Farmacist is crafting something fresh.
            </span>
            <span className="mt-2 block text-[1.55rem] italic leading-[1.15] sm:text-[2.2rem]">
              Just. For. You.
            </span>
          </h1>
        </div>

        <div className="mx-auto mt-12 max-w-xl space-y-3 text-left sm:text-center">
          {progressSteps.map((step, index) => {
            const isPast = index < activeStep;
            const isCurrent = index === activeStep;
            const isFuture = index > activeStep;

            return (
              <p
                key={step}
                className={[
                  "transition-opacity duration-700 ease-out",
                  isPast ? "opacity-60" : "",
                  isCurrent ? "opacity-100" : "",
                  isFuture ? "opacity-0" : "",
                  "text-[1.1rem] tracking-[0.01em] text-[#403A3D]",
                ].join(" ")}
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {index < 1 ? "● " : index < 2 ? "●● " : index < 3 ? "●●● " : "●●●● "}
                {step}
              </p>
            );
          })}
        </div>
      </div>
    </main>
  );
}
