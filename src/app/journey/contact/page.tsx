"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { readJourneySummary } from "@/lib/journeyReviewMappings";
import { readStoredRecommendation } from "@/lib/recommendationSession";
import { readStoredProductRecommendation } from "@/lib/productRecommendationSession";
import { readStoredEnhancementRecommendation } from "@/lib/enhancementRecommendationSession";
import {
  buildSkinDiscoverySubmission,
  readStoredContact,
  validateSkinDiscoveryContact,
  writeContactToStorage,
  writeSubmissionToStorage,
} from "@/lib/skinDiscoverySubmission";
import type { SkinDiscoveryContact } from "@/types/skinDiscoverySubmission";

const initialContactState: SkinDiscoveryContact = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10;
}

export default function ContactCapturePage() {
  const router = useRouter();
  const [contact, setContact] = useState<SkinDiscoveryContact>(() => {
    if (typeof window === "undefined") {
      return initialContactState;
    }

    return readStoredContact() ?? initialContactState;
  });
  const [errors, setErrors] = useState<Partial<Record<keyof SkinDiscoveryContact, string>>>({});

  const journeySummary = useMemo(() => readJourneySummary(), []);
  const recommendation = useMemo(() => readStoredRecommendation(), []);
  const productRecommendation = useMemo(() => readStoredProductRecommendation(), []);
  const enhancementRecommendations = useMemo(() => readStoredEnhancementRecommendation(), []);

  const updateField = (field: keyof SkinDiscoveryContact, value: string) => {
    setContact((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validateField = (field: keyof SkinDiscoveryContact, value: string): string | undefined => {
    const nextErrors = validateSkinDiscoveryContact({ ...contact, [field]: value });
    return nextErrors[field];
  };

  const validateAll = (): Partial<Record<keyof SkinDiscoveryContact, string>> => validateSkinDiscoveryContact(contact);

  const isFormValid =
    Boolean(contact.firstName.trim()) &&
    Boolean(contact.lastName.trim()) &&
    isValidEmail(contact.email) &&
    isValidPhone(contact.phone);

  const handleSubmit = () => {
    const nextErrors = validateAll();
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !isFormValid) {
      return;
    }

    const normalizedContact: SkinDiscoveryContact = {
      firstName: contact.firstName.trim(),
      lastName: contact.lastName.trim(),
      email: contact.email.trim().toLowerCase(),
      phone: contact.phone.trim(),
    };

    const cleanedJourney = recommendation;
    if (!cleanedJourney || !journeySummary) {
      router.push("/journey/listening");
      return;
    }

    const submission = buildSkinDiscoverySubmission({
      guest: normalizedContact,
      discovery: {
        primaryMotivation: journeySummary.primaryMotivation ?? null,
        skinExperience: journeySummary.skinExperience,
        desiredOutcomes: journeySummary.desiredOutcomes,
      },
      journeyResult: cleanedJourney,
      productRecommendation: productRecommendation,
      enhancementRecommendations: enhancementRecommendations,
      actions: {
        booked: null,
        membershipInterest: null,
      },
    });

    writeContactToStorage(normalizedContact);
    writeSubmissionToStorage(submission);
    router.push("/journey/results");
  };

  return (
    <main className="min-h-screen bg-[#FAF7F1] px-5 py-8 text-[#302C2A] sm:px-8 md:py-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex justify-center">
          <div className="flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48 lg:h-56 lg:w-56">
            <Image src="/ffb-logo.png" alt="Fresh Facial Bar & Lash Lounge" width={512} height={512} priority className="h-auto w-full opacity-90" />
          </div>
        </div>

        <section className="mt-8 text-center">
          <p className="text-[0.78rem] font-semibold uppercase tracking-[0.4em] text-[#908A9B] sm:text-sm">YOUR JOURNEY IS READY</p>
          <h1 className="mt-6 text-4xl leading-tight text-[#302C2A] sm:text-[3rem]" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Where should we send it?
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#5A5553] sm:text-lg">
            Your personalized Skin Discovery is ready. Tell us where to send a copy, then reveal your Journey + Fresh Picks right here.
          </p>
        </section>

        <div className="mt-10 rounded-[2rem] border border-[#DAD6DB] bg-[#FFFDFC] p-6 shadow-[0_18px_42px_rgba(61,52,48,0.06)] sm:p-8 lg:p-10">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="firstName" className="block text-sm font-medium uppercase tracking-[0.14em] text-[#5A5553]">
                First Name
              </label>
              <input
                id="firstName"
                value={contact.firstName}
                onChange={(event) => updateField("firstName", event.target.value)}
                onBlur={(event) => {
                  const nextMessage = validateField("firstName", event.target.value);
                  setErrors((current) => ({ ...current, firstName: nextMessage }));
                }}
                aria-invalid={Boolean(errors.firstName)}
                aria-describedby={errors.firstName ? "firstName-error" : undefined}
                className="w-full rounded-full border border-[#DAD6DB] bg-[#F9F5F2] px-4 py-3 text-base text-[#302C2A] outline-none transition focus:border-[#908A9B] focus:ring-2 focus:ring-[#DAD6DB]"
              />
              {errors.firstName ? (
                <p id="firstName-error" className="text-sm text-[#7D3F3D]">{errors.firstName}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label htmlFor="lastName" className="block text-sm font-medium uppercase tracking-[0.14em] text-[#5A5553]">
                Last Name
              </label>
              <input
                id="lastName"
                value={contact.lastName}
                onChange={(event) => updateField("lastName", event.target.value)}
                onBlur={(event) => {
                  const nextMessage = validateField("lastName", event.target.value);
                  setErrors((current) => ({ ...current, lastName: nextMessage }));
                }}
                aria-invalid={Boolean(errors.lastName)}
                aria-describedby={errors.lastName ? "lastName-error" : undefined}
                className="w-full rounded-full border border-[#DAD6DB] bg-[#F9F5F2] px-4 py-3 text-base text-[#302C2A] outline-none transition focus:border-[#908A9B] focus:ring-2 focus:ring-[#DAD6DB]"
              />
              {errors.lastName ? (
                <p id="lastName-error" className="text-sm text-[#7D3F3D]">{errors.lastName}</p>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="email" className="block text-sm font-medium uppercase tracking-[0.14em] text-[#5A5553]">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={contact.email}
                onChange={(event) => updateField("email", event.target.value)}
                onBlur={(event) => {
                  const nextMessage = validateField("email", event.target.value);
                  setErrors((current) => ({ ...current, email: nextMessage }));
                }}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
                className="w-full rounded-full border border-[#DAD6DB] bg-[#F9F5F2] px-4 py-3 text-base text-[#302C2A] outline-none transition focus:border-[#908A9B] focus:ring-2 focus:ring-[#DAD6DB]"
              />
              {errors.email ? (
                <p id="email-error" className="text-sm text-[#7D3F3D]">{errors.email}</p>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="phone" className="block text-sm font-medium uppercase tracking-[0.14em] text-[#5A5553]">
                Mobile Number
              </label>
              <input
                id="phone"
                type="tel"
                value={contact.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                onBlur={(event) => {
                  const nextMessage = validateField("phone", event.target.value);
                  setErrors((current) => ({ ...current, phone: nextMessage }));
                }}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? "phone-error" : undefined}
                className="w-full rounded-full border border-[#DAD6DB] bg-[#F9F5F2] px-4 py-3 text-base text-[#302C2A] outline-none transition focus:border-[#908A9B] focus:ring-2 focus:ring-[#DAD6DB]"
              />
              {errors.phone ? (
                <p id="phone-error" className="text-sm text-[#7D3F3D]">{errors.phone}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isFormValid}
              className="inline-flex items-center justify-center rounded-full bg-[#908A9B] px-9 py-4 text-sm font-semibold uppercase tracking-[0.16em] text-white shadow-[0_10px_28px_rgba(144,138,155,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#817B8B] disabled:cursor-not-allowed disabled:bg-[#DAD6DB] disabled:shadow-none"
            >
              REVEAL MY JOURNEY →
            </button>

            <p className="text-center text-sm leading-6 text-[#7E7877]">
              Your Journey + Fresh Picks are waiting on the other side.
            </p>
            <p className="text-center text-sm leading-6 text-[#7E7877]">
              We&apos;ll also share a copy with your Skintender so they&apos;re ready to continue your Journey with you.
            </p>

            <button
              type="button"
              onClick={() => router.push("/journey/reviewing")}
              className="text-sm font-medium uppercase tracking-[0.18em] text-[#908A9B] underline-offset-4 transition hover:text-[#403A3D] hover:underline"
            >
              Review My Answers
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
