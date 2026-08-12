"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function JourneyTransition({
  stage,
  freshThought,
  nextRoute,
}: {
  stage: string;
  freshThought: string;
  nextRoute: string;
}) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (mediaQuery.matches) {
      const timer = window.setTimeout(() => {
        router.push(nextRoute);
      }, 1000);

      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => {
      setIsVisible(false);
      const exitTimer = window.setTimeout(() => {
        router.push(nextRoute);
      }, 220);

      return () => window.clearTimeout(exitTimer);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [nextRoute, router]);

  return (
    <main
      className={[
        "flex min-h-screen items-center justify-center bg-[#FAF7F1] px-6 py-12 text-[#302C2A] transition-opacity duration-500 ease-out",
        isVisible ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
      <div className="w-full max-w-4xl text-center">
        <div className="flex justify-center">
          <div className="flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48 lg:h-56 lg:w-56">
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
          {stage}
        </p>

        <div className="mt-10">
          <p className="text-[0.8rem] font-semibold uppercase tracking-[0.32em] text-[#908A9B] sm:text-[0.95rem]">
            FRESH THOUGHT
          </p>

          <p className="mt-6 font-serif text-[1.5rem] italic leading-snug text-[#403A3D] sm:text-[1.75rem]">
            “{freshThought}”
          </p>
        </div>
      </div>
    </main>
  );
}
