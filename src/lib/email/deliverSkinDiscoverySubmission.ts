import { createResendEmailProvider, type SkinDiscoveryDeliveryResult } from "@/lib/email/emailProvider";
import {
  createInMemoryDeliveryStateStore,
  sendSkinDiscoveryEmails,
  type SkinDiscoveryEmailConfig,
  type SendSkinDiscoveryEmailsOptions,
} from "@/lib/email/sendSkinDiscoveryEmails";

const deliveryStateStore = createInMemoryDeliveryStateStore();

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function buildConfigFromEnv(): SkinDiscoveryEmailConfig {
  const appUrl = readEnv("NEXT_PUBLIC_APP_URL") || "http://localhost:3000";

  return {
    appUrl,
    bookingUrl: readEnv("SKIN_DISCOVERY_BOOKING_URL"),
    logoUrl: readEnv("SKIN_DISCOVERY_LOGO_URL") || `${appUrl}/ffb-logo.png`,
    businessName: readEnv("SKIN_DISCOVERY_BUSINESS_NAME") || "Fresh Facial Bar & Lash Lounge",
    businessEmail: readEnv("SKIN_DISCOVERY_BUSINESS_EMAIL") || undefined,
    businessPhone: readEnv("SKIN_DISCOVERY_BUSINESS_PHONE") || undefined,
    locationLabel: readEnv("SKIN_DISCOVERY_LOCATION_LABEL") || undefined,
  };
}

function buildSendOptionsFromEnv(): Pick<
  SendSkinDiscoveryEmailsOptions,
  "provider" | "teamRecipient" | "disabled" | "config" | "store"
> {
  const apiKey = readEnv("RESEND_API_KEY");
  const fromEmail = readEnv("SKIN_DISCOVERY_EMAIL_FROM");
  const teamRecipient = readEnv("SKIN_DISCOVERY_TEAM_EMAIL");

  const disabled = !(apiKey && fromEmail && teamRecipient);

  return {
    provider: createResendEmailProvider({
      apiKey,
      fromEmail,
      replyTo: readEnv("SKIN_DISCOVERY_REPLY_TO") || undefined,
    }),
    teamRecipient,
    disabled,
    config: buildConfigFromEnv(),
    store: deliveryStateStore,
  };
}

export async function deliverSkinDiscoverySubmission(submission: unknown): Promise<SkinDiscoveryDeliveryResult> {
  const envOptions = buildSendOptionsFromEnv();

  return sendSkinDiscoveryEmails(submission, envOptions);
}
