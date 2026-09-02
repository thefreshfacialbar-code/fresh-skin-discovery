import { renderGuestDiscoveryEmail, type GuestEmailConfig } from "@/emails/guestDiscoveryEmail";
import { renderTeamDiscoveryEmail, type TeamEmailConfig } from "@/emails/teamDiscoveryEmail";
import {
  buildSkinDiscoverySubmission as buildSubmission,
} from "@/lib/skinDiscoverySubmission";
import type { SkinDiscoverySubmission } from "@/types/skinDiscoverySubmission";
import type { SkinDiscoverySubmissionInput } from "@/types/skinDiscoverySubmission";
import type {
  EmailDeliveryAttempt,
  EmailProvider,
  SkinDiscoveryDeliveryResult,
} from "@/lib/email/emailProvider";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RelayBlockedField = "to" | "subject" | "html" | "text";

const BLOCKED_CLIENT_FIELDS: RelayBlockedField[] = ["to", "subject", "html", "text"];

export type SkinDiscoveryEmailConfig = {
  appUrl: string;
  bookingUrl: string;
  logoUrl?: string | null;
  businessName?: string;
  businessContact?: string;
  businessEmail?: string;
  businessPhone?: string;
  locationLabel?: string;
};

export type DeliveryState = {
  guestDelivered: boolean;
  teamDelivered: boolean;
  guestMessageId?: string;
  teamMessageId?: string;
  updatedAt: string;
};

export interface DeliveryStateStore {
  get(submissionId: string): Promise<DeliveryState | null> | DeliveryState | null;
  set(submissionId: string, state: DeliveryState): Promise<void> | void;
}

class InMemoryDeliveryStateStore implements DeliveryStateStore {
  private readonly stateBySubmissionId = new Map<string, DeliveryState>();

  get(submissionId: string): DeliveryState | null {
    return this.stateBySubmissionId.get(submissionId) ?? null;
  }

  set(submissionId: string, state: DeliveryState): void {
    this.stateBySubmissionId.set(submissionId, state);
  }
}

export function createInMemoryDeliveryStateStore(): DeliveryStateStore {
  return new InMemoryDeliveryStateStore();
}

export type SkinDiscoveryValidationResult =
  | { valid: true; submission: SkinDiscoverySubmission; errors: [] }
  | { valid: false; errors: string[] };

export function validateSkinDiscoverySubmission(input: unknown): SkinDiscoveryValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, errors: ["submission must be an object"] };
  }

  const candidate = input as Record<string, unknown>;
  const errors: string[] = [];

  for (const blockedField of BLOCKED_CLIENT_FIELDS) {
    if (blockedField in candidate) {
      errors.push(`relay field '${blockedField}' is not accepted in journey submission payload`);
    }
  }

  if (typeof candidate.submissionId !== "string" || !candidate.submissionId.trim()) {
    errors.push("submissionId is required");
  }

  if (typeof candidate.createdAt !== "string" || Number.isNaN(Date.parse(candidate.createdAt))) {
    errors.push("createdAt must be a valid ISO date string");
  }

  const guest = candidate.guest;
  if (!guest || typeof guest !== "object" || Array.isArray(guest)) {
    errors.push("guest object is required");
  } else {
    const guestRecord = guest as Record<string, unknown>;
    const guestEmail = guestRecord.email;
    if (typeof guestEmail !== "string" || !EMAIL_PATTERN.test(guestEmail.trim())) {
      errors.push("guest email must be a valid email address");
    }
  }

  const journey = candidate.journey;
  if (!journey || typeof journey !== "object" || Array.isArray(journey)) {
    errors.push("journey object is required");
  } else {
    const journeyRecord = journey as Record<string, unknown>;
    if (
      !Array.isArray(journeyRecord.primaryJourneys)
      || (journeyRecord.primaryJourneys.length < 1 && journeyRecord.resultType !== "no-strong-journey")
    ) {
      errors.push("journey must include at least one primary journey");
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    submission: candidate as unknown as SkinDiscoverySubmission,
    errors: [],
  };
}

export function buildSkinDiscoverySubmission(input: SkinDiscoverySubmissionInput): SkinDiscoverySubmission;
export function buildSkinDiscoverySubmission(input: unknown): SkinDiscoverySubmission;
export function buildSkinDiscoverySubmission(input: unknown): SkinDiscoverySubmission {
  return buildSubmission(input as SkinDiscoverySubmissionInput);
}

export type SendSkinDiscoveryEmailsOptions = {
  provider: EmailProvider;
  teamRecipient: string;
  config: SkinDiscoveryEmailConfig;
  disabled?: boolean;
  store?: DeliveryStateStore;
};

function disabledAttempt(): EmailDeliveryAttempt {
  return {
    attempted: false,
    success: false,
    errorCode: "delivery_disabled",
  };
}

function skippedSuccessfulAttempt(previousMessageId?: string): EmailDeliveryAttempt {
  return {
    attempted: false,
    success: true,
    messageId: previousMessageId,
  };
}

async function sendSingle(
  provider: EmailProvider,
  message: { to: string; subject: string; html: string; text: string },
): Promise<EmailDeliveryAttempt> {
  try {
    const response = await provider.send(message);
    if (!response.ok) {
      return {
        attempted: true,
        success: false,
        errorCode: "provider_error",
        errorMessage: response.errorMessage ?? response.errorCode ?? "provider_error",
      };
    }

    return {
      attempted: true,
      success: true,
      messageId: response.messageId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provider threw an unknown error.";
    return {
      attempted: true,
      success: false,
      errorCode: "provider_error",
      errorMessage: message,
    };
  }
}

function toGuestTemplateConfig(config: SkinDiscoveryEmailConfig): GuestEmailConfig {
  return {
    logoUrl: config.logoUrl,
    bookingUrl: config.bookingUrl,
    businessName: config.businessName,
    businessContact: config.businessContact,
    businessEmail: config.businessEmail,
    businessPhone: config.businessPhone,
    locationLabel: config.locationLabel,
    websiteUrl: config.appUrl,
  };
}

function toTeamTemplateConfig(config: SkinDiscoveryEmailConfig): TeamEmailConfig {
  return {
    businessName: config.businessName,
    businessEmail: config.businessEmail,
    businessPhone: config.businessPhone,
    locationLabel: config.locationLabel,
  };
}

export async function sendSkinDiscoveryEmails(
  submissionInput: unknown,
  options: SendSkinDiscoveryEmailsOptions,
): Promise<SkinDiscoveryDeliveryResult> {
  const validation = validateSkinDiscoverySubmission(submissionInput);
  if (!validation.valid) {
    return {
      status: "invalid-submission",
      guestEmail: {
        attempted: false,
        success: false,
        errorCode: "validation_error",
        errorMessage: validation.errors.join("; "),
      },
      teamEmail: {
        attempted: false,
        success: false,
        errorCode: "validation_error",
        errorMessage: validation.errors.join("; "),
      },
      overallSuccess: false,
    };
  }

  const submission = validation.submission;

  if (options.disabled) {
    return {
      status: "delivery-disabled",
      submissionId: submission.submissionId,
      guestEmail: disabledAttempt(),
      teamEmail: disabledAttempt(),
      overallSuccess: false,
    };
  }

  const store = options.store;
  const priorState = store ? await store.get(submission.submissionId) : null;

  const guestTemplate = renderGuestDiscoveryEmail(submission, toGuestTemplateConfig(options.config));
  const teamTemplate = renderTeamDiscoveryEmail(submission, toTeamTemplateConfig(options.config));

  const guestDelivery = priorState?.guestDelivered
    ? skippedSuccessfulAttempt(priorState.guestMessageId)
    : await sendSingle(options.provider, {
        to: submission.guest.email,
        subject: guestTemplate.subject,
        html: guestTemplate.html,
        text: guestTemplate.text,
      });

  const teamDelivery = priorState?.teamDelivered
    ? skippedSuccessfulAttempt(priorState.teamMessageId)
    : await sendSingle(options.provider, {
        to: options.teamRecipient,
        subject: teamTemplate.subject,
        html: teamTemplate.html,
        text: teamTemplate.text,
      });

  const nextState: DeliveryState = {
    guestDelivered: Boolean(priorState?.guestDelivered) || guestDelivery.success,
    teamDelivered: Boolean(priorState?.teamDelivered) || teamDelivery.success,
    guestMessageId: guestDelivery.success ? guestDelivery.messageId : priorState?.guestMessageId,
    teamMessageId: teamDelivery.success ? teamDelivery.messageId : priorState?.teamMessageId,
    updatedAt: new Date().toISOString(),
  };

  if (store) {
    await store.set(submission.submissionId, nextState);
  }

  const overallSuccess = nextState.guestDelivered && nextState.teamDelivered;

  return {
    status: overallSuccess ? "sent" : "partial-failure",
    submissionId: submission.submissionId,
    guestEmail: guestDelivery,
    teamEmail: teamDelivery,
    overallSuccess,
  };
}
