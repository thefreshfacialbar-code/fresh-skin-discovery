import { enhancementCatalog } from "@/data/enhancementCatalog";
import { productCatalog } from "@/data/productCatalog";
import { EMAIL_BASE_CSS, EMAIL_COLORS, ensureSafeUrl, escapeHtml } from "@/emails/emailStyles";
import type { SkinDiscoverySubmission } from "@/types/skinDiscoverySubmission";

export type GuestEmailConfig = {
  logoUrl?: string | null;
  bookingUrl?: string | null;
  businessName?: string;
  businessContact?: string;
  businessEmail?: string;
  businessPhone?: string;
  locationLabel?: string;
  websiteUrl?: string | null;
  previewMode?: boolean;
};

export type EmailTemplateResult = {
  subject: string;
  preheader: string;
  html: string;
  text: string;
};

const productLookup = new Map(productCatalog.map((product) => [product.id, product]));
const enhancementLookup = new Map(enhancementCatalog.map((enhancement) => [enhancement.id, enhancement]));

const journeyDescriptions: Record<string, string> = {
  quench:
    "Your answers point toward skin that may benefit from more consistent hydration, replenishment and support for a comfortable, healthy-looking barrier.",
  calm:
    "Your answers suggest that comfort, sensitivity support and a more considered routine should lead the way.",
  purify:
    "Your answers point toward congestion, breakouts or excess oil playing an important role in your skin story.",
  illuminate:
    "Your answers suggest that brightness, luminosity and a fresher-looking complexion are important parts of your journey.",
  renew:
    "Your answers point toward texture, firmness and visible signs of aging becoming more important in your skincare goals.",
};

const journeyNames: Record<string, string> = {
  quench: "Quench",
  calm: "Calm",
  purify: "Purify",
  illuminate: "Illuminate",
  renew: "Renew",
};

function formatJourneyLabel(journey: string): string {
  return journeyNames[journey] ?? journey.charAt(0).toUpperCase() + journey.slice(1);
}

function formatName(value: string | null | undefined): string {
  const cleaned = (value ?? "").trim();
  return cleaned ? cleaned : "friend";
}

function lookupProduct(productId: string | null | undefined) {
  if (!productId) return null;
  return productLookup.get(productId) ?? null;
}

function lookupEnhancement(enhancementId: string | null | undefined) {
  if (!enhancementId) return null;
  return enhancementLookup.get(enhancementId) ?? null;
}

function getBookingHref(config: GuestEmailConfig): string {
  if (config.previewMode) {
    const bookingUrl = ensureSafeUrl(config.bookingUrl ?? null);
    return bookingUrl ?? "#";
  }

  const bookingUrl = ensureSafeUrl(config.bookingUrl ?? null);
  if (!bookingUrl) {
    throw new Error("bookingUrl is required for production guest email generation.");
  }

  return bookingUrl;
}

function renderJourneySection(submission: SkinDiscoverySubmission): string {
  const primaryJourneyCard = (journey: string, description: string, label: string, secondary = false) => `
    <tr>
      <td style="padding: 0 0 14px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${secondary ? '#d8d0d6' : '#dad6db'}; border-radius: 20px; background:${secondary ? '#fffdfb' : '#fffaf7'}; border-left:4px solid ${secondary ? '#b3a8b6' : '#908A9B'};">
          <tr>
            <td style="padding: 18px 20px 8px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${secondary ? '#7d7581' : '#908A9B'}; font-weight: 700; font-family: Arial, Helvetica, sans-serif;">
              ${escapeHtml(label)}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 20px 6px; font-size: ${secondary ? '24px' : '30px'}; line-height: ${secondary ? '30px' : '36px'}; color: ${EMAIL_COLORS.ink}; font-weight: 700; font-family: Georgia, 'Times New Roman', serif;">
              ${escapeHtml(journey)}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 20px 20px; font-size: 14px; line-height: 24px; color: ${EMAIL_COLORS.muted}; font-family: Arial, Helvetica, sans-serif;">
              ${escapeHtml(description)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  if (submission.journey.resultType === "dual-primary") {
    const cards = submission.journey.primaryJourneys
      .map((journey) => {
        const label = formatJourneyLabel(journey);
        const description = journeyDescriptions[journey] ?? "Your Skin Discovery points toward a personalized, balanced path.";
        return primaryJourneyCard(label, description, "YOUR PRIMARY JOURNEY");
      })
      .join("");

    return cards;
  }

  const primaryJourney = submission.journey.primaryJourneys[0];
  const primaryJourneyName = primaryJourney ? formatJourneyLabel(primaryJourney) : "Your Journey";
  const primaryDescription = primaryJourney ? journeyDescriptions[primaryJourney] ?? "Your Skin Discovery points toward a personalized, balanced path." : "Your Skin Discovery points toward a personalized, balanced path.";

  const supportJourney = submission.journey.secondaryJourney;
  const supportMarkup = supportJourney
    ? primaryJourneyCard(
        formatJourneyLabel(supportJourney),
        journeyDescriptions[supportJourney] ?? "Your Skin Discovery points toward a personalized, balanced path.",
        "SUPPORTING YOUR JOURNEY",
        true,
      )
    : "";

  return `
    ${primaryJourneyCard(primaryJourneyName, primaryDescription, "YOUR PRIMARY JOURNEY")}
    ${supportMarkup}
  `;
}

function renderProductRow(step: string, productId: string | null | undefined): string {
  const product = lookupProduct(productId);
  if (!product) return "";

  return `
    <tr>
      <td style="padding: 0 0 14px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #dad6db; background:#fffdfb; border-radius: 18px;">
          <tr>
            <td style="padding: 18px 20px;">
              <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #908A9B; font-weight: 700; font-family: Arial, Helvetica, sans-serif;">${escapeHtml(step)}</div>
              <div style="margin-top: 8px; font-size: 22px; line-height: 30px; color: ${EMAIL_COLORS.ink}; font-weight: 700; font-family: Georgia, 'Times New Roman', serif;">
                ${escapeHtml(product.name)}
              </div>
              <div style="margin-top: 10px; font-size: 14px; line-height: 22px; color: ${EMAIL_COLORS.muted}; font-family: Arial, Helvetica, sans-serif;">
                ${escapeHtml(product.guestBenefit)}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function renderFeaturedProducts(submission: SkinDiscoverySubmission): string {
  const featuredRows = [
    ["CLEANSE", submission.productRecommendations.featured.cleanse],
    ["TREAT", submission.productRecommendations.featured.treat],
    ["MOISTURIZE", submission.productRecommendations.featured.moisturize],
    ["PROTECT", submission.productRecommendations.featured.protect],
  ]
    .map(([step, productId]) => renderProductRow(step as string, productId as string | null | undefined))
    .join("");

  return `
    <tr>
      <td style="padding: 0 0 8px;">
        <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #908A9B; font-weight: 700; font-family: Arial, Helvetica, sans-serif;">YOUR FRESH PICKS</div>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 0 12px; font-size: 15px; line-height: 24px; color: ${EMAIL_COLORS.muted}; font-family: Arial, Helvetica, sans-serif;">
        Thoughtfully selected around what you shared with us.
      </td>
    </tr>
    ${featuredRows}
  `;
}

function renderMoreFreshPicks(submission: SkinDiscoverySubmission): string {
  if (!submission.productRecommendations.moreFreshPicks.length) return "";

  const items = submission.productRecommendations.moreFreshPicks
    .map((productId) => {
      const product = lookupProduct(productId);
      if (!product) return "";
      return `
        <tr>
          <td style="padding: 0 0 10px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${EMAIL_COLORS.border}; background:#fff; border-radius: 12px;">
              <tr>
                <td style="padding: 12px 16px 6px; font-size: 15px; line-height: 22px; color: ${EMAIL_COLORS.ink}; font-weight: 700;">
                  ${escapeHtml(product.name)}
                </td>
              </tr>
              <tr>
                <td style="padding: 0 16px 12px; font-size: 13px; line-height: 20px; color: ${EMAIL_COLORS.muted};">
                  ${escapeHtml(product.guestBenefit)}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <tr>
      <td style="padding: 16px 16px 8px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #908A9B; font-weight: 700; font-family: Arial, Helvetica, sans-serif;">A FEW MORE FRESH PICKS</td>
    </tr>
    <tr>
      <td style="padding: 0 16px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${items}</table>
      </td>
    </tr>
  `;
}

function renderEnhancements(submission: SkinDiscoverySubmission): string {
  if (!submission.enhancementRecommendations.length) return "";

  const rows = submission.enhancementRecommendations
    .map((enhancementId) => {
      const enhancement = lookupEnhancement(enhancementId);
      if (!enhancement) return "";

      const note = enhancement.name === "FarmHouse Fresh Peel"
        ? "Your Skintender can determine which peel, if any, best complements your Journey."
        : enhancement.guestBenefit;

      return `
        <tr>
          <td style="padding: 0 0 12px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #dad6db; background:#fffdfb; border-radius: 16px;">
              <tr>
                <td style="padding: 14px 18px 8px; font-size: 15px; line-height: 22px; color: ${EMAIL_COLORS.ink}; font-weight: 700; font-family: Georgia, 'Times New Roman', serif;">
                  ${escapeHtml(enhancement.name)}
                </td>
              </tr>
              <tr>
                <td style="padding: 0 18px 14px; font-size: 13px; line-height: 20px; color: ${EMAIL_COLORS.muted}; font-family: Arial, Helvetica, sans-serif;">
                  ${escapeHtml(note)}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <tr>
      <td style="padding: 0 0 8px;">
        <div style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${EMAIL_COLORS.mutedAlt}; font-weight: 700;">ENHANCE YOUR JOURNEY</div>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 0 12px; font-size: 15px; line-height: 24px; color: ${EMAIL_COLORS.muted};">
        Worth Considering
      </td>
    </tr>
    ${rows}
    <tr>
      <td style="padding: 12px 0 0; font-size: 14px; line-height: 22px; color: ${EMAIL_COLORS.muted};">
        Your Skintender can help determine whether these Enhancements make sense for your custom facial.
      </td>
    </tr>
  `;
}

function renderGuestEmailHtml(submission: SkinDiscoverySubmission, config: GuestEmailConfig): string {
  const firstName = formatName(submission.guest.firstName);
  const bookingHref = getBookingHref(config);
  const logoUrl = ensureSafeUrl(config.logoUrl ?? null) ?? "";
  const logoHtml = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(config.businessName ?? "Fresh Facial Bar")}" width="180" style="display:block; max-width:180px; width:100%; height:auto; border:0;" />`
    : `<div style="font-size: 14px; letter-spacing: 2px; text-transform: uppercase; font-weight: 700; color: ${EMAIL_COLORS.ink};">Fresh Facial Bar & Lash Lounge</div>`;

  const hiddenSubmissionMeta = submission.internal.notes
    ? `<div aria-hidden="true" style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(submission.internal.notes)}</div>`
    : "";

  const mainHtml = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${EMAIL_COLORS.cream};">
      <tr>
        <td align="center" style="padding: 32px 18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-shell" style="max-width: 660px; background:#fffdfc; border:1px solid #e7dfe4; border-radius: 26px; box-shadow: 0 18px 42px rgba(43, 36, 33, 0.08);">
            <tr>
              <td style="padding: 30px 32px 12px;" class="pad-mobile">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding-bottom: 16px;">${logoHtml}</td>
                  </tr>
                  <tr>
                    <td align="center" style="font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #7d7581; font-weight: 700; text-align: center; font-family: Arial, Helvetica, sans-serif;">
                      FRESH SKIN DISCOVERY
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 32px 18px; text-align: center;" class="pad-mobile">
                <div style="font-size: 34px; line-height: 1.18; color: ${EMAIL_COLORS.ink}; font-weight: 700; font-family: Georgia, 'Times New Roman', serif; text-align: center; letter-spacing: -0.02em;">
                  Your Skin Discovery Journey is here.
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 32px 26px; text-align: center;" class="pad-mobile">
                <div style="font-size: 18px; line-height: 28px; color: ${EMAIL_COLORS.muted}; text-align: center; font-family: Arial, Helvetica, sans-serif;">
                  Hi ${escapeHtml(firstName)},
                </div>
                <div style="margin-top: 14px; font-size: 22px; line-height: 30px; color: ${EMAIL_COLORS.ink}; font-weight: 700; font-family: Georgia, 'Times New Roman', serif; text-align: center;">
                  You shared. We listened.
                </div>
                <div style="margin-top: 12px; font-size: 15px; line-height: 24px; color: ${EMAIL_COLORS.muted}; text-align: center; font-family: Arial, Helvetica, sans-serif;">
                  Your Skin Discovery gave us a closer look at what your skin is asking for today—and a thoughtful place to begin.
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 32px 24px;" class="pad-mobile">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${renderJourneySection(submission)}
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 32px 24px;" class="pad-mobile">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${renderFeaturedProducts(submission)}
                </table>
              </td>
            </tr>

            ${submission.productRecommendations.moreFreshPicks.length > 0 ? `
              <tr>
                <td style="padding: 0 32px 24px;" class="pad-mobile">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${EMAIL_COLORS.accentSoft}; border:1px solid ${EMAIL_COLORS.border}; border-radius:18px;">
                    ${renderMoreFreshPicks(submission)}
                  </table>
                </td>
              </tr>
            ` : ""}

            ${submission.enhancementRecommendations.length > 0 ? `
              <tr>
                <td style="padding: 0 32px 24px;" class="pad-mobile">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    ${renderEnhancements(submission)}
                  </table>
                </td>
              </tr>
            ` : ""}

            <tr>
              <td style="padding: 0 32px 20px;" class="pad-mobile">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${EMAIL_COLORS.accentSoft}; border:1px solid ${EMAIL_COLORS.border}; border-radius:18px;">
                  <tr>
                    <td style="padding: 20px 20px 10px; font-size: 22px; line-height: 30px; color: ${EMAIL_COLORS.ink}; font-weight: 700; font-family: Georgia, 'Times New Roman', serif;">
                      Your Skintender Takes It From Here
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 0 20px 20px; font-size: 15px; line-height: 24px; color: ${EMAIL_COLORS.muted};">
                      Your Discovery is the starting point. When you visit, your Skintender will use what you've shared to craft your facial around your skin, your goals, and how you're feeling that day.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 8px 32px 10px;" class="pad-mobile">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding: 8px 0 18px;">
                      <a href="${escapeHtml(bookingHref)}" style="display:inline-block; background:#908A9B; color:#ffffff; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; text-decoration:none; font-weight:700; padding: 18px 32px; border-radius: 999px; min-width: 240px; font-family: Arial, Helvetica, sans-serif; box-shadow: 0 12px 20px rgba(144,138,155,0.18);">
                        CRAFT MY FACIAL →
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 32px 14px;" class="pad-mobile">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="padding: 0; font-size: 18px; line-height: 24px; color: ${EMAIL_COLORS.ink}; font-weight: 700; font-family: Georgia, 'Times New Roman', serif;">
                      Explore Membership Benefits
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 8px; font-size: 14px; line-height: 24px; color: ${EMAIL_COLORS.muted}; font-family: Arial, Helvetica, sans-serif;">
                      Curious if membership fits your Journey? Your Skintender can walk you through the benefits and help you decide if it's right for you.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 32px 18px;" class="pad-mobile">
                <div style="font-size: 18px; line-height: 28px; color: ${EMAIL_COLORS.ink}; font-weight: 700; font-family: Georgia, 'Times New Roman', serif; margin-bottom: 8px; text-align: left;">
                  Want to meet your Fresh Picks first?
                </div>
                <div style="font-size: 15px; line-height: 24px; color: ${EMAIL_COLORS.muted}; font-family: Arial, Helvetica, sans-serif;">
                  Stop by the Skin Bar. Your Skintender can walk you through your recommendations and help you find the right place to start.
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding: 0 32px 30px;" class="pad-mobile">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e8dfe5;">
                  <tr>
                    <td style="padding-top: 18px; font-size: 12px; line-height: 20px; color: #7d7581; text-align: center; font-family: Arial, Helvetica, sans-serif;">
                      ${escapeHtml(config.businessName ?? "Fresh Facial Bar & Lash Lounge")}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top: 12px; font-size: 12px; line-height: 20px; color: #7d7581; text-align: center; font-family: Arial, Helvetica, sans-serif;">
                      Thoughtfully crafted, one step at a time.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${hiddenSubmissionMeta}
          </table>
        </td>
      </tr>
    </table>
  `;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><meta name="x-apple-disable-message-reformatting" /><title>${escapeHtml("Your Skin Discovery Journey is here")}</title><style>${EMAIL_BASE_CSS}</style></head><body>${mainHtml}</body></html>`;
}

function renderGuestEmailText(submission: SkinDiscoverySubmission, config: GuestEmailConfig): string {
  const firstName = formatName(submission.guest.firstName);
  const lines: string[] = [];
  lines.push("Your Skin Discovery Journey is here");
  lines.push("");
  lines.push(`Hi ${firstName},`);
  lines.push("");
  lines.push("You shared. We listened.");
  lines.push("Your Skin Discovery gave us a closer look at what your skin is asking for today—and a thoughtful place to begin.");
  lines.push("");

  const primaryJourneys = submission.journey.primaryJourneys.map((journey) => formatJourneyLabel(journey));
  lines.push("YOUR PRIMARY JOURNEY");
  if (submission.journey.resultType === "dual-primary") {
    lines.push(primaryJourneys.join(" + "));
  } else {
    const primaryJourney = submission.journey.primaryJourneys[0];
    if (primaryJourney) {
      lines.push(formatJourneyLabel(primaryJourney));
      lines.push(journeyDescriptions[primaryJourney] ?? "");
    }
    if (submission.journey.secondaryJourney) {
      lines.push("SUPPORTING YOUR JOURNEY");
      lines.push(formatJourneyLabel(submission.journey.secondaryJourney));
      lines.push(journeyDescriptions[submission.journey.secondaryJourney] ?? "");
    }
  }

  lines.push("");
  lines.push("YOUR FRESH PICKS");
  lines.push("Thoughtfully selected around what you shared with us.");
  for (const [step, productId] of [
    ["CLEANSE", submission.productRecommendations.featured.cleanse],
    ["TREAT", submission.productRecommendations.featured.treat],
    ["MOISTURIZE", submission.productRecommendations.featured.moisturize],
    ["PROTECT", submission.productRecommendations.featured.protect],
  ]) {
    const product = lookupProduct(productId as string | null | undefined);
    if (product) {
      lines.push(`${step}: ${product.name}`);
      lines.push(product.guestBenefit);
    }
  }

  if (submission.productRecommendations.moreFreshPicks.length > 0) {
    lines.push("");
    lines.push("A FEW MORE FRESH PICKS");
    for (const productId of submission.productRecommendations.moreFreshPicks) {
      const product = lookupProduct(productId);
      if (product) {
        lines.push(`${product.name} - ${product.guestBenefit}`);
      }
    }
  }

  if (submission.enhancementRecommendations.length > 0) {
    lines.push("");
    lines.push("ENHANCE YOUR JOURNEY");
    lines.push("Worth Considering");
    for (const enhancementId of submission.enhancementRecommendations) {
      const enhancement = lookupEnhancement(enhancementId);
      if (enhancement) {
        lines.push(`${enhancement.name} - ${enhancement.guestBenefit}`);
      }
    }
    lines.push("Your Skintender can help determine whether these Enhancements make sense for your custom facial.");
  }

  lines.push("");
  lines.push("Your Skintender Takes It From Here");
  lines.push("Your Discovery is the starting point. When you visit, your Skintender will use what you've shared to craft your facial around your skin, your goals, and how you're feeling that day.");
  lines.push("");
  lines.push("CRAFT MY FACIAL →");
  lines.push(getBookingHref({ ...config, previewMode: true }));
  lines.push("");
  lines.push("Explore Membership Benefits");
  lines.push("Curious if membership fits your Journey? Your Skintender can walk you through the benefits and help you decide if it's right for you.");
  lines.push("");
  lines.push("Want to meet your Fresh Picks first?");
  lines.push("Stop by the Skin Bar. Your Skintender can walk you through your recommendations and help you find the right place to start.");
  lines.push("");
  lines.push(config.businessName ?? "Fresh Facial Bar");
  lines.push("Thoughtfully crafted, one step at a time.");

  return lines.join("\n");
}

export function renderGuestDiscoveryEmail(
  submission: SkinDiscoverySubmission,
  config: GuestEmailConfig = {},
): EmailTemplateResult {
  const normalizedConfig: GuestEmailConfig = {
    businessName: "Fresh Facial Bar & Lash Lounge",
    previewMode: process.env.NODE_ENV !== "production",
    ...config,
  };

  return {
    subject: "Your Skin Discovery Journey is here",
    preheader: "Your Journey, Fresh Picks + thoughtful next steps from Fresh Facial Bar.",
    html: renderGuestEmailHtml(submission, normalizedConfig),
    text: renderGuestEmailText(submission, normalizedConfig),
  };
}
