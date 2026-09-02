import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSkinDiscoverySubmission,
  validateSkinDiscoverySubmission,
} from "@/lib/email/sendSkinDiscoveryEmails";
import type {
  EmailMessage,
  EmailProvider,
  SkinDiscoveryDeliveryResult,
} from "@/lib/email/emailProvider";

const validSubmission = buildSkinDiscoverySubmission({
  guest: {
    firstName: "Jamie",
    lastName: "Parker",
    email: "jamie@example.com",
    phone: "(415) 555-0101",
  },
  discovery: {
    primaryMotivation: "radiant",
    skinExperience: ["dull-lacks-radiance"],
    desiredOutcomes: ["look-brighter"],
  },
  journeyResult: {
    resultType: "single-primary",
    primaryJourneys: ["renew"],
    secondaryJourney: "quench",
    scores: { quench: 4, calm: 3, purify: 2, illuminate: 5, renew: 7 },
    supports: { quench: 2, calm: 2, purify: 1, illuminate: 4, renew: 5 },
    selectedAnswers: {
      primaryMotivation: "radiant",
      skinExperience: ["dull-lacks-radiance"],
      desiredOutcomes: ["look-brighter"],
    },
  },
  productRecommendation: {
    featured: {
      cleanse: { productId: "cleanse-1", productName: "Cleanse", category: "Cleanser", role: "Cleanse", guestBenefit: "Soft cleanse", internalScore: 12, matchReasons: [], farmacistReviewRecommended: false },
      treat: { productId: "treat-1", productName: "Treat", category: "Serum & Treatment", role: "Treat", guestBenefit: "Treats texture", internalScore: 12, matchReasons: [], farmacistReviewRecommended: false },
      moisturize: { productId: "moist-1", productName: "Moisturize", category: "Moisturizer", role: "Moisturize", guestBenefit: "Hydrates", internalScore: 12, matchReasons: [], farmacistReviewRecommended: false },
      protect: { productId: "protect-1", productName: "Protect", category: "Sun Protection", role: "Protect", guestBenefit: "Protects", internalScore: 12, matchReasons: [], farmacistReviewRecommended: false },
    },
    moreFreshPicks: [],
    journeyContext: { primaryJourneys: ["renew"], secondaryJourney: "quench" },
    modifiers: [],
    resultType: "recommendations-ready",
  },
  enhancementRecommendations: ["microcurrent"],
  actions: { booked: null, membershipInterest: null },
  internalNotes: "Interested in a brighter complexion.",
});

class StubProvider implements EmailProvider {
  public delivered: EmailMessage[] = [];
  public failure?: { guest?: boolean; team?: boolean };

  async send(message: EmailMessage) {
    this.delivered.push(message);
    if (this.failure?.guest && message.to === validSubmission.guest.email) {
      throw new Error("guest failed");
    }
    if (this.failure?.team && message.to === "team@example.com") {
      throw new Error("team failed");
    }
    return { ok: true, messageId: `msg-${this.delivered.length}` };
  }
}

test("valid guest delivery uses guest recipient and correct guest template subject", async () => {
  const provider = new StubProvider();
  const result = await (await import("@/lib/email/sendSkinDiscoveryEmails")).sendSkinDiscoveryEmails(validSubmission, {
    provider,
    teamRecipient: "team@example.com",
    config: { appUrl: "https://example.com", bookingUrl: "https://example.com/book", logoUrl: "https://example.com/logo.png" },
  });

  assert.equal(result.guestEmail.attempted, true);
  assert.equal(result.guestEmail.success, true);
  assert.equal(provider.delivered[0].to, "jamie@example.com");
  assert.match(provider.delivered[0].subject, /Your Skin Discovery Journey is here/i);
  assert.match(provider.delivered[0].html, /Your Skin Discovery Journey is here/i);
  assert.equal(result.overallSuccess, true);
});

test("team delivery uses server-configured recipient and correct team subject", async () => {
  const provider = new StubProvider();
  const result = await (await import("@/lib/email/sendSkinDiscoveryEmails")).sendSkinDiscoveryEmails(validSubmission, {
    provider,
    teamRecipient: "team@example.com",
    config: { appUrl: "https://example.com", bookingUrl: "https://example.com/book", logoUrl: "https://example.com/logo.png" },
  });

  assert.equal(result.teamEmail.attempted, true);
  assert.equal(result.teamEmail.success, true);
  assert.equal(provider.delivered[1].to, "team@example.com");
  assert.match(provider.delivered[1].subject, /New Skin Discovery — Jamie Parker — Renew/i);
  assert.match(provider.delivered[1].html, /NEW SKIN DISCOVERY/i);
});

test("no-result submission sends the internal Mixo follow-up without fabricating a journey", async () => {
  const noResultSubmission = buildSkinDiscoverySubmission({
    guest: validSubmission.guest,
    discovery: validSubmission.discovery,
    journeyResult: {
      ...validSubmission.journey,
      resultType: "no-strong-journey",
      primaryJourneys: [],
      secondaryJourney: null,
      scores: { quench: 0, calm: 0, purify: 0, illuminate: 0, renew: 0 },
      supports: { quench: 0, calm: 0, purify: 0, illuminate: 0, renew: 0 },
      selectedAnswers: validSubmission.discovery,
    },
    productRecommendation: null,
    enhancementRecommendations: [],
  });
  const provider = new StubProvider();
  const { sendSkinDiscoveryEmails } = await import("@/lib/email/sendSkinDiscoveryEmails");
  const result = await sendSkinDiscoveryEmails(noResultSubmission, {
    provider,
    teamRecipient: "team@example.com",
    config: { appUrl: "https://example.com", bookingUrl: "https://example.com/book", logoUrl: "https://example.com/logo.png" },
  });

  assert.equal(noResultSubmission.journey.primaryJourneys.length, 0);
  assert.equal(noResultSubmission.journey.resultType, "no-strong-journey");
  assert.equal(result.teamEmail.success, true);
  assert.equal(provider.delivered.length, 2);
  assert.match(provider.delivered[1].subject, /Skin Discovery needs Mixo follow-up/i);
  assert.match(provider.delivered[1].html, /no strong Skin Journey result was generated/i);
});

test("validation rejects malformed submission and missing required fields", () => {
  const invalid = { ...validSubmission, guest: { ...validSubmission.guest, email: "" } };
  const result = validateSkinDiscoverySubmission(invalid);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /guest email/i);

  const missingId = { ...validSubmission, submissionId: "" };
  const second = validateSkinDiscoverySubmission(missingId);
  assert.equal(second.valid, false);
  assert.match(second.errors.join("\n"), /submissionId/i);
});

test("partial failure returns structured result without invalidating journey flow", async () => {
  const provider = new StubProvider();
  provider.failure = { team: true };
  const result = await (await import("@/lib/email/sendSkinDiscoveryEmails")).sendSkinDiscoveryEmails(validSubmission, {
    provider,
    teamRecipient: "team@example.com",
    config: { appUrl: "https://example.com", bookingUrl: "https://example.com/book", logoUrl: "https://example.com/logo.png" },
  });

  assert.equal(result.guestEmail.success, true);
  assert.equal(result.teamEmail.success, false);
  assert.equal(result.overallSuccess, false);
  assert.equal(result.teamEmail.errorCode, "provider_error");
});

test("duplicate call with same submissionId does not resend already-successful email", async () => {
  const provider = new StubProvider();
  const { sendSkinDiscoveryEmails, createInMemoryDeliveryStateStore } = await import("@/lib/email/sendSkinDiscoveryEmails");
  const store = createInMemoryDeliveryStateStore();

  await sendSkinDiscoveryEmails(validSubmission, { provider, teamRecipient: "team@example.com", config: { appUrl: "https://example.com", bookingUrl: "https://example.com/book", logoUrl: "https://example.com/logo.png" }, store });
  const second = await sendSkinDiscoveryEmails(validSubmission, { provider, teamRecipient: "team@example.com", config: { appUrl: "https://example.com", bookingUrl: "https://example.com/book", logoUrl: "https://example.com/logo.png" }, store });

  assert.equal(second.guestEmail.attempted, false);
  assert.equal(second.teamEmail.attempted, false);
  assert.equal(second.guestEmail.success, true);
  assert.equal(second.teamEmail.success, true);
  assert.equal(provider.delivered.length, 2);
});

test("development disabled mode returns delivery-disabled status without crashing", async () => {
  const { sendSkinDiscoveryEmails } = await import("@/lib/email/sendSkinDiscoveryEmails");
  const result = await sendSkinDiscoveryEmails(validSubmission, {
    provider: { async send() { return { ok: false, messageId: undefined }; } },
    teamRecipient: "team@example.com",
    config: { appUrl: "https://example.com", bookingUrl: "https://example.com/book", logoUrl: "https://example.com/logo.png" },
    disabled: true,
  });

  assert.equal(result.status, "delivery-disabled");
  assert.equal(result.guestEmail.attempted, false);
  assert.equal(result.teamEmail.attempted, false);
});

const asResult = (value: SkinDiscoveryDeliveryResult): SkinDiscoveryDeliveryResult => value;

test("no relay: client cannot override team recipient or supply raw HTML", () => {
  const invalid = {
    ...validSubmission,
    guest: {
      ...validSubmission.guest,
      email: "attacker@example.com",
    },
    to: "another@example.com",
    subject: "hello",
    html: "<script>alert(1)</script>",
  };

  const result = validateSkinDiscoverySubmission(invalid);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /guest email|submissionId|journey/i);
  assert.equal(
    asResult({ status: "partial-failure", guestEmail: { attempted: false, success: false }, teamEmail: { attempted: false, success: false }, overallSuccess: false }).overallSuccess,
    false,
  );
});
