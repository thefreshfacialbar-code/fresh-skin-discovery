import "server-only";

import { createResendEmailProvider } from "@/lib/email/emailProvider";

export type FinalSkinPlanProduct = {
  productId: string;
  routineStep: string | null;
  routineOrder: number;
  productName: string;
  brand: string | null;
  customerGuidance: string | null;
  usageType: string | null;
  timing: string | null;
  frequency: string | null;
  productUrl: string | null;
  shopifyVariantId: string | null;
};
export type FinalSkinPlanEmailConfig = {
  firstName?: string;
  experience?: string | null;
  skinPlanUrl: string;
  products: FinalSkinPlanProduct[];
  appUrl: string;
};
export type FinalSkinPlanEmail = {
  html: string;
  text: string;
};
type DeliverFinalSkinPlanOptions = {
  guestEmail: string;
  accessToken: string;
  firstName?: string;
  experience?: string | null;
  products: FinalSkinPlanProduct[];
};

export type FinalSkinPlanDeliveryResult = {
  success: boolean;
  messageId?: string;
  errorMessage?: string;
};
function getShopifyVariantNumericId(
  shopifyVariantId: string | null
): string | null {
  if (!shopifyVariantId) {
    return null;
  }

  const match = shopifyVariantId.match(/(\d+)$/);

  return match?.[1] ?? null;
}

function buildFinalSkinPlanCartUrl(
  products: FinalSkinPlanProduct[]
): string | null {
  const cartItems = products
    .map((product) => {
      const variantId = getShopifyVariantNumericId(
        product.shopifyVariantId
      );

      return variantId ? `${variantId}:1` : null;
    })
    .filter((item): item is string => Boolean(item));

  if (cartItems.length === 0) {
    return null;
  }

  const firstProductUrl = products.find(
    (product) => product.productUrl
  )?.productUrl;

  if (!firstProductUrl) {
    return null;
  }

  try {
    const shopOrigin = new URL(firstProductUrl).origin;

    return `${shopOrigin}/cart/${cartItems.join(",")}`;
  } catch {
    return null;
  }
}
const FRESH_EMAIL_COLORS = {
  background: "#F7F3EE",
  paper: "#FFFFFF",
  ink: "#302C2A",
  muted: "#6F6864",
  border: "#DED8D2",
  accent: "#7D7581",
  accentSoft: "#F4F0F5",
} as const;

const GENTLEMENS_EMAIL_COLORS = {
  background: "#F2F2F2",
  paper: "#FFFFFF",
  ink: "#545455",
  muted: "#737373",
  border: "#A5A6A5",
  accent: "#545455",
  accentSoft: "#F1F1F1",
} as const;

function getFinalEmailColors(experience?: string | null) {
  return experience === "gentlemens-corner"
    ? GENTLEMENS_EMAIL_COLORS
    : FRESH_EMAIL_COLORS;
}
function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}
export function renderFinalSkinPlanEmail({
  firstName,
  experience,
  skinPlanUrl,
  products,
  appUrl,
}: FinalSkinPlanEmailConfig): FinalSkinPlanEmail {
  const cartUrl = buildFinalSkinPlanCartUrl(products);
const colors = getFinalEmailColors(experience);
const isGentlemensCorner = experience === "gentlemens-corner";

const logoUrl = isGentlemensCorner
  ? `${appUrl.replace(/\/$/, "")}/CGC-Logo.png`
  : `${appUrl.replace(/\/$/, "")}/ffb-logo.png`;

const businessName = isGentlemensCorner
  ? "Curated Gentlemen's Corner"
  : "Fresh Facial Bar & Lash Lounge";

const professionalLabel = isGentlemensCorner
  ? "skincare professional"
  : "Fresh professional";
const productRowsHtml = products
  .map((product) => {
    const shopButton = product.productUrl
      ? `
        <p style="margin:14px 0 0;">
          <a
            href="${product.productUrl}"
            style="display:inline-block;padding:10px 18px;background:${colors.ink};color:#ffffff;text-decoration:none;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:0.08em;"
          >
            SHOP THIS PICK
          </a>
        </p>
      `
      : "";

    return `
      <div style="padding:18px 0;border-bottom:1px solid ${colors.border};">
        ${
          product.routineStep
            ? `<div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${colors.accent};margin-bottom:5px;">${product.routineStep}</div>`
            : ""
        }

        <div style="font-family:Georgia,serif;font-size:20px;font-weight:700;color:${colors.ink};">
          ${product.productName}
        </div>

        ${
          product.brand
            ? `<div style="font-size:13px;color:${colors.muted};margin-top:3px;">${product.brand}</div>`
            : ""
        }

        ${shopButton}
      </div>
    `;
  })
  .join("");

const productRowsText = products.flatMap((product) => {
  const lines = [
    product.routineStep
      ? `${product.routineStep}: ${product.productName}`
      : product.productName,
  ];

  if (product.brand) {
    lines.push(product.brand);
  }

  if (product.productUrl) {
    lines.push(`Shop this pick: ${product.productUrl}`);
  }

  return [...lines, ""];
});
return {
  html: `
  <div style="margin:0;padding:32px 16px;background:${colors.background};font-family:Arial,sans-serif;color:${colors.ink};line-height:1.6;">
    <div style="max-width:640px;margin:0 auto;padding:36px;background:${colors.paper};border:1px solid ${colors.border};border-radius:18px;">

      <div style="text-align:center;margin:0 0 28px;">
        <img
          src="${logoUrl}"
          alt="${businessName}"
          style="display:inline-block;max-width:220px;width:100%;height:auto;"
        />
      </div>

      <div style="text-align:center;margin:0 0 28px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${colors.accent};margin-bottom:10px;">
          YOUR FRESH METHOD
        </div>

        <div style="font-family:Georgia,serif;font-size:30px;line-height:1.2;font-weight:700;color:${colors.ink};">
          Your Personalized Skin Plan Is Ready
        </div>
      </div>

      <p>${firstName ? `Hi ${firstName},` : "Hello,"}</p>

      <p>
        Your ${professionalLabel} has completed your personalized review and
        refined your Skin Plan based on your skin goals and routine needs.
      </p>

      <p>Your Fresh Method routine is ready to explore.</p>

      ${
        productRowsHtml
          ? `
            <div style="margin:28px 0 0;">
              <div style="font-family:Georgia,serif;font-size:24px;font-weight:700;color:${colors.accent};margin-bottom:8px;">
                Your Fresh Picks
              </div>

              ${productRowsHtml}

              ${
                cartUrl
                  ? `
                    <p style="margin:24px 0 0;text-align:center;">
                      <a
                        href="${cartUrl}"
                        style="display:inline-block;padding:14px 24px;background:${colors.ink};color:#ffffff;text-decoration:none;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:0.08em;"
                      >
                        SHOP MY FRESH PICKS
                      </a>
                    </p>
                  `
                  : ""
              }
            </div>
          `
          : ""
      }

      <p style="margin:28px 0 0;text-align:center;">
        <a
          href="${skinPlanUrl}"
          style="display:inline-block;padding:14px 22px;background:${colors.ink};color:#ffffff;text-decoration:none;border-radius:999px;"
        >
          View My Skin Plan
        </a>
      </p>

      <p>
        Your plan includes the products and guidance selected specifically
        for your skin goals.
      </p>

      <p>${businessName}</p>
    </div>
  </div>
`,
  text: [
  "Your Personalized Skin Plan Is Ready",
  "",
  firstName ? `Hi ${firstName},` : "Hello,",
  "",
  `Your ${professionalLabel} has completed your personalized review and refined your Skin Plan based on your skin goals and routine needs.`,
  "",
  "Your Fresh Method routine is ready to explore.",
  "",
  "YOUR FRESH PICKS",
  "",
  ...productRowsText,
  ...(cartUrl
    ? [
        "Shop all my Fresh Picks:",
        cartUrl,
        "",
      ]
    : []),
  `View your Skin Plan: ${skinPlanUrl}`,
  "",
  businessName,
].join("\n"),
};
}
export async function deliverFinalSkinPlan({
  guestEmail,
  accessToken,
  firstName,
  experience,
  products,
}: DeliverFinalSkinPlanOptions): Promise<FinalSkinPlanDeliveryResult> {
  const apiKey = readEnv("RESEND_API_KEY");
  const fromEmail = readEnv("SKIN_DISCOVERY_EMAIL_FROM");
  const appUrl = readEnv("NEXT_PUBLIC_APP_URL") || "http://localhost:3000";

  if (!apiKey || !fromEmail) {
    return {
      success: false,
      errorMessage: "Final Skin Plan email delivery is not configured.",
    };
  }

  const provider = createResendEmailProvider({
    apiKey,
    fromEmail,
    replyTo: readEnv("SKIN_DISCOVERY_REPLY_TO") || undefined,
  });

  const skinPlanUrl = `${appUrl}/skin-plan?token=${encodeURIComponent(
    accessToken
  )}`;
  const email = renderFinalSkinPlanEmail({
  firstName,
  experience,
  skinPlanUrl,
  products,
  appUrl,
});
  const result = await provider.send({
  to: guestEmail,
  subject: firstName
    ? `${firstName}, Your Personalized Skin Plan Is Ready`
    : "Your Personalized Skin Plan Is Ready",
  html: email.html,
  text: email.text,
});

  if (!result.ok) {
    return {
      success: false,
      errorMessage: result.errorMessage ?? "Could not send the Skin Plan email.",
    };
  }

  return {
    success: true,
    messageId: result.messageId,
  };
}