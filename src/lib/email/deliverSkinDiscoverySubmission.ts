import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { loadSkinDiscoveryEmailData } from "@/lib/email/loadSkinDiscoveryEmailData";
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
      apiKey: apiKey || "re_disabled_no_api_key",
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
  savedIds: {
    consultationId?: string;
    skinPlanId?: string;
  },
): Promise<SkinDiscoveryDeliveryResult> {
  const envOptions = buildSendOptionsFromEnv();
  const validation = validateSkinDiscoverySubmission(submission);

  if (!validation.valid) {
    return sendSkinDiscoveryEmails(submission, envOptions);
  }
  if (!savedIds.consultationId || !savedIds.skinPlanId) {
    throw new Error(
      "Saved consultation and Skin Plan IDs are required for email delivery.",
    );
  }

  const savedEmailData = await loadSkinDiscoveryEmailData({
    consultationId: savedIds.consultationId,
    skinPlanId: savedIds.skinPlanId,
  });
    if (
    validation.submission.submissionId !==
    savedEmailData.submissionId
  ) {
    throw new Error(
      "Skin Discovery submission ID does not match the saved consultation.",
    );
  }
    if (
    validation.submission.guest.email.trim().toLowerCase() !==
    savedEmailData.guest.email.trim().toLowerCase()
  ) {
    throw new Error(
      "Skin Discovery guest email does not match the saved customer.",
    );
  }
    const savedProducts = savedEmailData.products.map((product) => ({
    productId: product.productId,
    name: product.name,
    description: product.description,
    routineStep: product.routineStep,
    routineOrder: product.routineOrder,
  }));
    const savedProductCommerce = savedEmailData.products.map((product) => ({
    productId: product.productId,
    productUrl: product.productUrl,
    shopifyVariantId: product.shopifyVariantId,
  }));
    const savedFeaturedProducts = {
    cleanse:
      savedEmailData.products.find(
        (product) => product.routineStep === "cleanse",
      )?.productId ?? null,

    treat:
      savedEmailData.products.find(
        (product) => product.routineStep === "treat",
      )?.productId ?? null,

    moisturize:
      savedEmailData.products.find(
        (product) => product.routineStep === "moisturize",
      )?.productId ?? null,

    protect:
      savedEmailData.products.find(
        (product) => product.routineStep === "protect",
      )?.productId ?? null,
  };
    const savedFreshPicks = savedEmailData.products
    .filter((product) => product.routineStep === "fresh-pick")
    .map((product) => product.productId);
    const savedEnhancements = savedEmailData.enhancements.map(
  (enhancement) => ({
    id: enhancement.id,
    name: enhancement.name,
    description: enhancement.description,
  }),
);
const savedJourneyScores =
  {} as SkinDiscoverySubmission["journey"]["scores"];

const expectedJourneys = [
  "quench",
  "calm",
  "purify",
  "illuminate",
  "renew",
] as const;

for (const journey of expectedJourneys) {
  const matches = savedEmailData.journey.scores.filter(
    (item) => item.journey === journey,
  );

  if (
    matches.length !== 1 ||
    !Number.isFinite(matches[0].score)
  ) {
    throw new Error(
      `Saved Skin Discovery score is missing or invalid: ${journey}`,
    );
  }

  savedJourneyScores[journey] = matches[0].score;
}

if (savedEmailData.journey.scores.length !== expectedJourneys.length) {
  throw new Error(
    "Saved Skin Discovery contains unexpected or duplicate journey scores.",
  );
}
const savedResultType = savedEmailData.journey.resultSummary
  ?.match(/Result type:\s*([a-z-]+)/i)?.[1];

if (
  savedResultType !== "single-primary" &&
  savedResultType !== "dual-primary"
) {
  throw new Error(
    "Saved Skin Discovery result type is missing or invalid.",
  );
}

const savedPrimaryJourneys =
  savedResultType === "dual-primary"
    ? [
        savedEmailData.journey.primary,
        savedEmailData.journey.secondary,
      ]
    : [savedEmailData.journey.primary];

if (
  savedPrimaryJourneys.some((journey) => !journey) ||
  new Set(savedPrimaryJourneys).size !== savedPrimaryJourneys.length
) {
  throw new Error(
    "Saved Skin Discovery primary journeys are missing or invalid.",
  );
}
      const savedSubmission: SkinDiscoverySubmission = {
    ...validation.submission,
    guest: {
      ...validation.submission.guest,
      firstName: savedEmailData.guest.firstName,
      lastName: savedEmailData.guest.lastName,
      email: savedEmailData.guest.email,
    },
       journey: {
  ...validation.submission.journey,
  scores: savedJourneyScores,
  resultType: savedResultType,
  primaryJourneys:
    savedPrimaryJourneys as SkinDiscoverySubmission["journey"]["primaryJourneys"],
  secondaryJourney:
    savedResultType === "dual-primary"
      ? null
      : (savedEmailData.journey.secondary as SkinDiscoverySubmission["journey"]["secondaryJourney"]),
},
    productRecommendations: {
      featured: savedFeaturedProducts,
      moreFreshPicks: savedFreshPicks,
    },
    enhancementRecommendations: savedEnhancements.map(
  (enhancement) => enhancement.id,
),
enhancementDetails: savedEnhancements.map((enhancement) => ({
  id: enhancement.id,
  name: enhancement.name,
  guestBenefit: enhancement.description,
})),
  };
 return sendSkinDiscoveryEmails(savedSubmission, {
  ...envOptions,
  savedDeliveryContext: {
    businessId: savedEmailData.businessId,
    consultationId: savedEmailData.consultationId,
    skinPlanId: savedEmailData.skinPlanId,
  },
  productCommerce: savedProductCommerce,
  savedProducts,
  savedEnhancements,
});
}
