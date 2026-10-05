import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { SkinDiscoverySubmission } from "@/types/skinDiscoverySubmission";
import { createResendEmailProvider, type SkinDiscoveryDeliveryResult } from "@/lib/email/emailProvider";
import {
  createInMemoryDeliveryStateStore,
  sendSkinDiscoveryEmails,
  validateSkinDiscoverySubmission,
  type SkinDiscoveryEmailConfig,
  type SendSkinDiscoveryEmailsOptions,
} from "@/lib/email/sendSkinDiscoveryEmails";
const deliveryStateStore = createInMemoryDeliveryStateStore();
function getRecommendedProductIds(
  submission: SkinDiscoverySubmission,
): string[] {
  const featured = submission.productRecommendations.featured;

  return Array.from(
    new Set(
      [
        featured.cleanse,
        featured.treat,
        featured.moisturize,
        featured.protect,
        ...submission.productRecommendations.moreFreshPicks,
      ].filter((productId): productId is string => Boolean(productId)),
    ),
  );
}

async function loadProductCommerce(
  submission: SkinDiscoverySubmission,
) {
  const productIds = getRecommendedProductIds(submission);

  if (productIds.length === 0) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("fresh_product_id, product_url, shopify_variant_id")
    .in("fresh_product_id", productIds);

  if (error) {
    console.error(
      "Could not load Shopify commerce data for Skin Discovery email:",
      error.message,
    );

    return [];
  }

  return (data ?? []).map((product) => ({
    productId: product.fresh_product_id,
    productUrl: product.product_url,
    shopifyVariantId: product.shopify_variant_id,
  }));
}
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

export async function deliverSkinDiscoverySubmission(
  submission: unknown,
): Promise<SkinDiscoveryDeliveryResult> {
  const envOptions = buildSendOptionsFromEnv();
  const validation = validateSkinDiscoverySubmission(submission);

  if (!validation.valid) {
    return sendSkinDiscoveryEmails(submission, envOptions);
  }

  const productCommerce = await loadProductCommerce(
    validation.submission,
  );

  return sendSkinDiscoveryEmails(submission, {
    ...envOptions,
    productCommerce,
  });
}
