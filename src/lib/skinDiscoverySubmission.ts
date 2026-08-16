import type { RecommendationResult } from "@/types/recommendation";
import type { SkinDiscoveryContact, SkinDiscoverySubmission, SkinDiscoverySubmissionInput } from "@/types/skinDiscoverySubmission";

export const CONTACT_STORAGE_KEY = "skinDiscoveryContact";
export const SUBMISSION_STORAGE_KEY = "skinDiscoverySubmission";

export const DISCOVERY_FLOW_ROUTES = {
  reviewing: "/journey/reviewing",
  contact: "/journey/contact",
  results: "/journey/results",
} as const;

export function validateSkinDiscoveryContact(contact: Partial<SkinDiscoveryContact>): Partial<Record<keyof SkinDiscoveryContact, string>> {
  const errors: Partial<Record<keyof SkinDiscoveryContact, string>> = {};

  if (!contact.firstName || !contact.firstName.trim()) {
    errors.firstName = "First Name is required.";
  }

  if (!contact.lastName || !contact.lastName.trim()) {
    errors.lastName = "Last Name is required.";
  }

  if (!contact.email || !contact.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!contact.phone || !contact.phone.trim()) {
    errors.phone = "Mobile Number is required.";
  } else if (contact.phone.replace(/\D/g, "").length !== 10) {
    errors.phone = "Enter a valid US mobile number.";
  }

  return errors;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 10) {
    return value.trim();
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function buildSubmissionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `submission-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export function createBoulevardTags(journeyResult: RecommendationResult): string[] {
  const tags = ["Skin Discovery"];

  if (journeyResult.primaryJourneys.length > 0) {
    journeyResult.primaryJourneys.forEach((journey) => {
      tags.push(`Journey - ${journey.charAt(0).toUpperCase()}${journey.slice(1)}`);
    });
  }

  if (journeyResult.secondaryJourney) {
    tags.push(`Journey - ${journeyResult.secondaryJourney.charAt(0).toUpperCase()}${journeyResult.secondaryJourney.slice(1)}`);
  }

  return [...new Set(tags)];
}

export function buildSkinDiscoverySubmission(input: SkinDiscoverySubmissionInput): SkinDiscoverySubmission {
  const guest: SkinDiscoveryContact = {
    firstName: input.guest.firstName.trim(),
    lastName: input.guest.lastName.trim(),
    email: normalizeEmail(input.guest.email),
    phone: normalizePhone(input.guest.phone),
  };

  const featured = input.productRecommendation?.featured ?? {
    cleanse: null,
    treat: null,
    moisturize: null,
    protect: null,
  };

  const enhancementRecommendations = Array.isArray(input.enhancementRecommendations)
    ? input.enhancementRecommendations.map((entry) => {
        if (typeof entry === "string") {
          return entry;
        }
        return entry.enhancementId;
      })
    : [];

  const submissionId = input.submissionId ?? buildSubmissionId();
  const createdAt = input.createdAt ?? new Date().toISOString();

  return {
    submissionId,
    createdAt,
    guest,
    discovery: {
      primaryMotivation: input.discovery.primaryMotivation,
      skinExperience: input.discovery.skinExperience,
      desiredOutcomes: input.discovery.desiredOutcomes,
    },
    journey: {
      resultType: input.journeyResult.resultType,
      primaryJourneys: input.journeyResult.primaryJourneys,
      secondaryJourney: input.journeyResult.secondaryJourney,
    },
    productRecommendations: {
      featured: {
        cleanse: featured.cleanse?.productId ?? null,
        treat: featured.treat?.productId ?? null,
        moisturize: featured.moisturize?.productId ?? null,
        protect: featured.protect?.productId ?? null,
      },
      moreFreshPicks: input.productRecommendation?.moreFreshPicks.map((item) => item.productId) ?? [],
    },
    enhancementRecommendations,
    actions: input.actions ?? {
      booked: null,
      membershipInterest: null,
    },
    internal: {
      notes: input.internalNotes ?? "",
      boulevardTags: createBoulevardTags(input.journeyResult),
    },
  };
}

export function readStoredContact(): SkinDiscoveryContact | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(CONTACT_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const candidate = parsed as Partial<SkinDiscoveryContact>;
    if (
      typeof candidate.firstName !== "string" ||
      typeof candidate.lastName !== "string" ||
      typeof candidate.email !== "string" ||
      typeof candidate.phone !== "string"
    ) {
      return null;
    }

    return {
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone,
    };
  } catch {
    return null;
  }
}

export function writeContactToStorage(contact: SkinDiscoveryContact) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(contact));
}

export function readStoredSubmission(): SkinDiscoverySubmission | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(SUBMISSION_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed as SkinDiscoverySubmission;
  } catch {
    return null;
  }
}

export function writeSubmissionToStorage(submission: SkinDiscoverySubmission) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(SUBMISSION_STORAGE_KEY, JSON.stringify(submission));
}

export function clearSkinDiscoverySubmissionSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(CONTACT_STORAGE_KEY);
  window.sessionStorage.removeItem(SUBMISSION_STORAGE_KEY);
}
