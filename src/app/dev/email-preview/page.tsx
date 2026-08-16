import { notFound } from "next/navigation";
import { renderGuestDiscoveryEmail } from "@/emails/guestDiscoveryEmail";
import { renderTeamDiscoveryEmail } from "@/emails/teamDiscoveryEmail";
import type { SkinDiscoverySubmission } from "@/types/skinDiscoverySubmission";

const sampleSubmission: SkinDiscoverySubmission = {
  submissionId: "SUB-2026-0001",
  createdAt: "2026-08-16T12:00:00.000Z",
  guest: {
    firstName: "Mila",
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
    notes: "Interested in a brighter, smoother starting point with hydration support.",
    boulevardTags: ["Skin Discovery", "Journey - Renew", "Journey - Quench"],
  },
};

export default function EmailPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const previewBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const guestEmail = renderGuestDiscoveryEmail(sampleSubmission, {
    logoUrl: `${previewBaseUrl}/ffb-logo.png`,
    bookingUrl: "",
    previewMode: true,
  });
  const teamEmail = renderTeamDiscoveryEmail(sampleSubmission, {
    previewMode: true,
  });

  return (
    <main style={{ padding: 32, background: "#f6f1eb", color: "#1e1b1a", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ marginBottom: 12 }}>Development Email Preview</h1>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ marginBottom: 12 }}>Guest HTML</h2>
        <iframe title="Guest email preview" srcDoc={guestEmail.html} style={{ width: "100%", minHeight: 1400, border: "1px solid #ddd", background: "white" }} />
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ marginBottom: 12 }}>Guest Text</h2>
        <pre style={{ whiteSpace: "pre-wrap", background: "#fff", padding: 16, border: "1px solid #ddd" }}>{guestEmail.text}</pre>
      </section>

      <section style={{ marginBottom: 36 }}>
        <h2 style={{ marginBottom: 12 }}>Team HTML</h2>
        <iframe title="Team email preview" srcDoc={teamEmail.html} style={{ width: "100%", minHeight: 1400, border: "1px solid #ddd", background: "white" }} />
      </section>

      <section>
        <h2 style={{ marginBottom: 12 }}>Team Text</h2>
        <pre style={{ whiteSpace: "pre-wrap", background: "#fff", padding: 16, border: "1px solid #ddd" }}>{teamEmail.text}</pre>
      </section>
    </main>
  );
}
