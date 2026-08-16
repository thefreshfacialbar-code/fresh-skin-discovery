"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

const experiences = [
  {
    id: "fresh-facial-bar-lash-lounge",
    title: "Fresh Facial Bar\n& Lash Lounge",
    subtitle: "Skincare Thoughtfully Curated for Women and Teens",
    description:
      "A personalized skincare journey that begins with listening and is thoughtfully crafted just for you.",
    available: true,
    badge: null,
  },
  {
    id: "gentlemens-corner",
    title: "Curated Gentlemen's\nCorner",
    subtitle: "Skincare Thoughtfully Curated for Men",
    description:
      "Men's skin plays different. Skincare built for men. Made simple.",
    available: false,
    badge: null,
  },
] as const;

export default function DiscoveryPage() {
  const router = useRouter();
  const [selectedExperience, setSelectedExperience] = useState<string | null>(null);

  function handleCardClick(experienceId: string, available: boolean) {
    if (!available) return;

    setSelectedExperience(experienceId);
    router.push("/journey/listening");
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,_#f7efe7_0%,_#f2e8dd_100%)] px-4 py-8 text-stone-700 sm:px-6 lg:px-8">
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <section className="w-full rounded-[2rem] border border-[#DAD6DB] bg-[#fcf8f2]/95 p-8 shadow-[0_24px_75px_rgba(144,138,155,0.14)] backdrop-blur sm:p-10 lg:p-16">
          <header className="mb-8 flex justify-center">
            <div className="flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64 lg:h-80 lg:w-80">
              <Image src="/ffb-logo.png" alt="Fresh Facial Bar & Lash Lounge logo" width={512} height={512} priority />
            </div>
          </header>

          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-serif text-4xl leading-tight text-stone-800 sm:text-5xl">
              Who are we crafting for today?
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-stone-600 sm:text-lg">
              Choose the experience that&apos;s right for you. Our Farmacists will personalize everything from here.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {experiences.map((experience) => {
              const isSelected = selectedExperience === experience.id;
              const cardClassName = [
                "rounded-[1.75rem] border p-8 text-left transition-all duration-200 sm:p-10",
                isSelected
                  ? "border-[#908A9B] bg-[#f8f0ea] shadow-[0_16px_44px_rgba(144,138,155,0.16)]"
                  : "border-[#DAD6D8] bg-[#fffdf9] shadow-[0_10px_30px_rgba(144,138,155,0.08)]",
                experience.available
                  ? "cursor-pointer hover:-translate-y-1 hover:border-[#908A9B] hover:shadow-[0_18px_40px_rgba(144,138,155,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#908A9B] focus-visible:ring-offset-2"
                  : "cursor-not-allowed opacity-80 hover:-translate-y-1 hover:border-[#908A9B] hover:shadow-[0_18px_40px_rgba(144,138,155,0.18)]",
              ].join(" ");

              if (experience.available) {
                return (
                  <button
                    key={experience.id}
                    type="button"
                    onClick={() => handleCardClick(experience.id, experience.available)}
                    className={`${cardClassName} flex h-full flex-col`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h2 className="font-serif text-2xl leading-tight text-stone-800">
                          {experience.title.split("\n").map((line, index) => (
                            <span key={`${experience.id}-${index}`} className="block">
                              {line}
                            </span>
                          ))}
                        </h2>
                        <p className="mt-1 text-base text-[#908A9B]">{experience.subtitle}</p>
                      </div>
                      <div className="flex shrink-0 items-start">
                        <div className="-mt-3 flex h-[128px] w-[128px] items-center justify-center overflow-hidden rounded-full bg-transparent sm:-mt-3 sm:h-[136px] sm:w-[136px] lg:-mt-3 lg:h-[144px] lg:w-[144px]">
                          <Image
                            src="/1 copy.png"
                            alt="Fresh Facial Bar experience illustration"
                            width={144}
                            height={144}
                            className="h-full w-full object-contain"
                          />
                        </div>
                      </div>
                    </div>

                    <p className="mt-5 text-base leading-8 text-stone-600">
                      {experience.description}
                    </p>

                    <div className="mt-auto pt-6">
                      <div className="flex justify-center border-t border-[#DAD6D8] pt-4">
                        <span
                          aria-hidden="true"
                          className="inline-flex items-center justify-center rounded-full bg-[#908A9B] px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white transition-all duration-200"
                        >
                          Begin My Journey
                        </span>
                      </div>
                    </div>
                  </button>
                );
              }

              return (
                <div
                  key={experience.id}
                  className={`${cardClassName} flex h-full flex-col`}
                  aria-hidden="true"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-serif text-2xl leading-tight text-stone-800">
                        {experience.title.split("\n").map((line, index) => (
                          <span key={`${experience.id}-${index}`} className="block">
                            {line}
                          </span>
                        ))}
                      </h2>
                      <p className="mt-1 text-base text-[#908A9B]">{experience.subtitle}</p>
                    </div>
                    <div className="flex shrink-0 items-start">
                      <div className="-mt-1 flex h-[82px] w-[82px] items-center justify-center overflow-hidden rounded-full bg-transparent sm:h-[90px] sm:w-[90px] lg:h-[96px] lg:w-[96px]">
                        <Image
                          src="/cgc-logo.png"
                          alt="Curated Gentlemen's Corner logo"
                          width={96}
                          height={96}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    </div>
                  </div>

                  <p className="mt-5 text-base leading-8 text-stone-600">
                    {experience.description}
                  </p>

                  <div className="mt-auto pt-6">
                    <div className="flex justify-center border-t border-[#DAD6D8] pt-4">
                      <span
                        aria-hidden="true"
                        className="inline-flex items-center justify-center rounded-full bg-[#908A9B] px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white"
                      >
                        Launching Soon
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </section>
      </main>
    </div>
  );
}
