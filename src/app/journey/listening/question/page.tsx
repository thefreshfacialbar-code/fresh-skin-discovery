"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

type IconName =
  | "droplet"
  | "flower"
  | "sparkles"
  | "shield"
  | "leaf"
  | "heart"
  | "compass";

type Answer = {
  id: string;
  icon: IconName;
  title: string;
  description: string;
};

const answers: Answer[] = [
  {
    id: "dry-dehydrated",
    icon: "droplet",
    title: "My skin feels dry or dehydrated.",
    description: "My skin is craving more hydration and comfort.",
  },
  {
    id: "sensitive",
    icon: "flower",
    title: "My skin feels sensitive or easily irritated.",
    description: "I'd like my skin to feel calmer and more comfortable.",
  },
  {
    id: "radiant",
    icon: "sparkles",
    title: "I'd love brighter, more radiant skin.",
    description: "I'd like a healthier-looking glow.",
  },
  {
    id: "clearer",
    icon: "shield",
    title: "I want clearer, healthier-looking skin.",
    description: "I'd like healthier skin that feels balanced and clear.",
  },
  {
    id: "aging",
    icon: "leaf",
    title: "I'm noticing signs of aging.",
    description: "I'd like smoother, firmer, healthier-looking skin.",
  },
  {
    id: "healthier",
    icon: "heart",
    title: "I simply want healthier skin.",
    description: "I'm looking for expert guidance to maintain healthy skin.",
  },
  {
    id: "not-sure",
    icon: "compass",
    title: "I'm not sure—I just know I'd like healthier skin.",
    description: "Help me discover the best journey for my skin.",
  },
];

function JourneyIcon({ name }: { name: IconName }) {
  const commonProps = {
    width: 26,
    height: 26,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "droplet") {
    return (
      <svg {...commonProps}>
        <path d="M12 2.75S6.5 9.15 6.5 14a5.5 5.5 0 0 0 11 0C17.5 9.15 12 2.75 12 2.75Z" />
      </svg>
    );
  }

  if (name === "flower") {
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

  if (name === "sparkles") {
    return (
      <svg {...commonProps}>
        <path d="m12 3 1.05 3.05L16 7.1l-2.95 1.05L12 11.2l-1.05-3.05L8 7.1l2.95-1.05L12 3Z" />
        <path d="m18 13 0.8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13Z" />
        <path d="m6 13 .65 1.85L8.5 15.5l-1.85.65L6 18l-.65-1.85-1.85-.65 1.85-.65L6 13Z" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg {...commonProps}>
        <path d="M12 3 19 6v5c0 4.6-2.9 8-7 10-4.1-2-7-5.4-7-10V6l7-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  if (name === "leaf") {
    return (
      <svg {...commonProps}>
        <path d="M20 4.5C13 4.5 7 7.5 5 13c-1 2.7.2 5.6 2.6 6.5 2.5.9 5.4-.1 6.9-2.4C17.1 13.1 18.5 8.7 20 4.5Z" />
        <path d="M6.5 18.5c2.7-3.6 5.6-6.3 9-8.5" />
      </svg>
    );
  }

  if (name === "heart") {
    return (
      <svg {...commonProps}>
        <path d="M20.3 5.7a5 5 0 0 0-7.1 0L12 6.9l-1.2-1.2a5 5 0 0 0-7.1 7.1L12 21l8.3-8.2a5 5 0 0 0 0-7.1Z" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z" />
      <circle cx="12" cy="12" r=".75" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function ListeningQuestionPage() {
  const router = useRouter();
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  function continueJourney() {
    if (!selectedAnswer) return;

    sessionStorage.setItem("skinDiscoveryPrimaryMotivation", selectedAnswer);
    router.push("/journey/understanding");
  }

  return (
    <main className="min-h-screen bg-[#FAF7F1] px-5 py-8 text-[#302C2A] sm:px-8 md:py-12">
      <div className="mx-auto max-w-6xl">
        <div className="flex justify-center">
          <div className="flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64 lg:h-80 lg:w-80">
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

        <section className="mt-9 text-center">
          <h1 className="font-serif text-4xl leading-tight tracking-[-0.02em] sm:text-5xl">
            What brought you here today?
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-[#5A5553] sm:text-lg">
            Choose the answer that best reflects what you&apos;re hoping to
            achieve today. Simply select what feels most like you. Your
            Farmacist will thoughtfully personalize your journey from here.
          </p>
        </section>

        <div
          className="mt-10 grid gap-4 md:grid-cols-2"
          role="radiogroup"
          aria-label="What brought you here today?"
        >
          {answers.map((answer) => {
            const selected = selectedAnswer === answer.id;

            return (
              <button
                key={answer.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setSelectedAnswer(answer.id)}
                className={[
                  "group relative flex min-h-[122px] w-full items-center gap-5 rounded-[1.6rem] border px-6 py-6 text-left transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#908A9B] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAF7F1]",
                  selected
                    ? "border-[#908A9B] bg-[#F3EFF3] shadow-[0_10px_30px_rgba(144,138,155,0.14)]"
                    : "border-[#DAD6DB] bg-[#FFFDFC] shadow-[0_7px_24px_rgba(61,52,48,0.04)] hover:-translate-y-0.5 hover:border-[#AAA3AF] hover:shadow-[0_12px_30px_rgba(61,52,48,0.08)]",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-13 w-13 shrink-0 items-center justify-center rounded-full transition-colors",
                    selected
                      ? "bg-[#908A9B] text-white"
                      : "bg-[#F4EEEA] text-[#908A9B]",
                  ].join(" ")}
                >
                  <JourneyIcon name={answer.icon} />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block font-serif text-[1.3rem] leading-snug text-[#342F31] sm:text-[1.38rem]">
                    {answer.title}
                  </span>

                  <span className="mt-2 block text-[0.98rem] leading-6 text-[#625C5A]">
                    {answer.description}
                  </span>
                </span>

                <span
                  aria-hidden="true"
                  className={[
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                    selected
                      ? "border-[#908A9B] bg-[#908A9B] text-white shadow-[0_4px_12px_rgba(144,138,155,0.24)]"
                      : "border-[#CFC9CF] bg-[#F8F5F1] text-transparent shadow-[inset_0_0_0_1px_rgba(144,138,155,0.08)]",
                  ].join(" ")}
                >
                  <svg
                    viewBox="0 0 20 20"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={selected ? "opacity-100" : "opacity-0"}
                  >
                    <path d="m5 10 3 3 7-7" />
                  </svg>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-center pb-12">
          <button
            type="button"
            disabled={!selectedAnswer}
            onClick={continueJourney}
            className={[
              "group inline-flex min-w-[255px] items-center justify-center gap-2 rounded-full px-9 py-4 text-sm font-semibold uppercase tracking-[0.16em] transition-all duration-200",
              selectedAnswer
                ? "bg-[#908A9B] text-white shadow-[0_10px_28px_rgba(144,138,155,0.24)] hover:-translate-y-0.5 hover:bg-[#817B8B]"
                : "cursor-not-allowed bg-[#DAD6DB] text-[#AAA4AC] shadow-[0_4px_12px_rgba(61,52,48,0.04)]",
            ].join(" ")}
          >
            <span>Continue My Journey</span>
            <svg
              viewBox="0 0 20 20"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={selectedAnswer ? "transition-transform duration-200 group-hover:translate-x-1" : ""}
            >
              <path d="M4 10h10" />
              <path d="m10 4 6 6-6 6" />
            </svg>
          </button>

          <p className="mt-4 text-sm text-[#77706F]">
            Thoughtfully crafted, one step at a time.
          </p>
        </div>
      </div>
    </main>
  );
}
