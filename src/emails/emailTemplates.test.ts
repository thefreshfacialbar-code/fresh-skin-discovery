import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { renderGuestDiscoveryEmail } from "@/emails/guestDiscoveryEmail";
import { renderTeamDiscoveryEmail } from "@/emails/teamDiscoveryEmail";
import type { SkinDiscoverySubmission } from "@/types/skinDiscoverySubmission";

const baseSubmission: SkinDiscoverySubmission = {
  submissionId: "SUB-TEST-01",
  createdAt: "2026-08-16T10:15:00.000Z",
  guest: {
    firstName: "Mila <script>alert(1)</script>",
    lastName: "Stone",
    email: "mila@example.com",
    phone: "(415) 555-0101",
  },
  discovery: {
    primaryMotivation: "radiant",
    skinExperience: ["dull-lacks-radiance", "fine-lines-texture"],
    desiredOutcomes: ["look-brighter", "feel-firmer-smoother"],
  },
  journey: {
    resultType: "single-primary",
    primaryJourneys: ["renew"],
    secondaryJourney: "quench",
  },
  productRecommendations: {
    featured: {
      cleanse: "make-it-melt-cleansing-balm",
      treat: "watermelonaid",
      moisturize: "three-milk-ageless-sleep-cream",
      protect: "am-replenish-non-tinted-spf-40",
    },
    moreFreshPicks: ["good-gravity-lifting-milky-spray-serum", "golden-moon-dip"],
  },
  enhancementRecommendations: ["dermaplaning", "microcurrent"],
  actions: {
    booked: null,
    membershipInterest: null,
  },
  internal: {
    notes: "<script>alert(2)</script> Interested in a brighter, smoother starting point.",
    boulevardTags: ["Skin Discovery", "Journey - Renew", "Journey - Quench"],
  },
};

test("guest email renders first name and primary journey and uses clean copy", () => {
  const guestEmail = renderGuestDiscoveryEmail(baseSubmission, { previewMode: true, bookingUrl: "https://example.com/book" });

  assert.match(guestEmail.html, /Mila &lt;script&gt;alert\(1\)&lt;\/script&gt;/i);
  assert.match(guestEmail.html, /Your Skin Discovery Journey is here/i);
  assert.match(guestEmail.html, /YOUR PRIMARY JOURNEY/i);
  assert.match(guestEmail.html, /Renew/i);
  assert.match(guestEmail.html, /Quench/i);
  assert.match(guestEmail.html, /Your Fresh Picks/i);
  assert.match(guestEmail.html, /Your Skintender Takes It From Here/i);
  assert.equal((guestEmail.html.match(/CRAFT MY FACIAL/gi) ?? []).length, 1);
  assert.match(guestEmail.html, /Explore Membership Benefits/i);
  assert.doesNotMatch(guestEmail.html, /Farmacist|Farmicist/i);
  assert.doesNotMatch(guestEmail.html, /internalScore|internal score/i);
});

test("guest email renders supporting journey and more picks section when present", () => {
  const guestEmail = renderGuestDiscoveryEmail(baseSubmission, { previewMode: true, bookingUrl: "https://example.com/book" });

  assert.match(guestEmail.html, /SUPPORTING YOUR JOURNEY/i);
  assert.match(guestEmail.html, /A FEW MORE FRESH PICKS/i);
  assert.match(guestEmail.html, /Want to meet your Fresh Picks first\?/i);
  assert.match(guestEmail.html, /Stop by the Skin Bar\. Your Skintender can walk you through your recommendations and help you find the right place to start\./i);
  assert.match(guestEmail.html, /Worth Considering/i);
  assert.match(guestEmail.html, /Dermaplaning/i);
  assert.match(guestEmail.html, /Microcurrent/i);
});

test("guest email renders all four featured slots including protect and keeps the CTA hierarchy intact", () => {
  const guestEmail = renderGuestDiscoveryEmail(baseSubmission, { previewMode: true, bookingUrl: "https://example.com/book" });

  assert.match(guestEmail.html, /CLEANSE/i);
  assert.match(guestEmail.html, /TREAT/i);
  assert.match(guestEmail.html, /MOISTURIZE/i);
  assert.match(guestEmail.html, /PROTECT/i);
  assert.match(guestEmail.html, /AM Replenish Non Tinted SPF 40/i);
  assert.equal((guestEmail.html.match(/CRAFT MY FACIAL/gi) ?? []).length, 1);
  assert.equal((guestEmail.html.match(/Explore Membership Benefits/gi) ?? []).length, 1);
  assert.match(guestEmail.html, /Your Skintender can help determine whether these Enhancements make sense for your custom facial\./i);
  assert.doesNotMatch(guestEmail.html, /Farmacist|Farmicist/i);
});

test("dual primary guest email renders both journeys with equal emphasis", () => {
  const dualPrimarySubmission: SkinDiscoverySubmission = {
    ...baseSubmission,
    journey: {
      resultType: "dual-primary",
      primaryJourneys: ["illuminate", "renew"],
      secondaryJourney: null,
    },
  };

  const guestEmail = renderGuestDiscoveryEmail(dualPrimarySubmission, { previewMode: true, bookingUrl: "https://example.com/book" });
  assert.match(guestEmail.html, /YOUR PRIMARY JOURNEY/i);
  assert.match(guestEmail.html, /Illuminate/i);
  assert.match(guestEmail.html, /Renew/i);
  assert.doesNotMatch(guestEmail.html, /SUPPORTING YOUR JOURNEY/i);
});

test("team email includes all submission discoverable fields and action statuses", () => {
  const teamEmail = renderTeamDiscoveryEmail(baseSubmission);

  assert.match(teamEmail.html, /Mila/i);
  assert.match(teamEmail.html, /Stone/i);
  assert.match(teamEmail.html, /mila@example.com/i);
  assert.match(teamEmail.html, /\(415\) 555-0101/i);
  assert.match(teamEmail.html, /DISCOVERY ANSWERS/i);
  assert.match(teamEmail.html, /Biggest Concern \/ Primary Motivation/i);
  assert.match(teamEmail.html, /Skin Experience/i);
  assert.match(teamEmail.html, /Desired Outcomes/i);
  assert.match(teamEmail.html, /SKIN JOURNEY/i);
  assert.match(teamEmail.html, /FEATURED FRESH PICKS/i);
  assert.match(teamEmail.html, /MORE FRESH PICKS/i);
  assert.match(teamEmail.html, /RECOMMENDED ENHANCEMENTS/i);
  assert.match(teamEmail.html, /BOULEVARD/i);
  assert.match(teamEmail.html, /Boulevard sync: Not yet connected/i);
  assert.match(teamEmail.html, /Booked\?: Not yet known/i);
  assert.match(teamEmail.html, /Membership Interest: Not yet known/i);
  assert.match(teamEmail.html, /CUSTOM FACIAL DIRECTION/i);
  assert.doesNotMatch(teamEmail.html, /internalScore|internal score/i);
});

test("security escaping blocks script injection in guest name and notes", () => {
  const guestEmail = renderGuestDiscoveryEmail(baseSubmission, { previewMode: true, bookingUrl: "https://example.com/book" });

  assert.doesNotMatch(guestEmail.html, /<script>alert\(1\)<\/script>/i);
  assert.doesNotMatch(guestEmail.html, /<script>alert\(2\)<\/script>/i);
  assert.match(guestEmail.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/i);
  assert.match(guestEmail.html, /&lt;script&gt;alert\(2\)&lt;\/script&gt;/i);
});

test("guest and team emails use the exact stored TiZO protect product and no fabricated fallback appears anywhere in src", () => {
  const protectProductId = "am-replenish-non-tinted-spf-40";
  const storedProtectName = "AM Replenish Non Tinted SPF 40";
  const fabricatedProtectName = ["Your Skin Glows", " Sun Protection Cream"].join("");
  const fabricatedProtectId = ["your-skin-glows", "-sun-protection-cream"].join("");
  const submission = {
    ...baseSubmission,
    productRecommendations: {
      ...baseSubmission.productRecommendations,
      featured: {
        ...baseSubmission.productRecommendations.featured,
        protect: protectProductId,
      },
    },
  };

  const guestEmail = renderGuestDiscoveryEmail(submission, { previewMode: true, bookingUrl: "https://example.com/book" });
  const teamEmail = renderTeamDiscoveryEmail(submission);

  assert.match(guestEmail.html, new RegExp(storedProtectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  assert.match(teamEmail.html, new RegExp(storedProtectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  assert.doesNotMatch(guestEmail.html, new RegExp(fabricatedProtectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  assert.doesNotMatch(teamEmail.html, new RegExp(fabricatedProtectName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  assert.doesNotMatch(guestEmail.html, /Sun Protection Cream/i);
  assert.doesNotMatch(teamEmail.html, /Sun Protection Cream/i);

  const srcRoot = path.join(process.cwd(), "src");
  const files: string[] = [];
  function walk(current: string) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx|md)$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  walk(srcRoot);

  let fabricatedStringFound = false;
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    if (content.includes(fabricatedProtectName) || content.includes(fabricatedProtectId)) {
      fabricatedStringFound = true;
      break;
    }
  }
  assert.equal(fabricatedStringFound, false);
});

test("both guest and team emails produce readable plain text without markup", () => {
  const guestEmail = renderGuestDiscoveryEmail(baseSubmission, { previewMode: true, bookingUrl: "https://example.com/book" });
  const teamEmail = renderTeamDiscoveryEmail(baseSubmission);

  assert.match(guestEmail.text, /Your Skin Discovery Journey is here/i);
  assert.match(guestEmail.text, /CLEANSE:/i);
  assert.doesNotMatch(guestEmail.text, /<html|<table|<div/i);

  assert.match(teamEmail.text, /NEW SKIN DISCOVERY/i);
  assert.match(teamEmail.text, /FEATURED FRESH PICKS/i);
  assert.doesNotMatch(teamEmail.text, /<html|<table|<div/i);
});
