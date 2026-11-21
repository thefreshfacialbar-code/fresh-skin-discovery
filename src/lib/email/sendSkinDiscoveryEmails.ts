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
import {
  claimEmailDelivery,
  completeEmailDelivery,
} from "@/lib/email/supabaseEmailDelivery";
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
export type SkinDiscoveryProductCommerce = {
  productId: string;
  productUrl: string | null;
  shopifyVariantId: string | null;
};
export type SendSkinDiscoveryEmailsOptions = {
  provider: EmailProvider;
    savedDeliveryContext?: {
    businessId: string;
    consultationId: string;
    skinPlanId: string;
  };
  teamRecipient: string;
  config: SkinDiscoveryEmailConfig;
  productCommerce?: SkinDiscoveryProductCommerce[];
  savedProducts?: GuestEmailConfig["savedProducts"];
  savedEnhancements?: GuestEmailConfig["savedEnhancements"];
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
async function sendTrackedEmail(
  provider: EmailProvider,
  message: {
    to: string;
    subject: string;
    html: string;
    text: string;
  },
  context: NonNullable<SendSkinDiscoveryEmailsOptions["savedDeliveryContext"]>,
  recipient: "guest" | "team",
): Promise<EmailDeliveryAttempt> {
  const claim = await claimEmailDelivery(context, recipient, message.to);

  if (!claim.claimed) {
    if (claim.status === "sent") {
      return {
        attempted: false,
        success: true,
      };
    }

    return {
      attempted: false,
      success: false,
      errorCode: "provider_error",
      errorMessage:
        "Email is already being sent or its delivery outcome is uncertain.",
    };
  }

  let response;

  try {
    response = await provider.send(message);
  } catch (error) {
    return {
      attempted: true,
      success: false,
      errorCode: "provider_error",
      errorMessage:
        "Email delivery outcome is uncertain. Automatic retry is blocked.",
    };
  }

  if (!response.ok) {
  const providerError =
    response.errorMessage ?? "Email provider rejected the request.";

  try {
    await completeEmailDelivery(claim.deliveryId, {
      success: false,
      errorMessage: providerError,
    });
  } catch (error) {
    console.error(
      "Email provider rejected delivery, but Supabase could not record the failure:",
      {
        deliveryId: claim.deliveryId,
        providerError,
        error,
      },
    );

    return {
      attempted: true,
      success: false,
      errorCode: "provider_error",
      errorMessage:
        "Email delivery failed, but the failure could not be recorded. Reconciliation is required.",
    };
  }

  return {
    attempted: true,
    success: false,
    errorCode: "provider_error",
    errorMessage: providerError,
  };
}

  if (!response.messageId) {
    return {
      attempted: true,
      success: false,
      errorCode: "provider_error",
      errorMessage:
        "Provider response contained no message ID. Delivery outcome requires reconciliation.",
    };
  }

  try {
  await completeEmailDelivery(claim.deliveryId, {
    success: true,
    messageId: response.messageId,
  });
} catch (error) {
  console.error(
    "Resend accepted the email, but Supabase delivery completion failed:",
    {
      deliveryId: claim.deliveryId,
      messageId: response.messageId,
      error,
    },
  );

  return {
    attempted: true,
    success: false,
    errorCode: "provider_error",
    errorMessage:
      "Email was accepted by Resend, but delivery tracking could not be confirmed. Reconciliation is required.",
  };
}

return {
  attempted: true,
  success: true,
  messageId: response.messageId,
};
}
function toGuestTemplateConfig(
  config: SkinDiscoveryEmailConfig,
  productCommerce?: SkinDiscoveryProductCommerce[],
  savedProducts?: GuestEmailConfig["savedProducts"],
  savedEnhancements?: GuestEmailConfig["savedEnhancements"],
): GuestEmailConfig {
  return {
    logoUrl: config.logoUrl,
    bookingUrl: config.bookingUrl,
    businessName: config.businessName,
    businessContact: config.businessContact,
    businessEmail: config.businessEmail,
    businessPhone: config.businessPhone,
    locationLabel: config.locationLabel,
    websiteUrl: config.appUrl,
    productCommerce,
    savedProducts,
    savedEnhancements,
  };
}

function toTeamTemplateConfig(
  config: SkinDiscoveryEmailConfig,
  savedProducts?: TeamEmailConfig["savedProducts"],
  savedEnhancements?: TeamEmailConfig["savedEnhancements"],
): TeamEmailConfig {
  return {
    businessName: config.businessName,
    businessEmail: config.businessEmail,
    businessPhone: config.businessPhone,
    locationLabel: config.locationLabel,
    savedProducts,
    savedEnhancements,
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

    const store = options.savedDeliveryContext
    ? undefined
    : options.store;
  const priorState = store ? await store.get(submission.submissionId) : null;

  const guestTemplate = renderGuestDiscoveryEmail(
  submission,
  toGuestTemplateConfig(
    options.config,
    options.productCommerce,
    options.savedProducts,
    options.savedEnhancements,
  ),
);
  const teamTemplate = renderTeamDiscoveryEmail(
    submission,
    toTeamTemplateConfig(
      options.config,
      options.savedProducts,
      options.savedEnhancements,
  ),
);

    const guestMessage = {
    to: submission.guest.email,
    subject: guestTemplate.subject,
    html: guestTemplate.html,
    text: guestTemplate.text,
  };

  const guestDelivery = options.savedDeliveryContext
    ? await sendTrackedEmail(
        options.provider,
        guestMessage,
        options.savedDeliveryContext,
        "guest",
      )
    : priorState?.guestDelivered
      ? skippedSuccessfulAttempt(priorState.guestMessageId)
      : await sendSingle(options.provider, guestMessage);

    const teamMessage = {
    to: options.teamRecipient,
    subject: teamTemplate.subject,
    html: teamTemplate.html,
    text: teamTemplate.text,
  };

  const teamDelivery = options.savedDeliveryContext
    ? await sendTrackedEmail(
        options.provider,
        teamMessage,
        options.savedDeliveryContext,
        "team",
      )
    : priorState?.teamDelivered
      ? skippedSuccessfulAttempt(priorState.teamMessageId)
      : await sendSingle(options.provider, teamMessage);

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

  const overallSuccess = options.savedDeliveryContext
    ? guestDelivery.success && teamDelivery.success
    : nextState.guestDelivered && nextState.teamDelivered;

  return {
    status: overallSuccess ? "sent" : "partial-failure",
    submissionId: submission.submissionId,
    guestEmail: guestDelivery,
    teamEmail: teamDelivery,
    overallSuccess,
  };
}
