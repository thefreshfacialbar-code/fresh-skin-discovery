import { enhancementCatalog } from "@/data/enhancementCatalog";
import { productCatalog } from "@/data/productCatalog";
import { EMAIL_BASE_CSS, EMAIL_COLORS, escapeHtml } from "@/emails/emailStyles";
import { mapPrimaryMotivation, mapSelectedValues, skinExperienceLabels, desiredOutcomesLabels } from "@/lib/journeyReviewMappings";
import type { SkinDiscoverySubmission } from "@/types/skinDiscoverySubmission";

export type TeamEmailConfig = {
  previewMode?: boolean;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  locationLabel?: string;
};

export type TeamEmailTemplateResult = {
  subject: string;
  html: string;
  text: string;
};

const productLookup = new Map(productCatalog.map((product) => [product.id, product]));
const enhancementLookup = new Map(enhancementCatalog.map((enhancement) => [enhancement.id, enhancement]));

function formatJourneyName(journey: string): string {
  const normalized = journey.toLowerCase();
  if (normalized === "quench") return "Quench";
  if (normalized === "calm") return "Calm";
  if (normalized === "purify") return "Purify";
  if (normalized === "illuminate") return "Illuminate";
  if (normalized === "renew") return "Renew";
  return journey.charAt(0).toUpperCase() + journey.slice(1);
}

function createCustomFacialDirection(submission: SkinDiscoverySubmission): string {
  const primaryJourneys = submission.journey.primaryJourneys;
  const supportJourney = submission.journey.secondaryJourney;

  if (primaryJourneys.length === 2) {
    return `${formatJourneyName(primaryJourneys[0])} + ${formatJourneyName(primaryJourneys[1])} custom facial focused on balanced support and personalized skin goals.`;
  }

  const primary = primaryJourneys[0];
  if (!primary) return "Custom facial direction is being finalized.";

  if (primary === "purify" && supportJourney === "calm") {
    return "Purify-focused custom facial with calming support.";
  }
  if (primary === "quench" && supportJourney === "renew") {
    return "Renew-focused custom facial with hydration support.";
  }
  if (primary === "illuminate" && supportJourney === "renew") {
    return "Illuminate + Renew custom facial focused on radiance and healthy-aging support.";
  }
  if (primary === "calm") {
    return "Calm-focused custom facial with comfort and barrier support.";
  }
  if (primary === "purify") {
    return "Purify-focused custom facial with clarity and balance support.";
  }
  if (primary === "quench") {
    return "Quench-focused custom facial with hydration and comfort support.";
  }
  if (primary === "illuminate") {
    return "Illuminate-focused custom facial with radiance support.";
  }
  if (primary === "renew") {
    return "Renew-focused custom facial with smoothness and healthy-aging support.";
  }

  return `${formatJourneyName(primary)} custom facial focused on personalized support.`;
}

function renderDiscoveryAnswers(submission: SkinDiscoverySubmission): string {
  const primaryMotivation = submission.discovery.primaryMotivation
    ? mapPrimaryMotivation(submission.discovery.primaryMotivation)
    : "Not provided";

  const skinExperience = submission.discovery.skinExperience.length
    ? mapSelectedValues(submission.discovery.skinExperience, skinExperienceLabels).join("<br />")
    : "Not provided";

  const desiredOutcomes = submission.discovery.desiredOutcomes.length
    ? mapSelectedValues(submission.discovery.desiredOutcomes, desiredOutcomesLabels).join("<br />")
    : "Not provided";

  return `
    <tr>
      <td style="padding: 0 0 8px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${EMAIL_COLORS.mutedAlt}; font-weight: 700;">DISCOVERY ANSWERS</td>
    </tr>
    <tr>
      <td style="padding: 0 0 14px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${EMAIL_COLORS.border}; background:#fff; border-radius: 12px;">
          <tr>
            <td style="padding: 14px 18px 8px; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: ${EMAIL_COLORS.mutedAlt}; font-weight: 700;">Biggest Concern / Primary Motivation</td>
          </tr>
          <tr><td style="padding: 0 18px 14px; font-size: 15px; line-height: 22px; color: ${EMAIL_COLORS.ink};">${escapeHtml(primaryMotivation)}</td></tr>
          <tr>
            <td style="padding: 0 18px 8px; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: ${EMAIL_COLORS.mutedAlt}; font-weight: 700;">Skin Experience</td>
          </tr>
          <tr><td style="padding: 0 18px 14px; font-size: 15px; line-height: 22px; color: ${EMAIL_COLORS.ink};">${skinExperience}</td></tr>
          <tr>
            <td style="padding: 0 18px 8px; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: ${EMAIL_COLORS.mutedAlt}; font-weight: 700;">Desired Outcomes</td>
          </tr>
          <tr><td style="padding: 0 18px 14px; font-size: 15px; line-height: 22px; color: ${EMAIL_COLORS.ink};">${desiredOutcomes}</td></tr>
        </table>
      </td>
    </tr>
  `;
}

function renderFeaturedProducts(submission: SkinDiscoverySubmission): string {
  const rows = [
    ["Cleanse", submission.productRecommendations.featured.cleanse],
    ["Treat", submission.productRecommendations.featured.treat],
    ["Moisturize", submission.productRecommendations.featured.moisturize],
    ["Protect", submission.productRecommendations.featured.protect],
  ]
    .map(([label, productId]) => {
      const product = productId ? productLookup.get(productId) : null;
      if (!product) return "";
      return `
        <tr>
          <td style="padding: 0 0 10px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${EMAIL_COLORS.border}; background:#fff; border-radius: 10px;">
              <tr>
                <td style="padding: 12px 16px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${EMAIL_COLORS.mutedAlt}; font-weight: 700;">${escapeHtml(label as string)}</td>
              </tr>
              <tr><td style="padding: 0 16px 12px; font-size: 15px; line-height: 22px; color: ${EMAIL_COLORS.ink}; font-weight: 700;">${escapeHtml(product.name)}</td></tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <tr>
      <td style="padding: 0 0 10px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${EMAIL_COLORS.mutedAlt}; font-weight: 700;">FEATURED FRESH PICKS</td>
    </tr>
    ${rows}
  `;
}

function renderMoreFreshPicks(submission: SkinDiscoverySubmission): string {
  if (!submission.productRecommendations.moreFreshPicks.length) {
    return `
      <tr>
        <td style="padding: 0 0 10px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${EMAIL_COLORS.mutedAlt}; font-weight: 700;">MORE FRESH PICKS</td>
      </tr>
      <tr><td style="padding: 0 0 10px; font-size: 15px; line-height: 24px; color: ${EMAIL_COLORS.muted};">None recommended</td></tr>
    `;
  }

  const rows = submission.productRecommendations.moreFreshPicks
    .map((productId) => {
      const product = productLookup.get(productId);
      if (!product) return "";
      return `<tr><td style="padding: 0 0 8px; font-size: 15px; line-height: 22px; color: ${EMAIL_COLORS.ink};">• ${escapeHtml(product.name)}</td></tr>`;
    })
    .join("");

  return `
    <tr>
      <td style="padding: 0 0 10px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${EMAIL_COLORS.mutedAlt}; font-weight: 700;">MORE FRESH PICKS</td>
    </tr>
    ${rows}
  `;
}

function renderEnhancements(submission: SkinDiscoverySubmission): string {
  if (!submission.enhancementRecommendations.length) {
    return `
      <tr>
        <td style="padding: 0 0 10px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${EMAIL_COLORS.mutedAlt}; font-weight: 700;">RECOMMENDED ENHANCEMENTS</td>
      </tr>
      <tr><td style="padding: 0 0 10px; font-size: 15px; line-height: 24px; color: ${EMAIL_COLORS.muted};">None recommended</td></tr>
    `;
  }

  const rows = submission.enhancementRecommendations
    .map((enhancementId) => {
      const enhancement = enhancementLookup.get(enhancementId);
      if (!enhancement) return "";
      return `<tr><td style="padding: 0 0 8px; font-size: 15px; line-height: 22px; color: ${EMAIL_COLORS.ink};">• ${escapeHtml(enhancement.name)}</td></tr>`;
    })
    .join("");

  return `
    <tr>
      <td style="padding: 0 0 10px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${EMAIL_COLORS.mutedAlt}; font-weight: 700;">RECOMMENDED ENHANCEMENTS</td>
    </tr>
    ${rows}
  `;
}

function renderTeamEmailHtml(submission: SkinDiscoverySubmission, config: TeamEmailConfig): string {
  const subjectJourney = submission.journey.primaryJourneys.map((journey) => formatJourneyName(journey)).join(" + ");
  const now = new Date(submission.createdAt).toLocaleString();
  const customDirection = createCustomFacialDirection(submission);
  const bookedStatus = submission.actions.booked === null ? "Not yet known" : submission.actions.booked ? "Yes" : "No";
  const membershipStatus = submission.actions.membershipInterest === null ? "Not yet known" : submission.actions.membershipInterest ? "Yes" : "No";
  const boulevardTags = submission.internal.boulevardTags.length ? submission.internal.boulevardTags.join("<br />") : "None";

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>${escapeHtml("New Skin Discovery")}</title><style>${EMAIL_BASE_CSS}</style></head><body><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f0ef; padding: 32px 18px;"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 760px; background:#ffffff; border:1px solid ${EMAIL_COLORS.border}; border-radius: 18px;"><tr><td style="padding: 28px 28px 6px; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: ${EMAIL_COLORS.mutedAlt}; font-weight: 700;">NEW SKIN DISCOVERY</td></tr><tr><td style="padding: 0 28px 20px; font-size: 24px; line-height: 32px; color: ${EMAIL_COLORS.ink}; font-weight: 700;">${escapeHtml(subjectJourney)}</td></tr><tr><td style="padding: 0 28px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${EMAIL_COLORS.border}; background:#fff; border-radius: 12px;">
          <tr>
            <td style="padding: 14px 18px; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; color: ${EMAIL_COLORS.mutedAlt}; font-weight: 700;">Submission Details</td>
          </tr>
          <tr><td style="padding: 0 18px 8px; font-size: 13px; line-height: 20px; color: ${EMAIL_COLORS.muted};">Submission ID: <span style="color:${EMAIL_COLORS.ink};">${escapeHtml(submission.submissionId)}</span></td></tr>
          <tr><td style="padding: 0 18px 8px; font-size: 13px; line-height: 20px; color: ${EMAIL_COLORS.muted};">Date/time: <span style="color:${EMAIL_COLORS.ink};">${escapeHtml(now)}</span></td></tr>
          <tr><td style="padding: 0 18px 8px; font-size: 13px; line-height: 20px; color: ${EMAIL_COLORS.muted};">First Name: <span style="color:${EMAIL_COLORS.ink};">${escapeHtml(submission.guest.firstName)}</span></td></tr>
          <tr><td style="padding: 0 18px 8px; font-size: 13px; line-height: 20px; color: ${EMAIL_COLORS.muted};">Last Name: <span style="color:${EMAIL_COLORS.ink};">${escapeHtml(submission.guest.lastName)}</span></td></tr>
          <tr><td style="padding: 0 18px 8px; font-size: 13px; line-height: 20px; color: ${EMAIL_COLORS.muted};">Email: <span style="color:${EMAIL_COLORS.ink};">${escapeHtml(submission.guest.email)}</span></td></tr>
          <tr><td style="padding: 0 18px 14px; font-size: 13px; line-height: 20px; color: ${EMAIL_COLORS.muted};">Phone: <span style="color:${EMAIL_COLORS.ink};">${escapeHtml(submission.guest.phone)}</span></td></tr>
        </table>
      </td></tr>
      <tr><td style="padding: 0 28px 20px;">${renderDiscoveryAnswers(submission)}</td></tr>
      <tr><td style="padding: 0 28px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding: 0 0 10px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${EMAIL_COLORS.mutedAlt}; font-weight: 700;">SKIN JOURNEY</td></tr><tr><td style="padding: 0 0 8px; font-size: 15px; line-height: 22px; color: ${EMAIL_COLORS.ink};">Result type: ${escapeHtml(submission.journey.resultType)}</td></tr><tr><td style="padding: 0 0 8px; font-size: 15px; line-height: 22px; color: ${EMAIL_COLORS.ink};">Primary Journey(s): ${escapeHtml(submission.journey.primaryJourneys.map(formatJourneyName).join(" + "))}</td></tr>${submission.journey.secondaryJourney ? `<tr><td style="padding: 0 0 8px; font-size: 15px; line-height: 22px; color: ${EMAIL_COLORS.ink};">Supporting Journey: ${escapeHtml(formatJourneyName(submission.journey.secondaryJourney))}</td></tr>` : ""}</table></td></tr>
      <tr><td style="padding: 0 28px 18px;">${renderFeaturedProducts(submission)}</td></tr>
      <tr><td style="padding: 0 28px 18px;">${renderMoreFreshPicks(submission)}</td></tr>
      <tr><td style="padding: 0 28px 18px;">${renderEnhancements(submission)}</td></tr>
      <tr><td style="padding: 0 28px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding: 0 0 8px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${EMAIL_COLORS.mutedAlt}; font-weight: 700;">CUSTOM FACIAL DIRECTION</td></tr>
          <tr><td style="font-size: 15px; line-height: 22px; color: ${EMAIL_COLORS.ink};">${escapeHtml(customDirection)}</td></tr>
        </table>
      </td></tr>
      <tr><td style="padding: 0 28px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding: 0 0 8px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${EMAIL_COLORS.mutedAlt}; font-weight: 700;">BOULEVARD</td></tr>
          <tr><td style="padding: 0 0 8px; font-size: 15px; line-height: 22px; color: ${EMAIL_COLORS.ink};">${boulevardTags}</td></tr>
          <tr><td style="font-size: 14px; line-height: 22px; color: ${EMAIL_COLORS.muted};">Boulevard sync: Not yet connected</td></tr>
        </table>
      </td></tr>
      <tr><td style="padding: 0 28px 18px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding: 0 0 8px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${EMAIL_COLORS.mutedAlt}; font-weight: 700;">FOLLOW-UP STATUS</td></tr>
          <tr><td style="padding: 0 0 8px; font-size: 15px; line-height: 22px; color: ${EMAIL_COLORS.ink};">Booked?: ${escapeHtml(bookedStatus)}</td></tr>
          <tr><td style="padding: 0 0 8px; font-size: 15px; line-height: 22px; color: ${EMAIL_COLORS.ink};">Membership Interest: ${escapeHtml(membershipStatus)}</td></tr>
          <tr><td style="font-size: 15px; line-height: 22px; color: ${EMAIL_COLORS.ink};">Notes: ${escapeHtml(submission.internal.notes || "No notes yet")}</td></tr>
        </table>
      </td></tr>
      <tr><td style="padding: 0 28px 30px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td style="padding: 0 0 8px; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: ${EMAIL_COLORS.mutedAlt}; font-weight: 700;">INTERNAL NOTES</td></tr>
          <tr><td style="font-size: 15px; line-height: 22px; color: ${EMAIL_COLORS.ink};">${escapeHtml(submission.internal.notes || "No internal notes")}</td></tr>
        </table>
      </td></tr>
      <tr><td style="padding: 0 28px 30px; font-size: 12px; line-height: 20px; color: ${EMAIL_COLORS.mutedAlt}; text-align: center;">${escapeHtml(config.businessName ?? "Fresh Facial Bar & Lash Lounge")}${config.businessEmail ? ` | ${escapeHtml(config.businessEmail)}` : ""}${config.businessPhone ? ` | ${escapeHtml(config.businessPhone)}` : ""}${config.locationLabel ? ` | ${escapeHtml(config.locationLabel)}` : ""}</td></tr></table></td></tr></table></body></html>`;
}

function renderTeamEmailText(submission: SkinDiscoverySubmission, config: TeamEmailConfig): string {
  const subjectJourney = submission.journey.primaryJourneys.map((journey) => formatJourneyName(journey)).join(" + ");
  const bookedStatus = submission.actions.booked === null ? "Not yet known" : submission.actions.booked ? "Yes" : "No";
  const membershipStatus = submission.actions.membershipInterest === null ? "Not yet known" : submission.actions.membershipInterest ? "Yes" : "No";
  const boulevardTags = submission.internal.boulevardTags.length ? submission.internal.boulevardTags.join("\n- ") : "None";

  const lines = [
    "NEW SKIN DISCOVERY",
    `Journey: ${subjectJourney}`,
    `Submission ID: ${submission.submissionId}`,
    `Date/time: ${new Date(submission.createdAt).toLocaleString()}`,
    `First Name: ${submission.guest.firstName}`,
    `Last Name: ${submission.guest.lastName}`,
    `Email: ${submission.guest.email}`,
    `Phone: ${submission.guest.phone}`,
    "",
    "DISCOVERY ANSWERS",
    `Biggest Concern / Primary Motivation: ${submission.discovery.primaryMotivation ? mapPrimaryMotivation(submission.discovery.primaryMotivation) : "Not provided"}`,
    `Skin Experience: ${submission.discovery.skinExperience.length ? mapSelectedValues(submission.discovery.skinExperience, skinExperienceLabels).join(", ") : "Not provided"}`,
    `Desired Outcomes: ${submission.discovery.desiredOutcomes.length ? mapSelectedValues(submission.discovery.desiredOutcomes, desiredOutcomesLabels).join(", ") : "Not provided"}`,
    "",
    "SKIN JOURNEY",
    `Result type: ${submission.journey.resultType}`,
    `Primary Journey(s): ${submission.journey.primaryJourneys.map(formatJourneyName).join(" + ")}`,
    submission.journey.secondaryJourney ? `Supporting Journey: ${formatJourneyName(submission.journey.secondaryJourney)}` : "",
    "",
    "FEATURED FRESH PICKS",
    ...["cleanse", "treat", "moisturize", "protect"].map((step) => {
      const key = step as keyof typeof submission.productRecommendations.featured;
      const productId = submission.productRecommendations.featured[key];
      const product = productId ? productLookup.get(productId) : null;
      return product ? `${step}: ${product.name}` : `${step}: Not selected`;
    }),
    "",
    "MORE FRESH PICKS",
    submission.productRecommendations.moreFreshPicks.length
      ? submission.productRecommendations.moreFreshPicks.map((productId) => productLookup.get(productId)?.name ?? productId).join("\n")
      : "None recommended",
    "",
    "RECOMMENDED ENHANCEMENTS",
    submission.enhancementRecommendations.length
      ? submission.enhancementRecommendations.map((enhancementId) => enhancementLookup.get(enhancementId)?.name ?? enhancementId).join("\n")
      : "None recommended",
    "",
    "CUSTOM FACIAL DIRECTION",
    createCustomFacialDirection(submission),
    "",
    "BOULEVARD",
    boulevardTags,
    "Boulevard sync: Not yet connected",
    "",
    "FOLLOW-UP STATUS",
    `Booked?: ${bookedStatus}`,
    `Membership Interest: ${membershipStatus}`,
    `Notes: ${submission.internal.notes || "No notes yet"}`,
    "",
    "INTERNAL NOTES",
    submission.internal.notes || "No internal notes",
    "",
    config.businessName ?? "Fresh Facial Bar & Lash Lounge",
  ];

  return lines.filter((line) => line !== "").join("\n");
}

export function renderTeamDiscoveryEmail(
  submission: SkinDiscoverySubmission,
  config: TeamEmailConfig = {},
): TeamEmailTemplateResult {
  const normalizedConfig: TeamEmailConfig = {
    businessName: "Fresh Facial Bar & Lash Lounge",
    ...config,
  };

  const subjectJourney = submission.journey.primaryJourneys.map((journey) => formatJourneyName(journey)).join(" + ");

  return {
    subject: `New Skin Discovery — ${submission.guest.firstName} ${submission.guest.lastName} — ${subjectJourney}`,
    html: renderTeamEmailHtml(submission, normalizedConfig),
    text: renderTeamEmailText(submission, normalizedConfig),
  };
}
