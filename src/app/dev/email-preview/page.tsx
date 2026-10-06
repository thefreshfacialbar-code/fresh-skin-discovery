import { notFound } from "next/navigation";
import { renderGuestDiscoveryEmail } from "@/emails/guestDiscoveryEmail";
import { renderTeamDiscoveryEmail } from "@/emails/teamDiscoveryEmail";
import { renderFinalSkinPlanEmail } from "@/lib/email/deliverFinalSkinPlan";
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
    scores: {
  quench: 4,
  calm: 1,
  purify: 1,
  illuminate: 3,
  renew: 6,
},
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
const gentlemenSampleSubmission: SkinDiscoverySubmission = {
  ...sampleSubmission,
  submissionId: "CGC-2026-0001",
  experience: "gentlemens-corner",
  guest: {
    ...sampleSubmission.guest,
    firstName: "James",
  },
  productRecommendations: {
    featured: {
      cleanse: "clean-slate",
      treat: "zero-in",
      moisturize: "thirsty-face",
      protect: "am-replenish-non-tinted-spf-40",
    },
    moreFreshPicks: ["deep-clean", "long-night"],
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
  productCommerce: [
    {
      productId: "make-it-melt-cleansing-balm",
      productUrl: "https://thefreshfacialbar.com/products/make-it-melt-cleansing-balm",
      shopifyVariantId: "gid://shopify/ProductVariant/11111111111111",
    },
    {
      productId: "watermelonaid",
      productUrl: "https://thefreshfacialbar.com/products/watermelonaid",
      shopifyVariantId: "gid://shopify/ProductVariant/22222222222222",
    },
    {
      productId: "three-milk-ageless-sleep-cream",
      productUrl: "https://thefreshfacialbar.com/products/three-milk-ageless-sleep-cream",
      shopifyVariantId: "gid://shopify/ProductVariant/33333333333333",
    },
    {
      productId: "am-replenish-non-tinted-spf-40",
      productUrl: "https://thefreshfacialbar.com/products/am-replenish-non-tinted-spf-40",
      shopifyVariantId: "gid://shopify/ProductVariant/44444444444444",
    },
    {
      productId: "good-gravity-lifting-milky-spray-serum",
      productUrl: "https://thefreshfacialbar.com/products/good-gravity-lifting-milky-spray-serum",
      shopifyVariantId: "gid://shopify/ProductVariant/55555555555555",
    },
    {
      productId: "golden-moon-dip",
      productUrl: "https://thefreshfacialbar.com/products/golden-moon-dip",
      shopifyVariantId: "gid://shopify/ProductVariant/66666666666666",
    },
  ],
});
const gentlemenEmail = renderGuestDiscoveryEmail(
  gentlemenSampleSubmission,
  {
    logoUrl: `${previewBaseUrl}/ffb-logo.png`,
    websiteUrl: previewBaseUrl,
    bookingUrl: "",
    previewMode: true,
    productCommerce: [
      {
        productId: "clean-slate",
        productUrl: "https://thefreshfacialbar.com/products/clean-slate",
        shopifyVariantId: "gid://shopify/ProductVariant/71111111111111",
      },
      {
        productId: "zero-in",
        productUrl: "https://thefreshfacialbar.com/products/zero-in",
        shopifyVariantId: "gid://shopify/ProductVariant/72222222222222",
      },
      {
        productId: "thirsty-face",
        productUrl: "https://thefreshfacialbar.com/products/thirsty-face",
        shopifyVariantId: "gid://shopify/ProductVariant/73333333333333",
      },
      {
        productId: "am-replenish-non-tinted-spf-40",
        productUrl: "https://thefreshfacialbar.com/products/am-replenish-non-tinted-spf-40",
        shopifyVariantId: "gid://shopify/ProductVariant/74444444444444",
      },
      {
        productId: "deep-clean",
        productUrl: "https://thefreshfacialbar.com/products/deep-clean",
        shopifyVariantId: "gid://shopify/ProductVariant/75555555555555",
      },
      {
        productId: "long-night",
        productUrl: "https://thefreshfacialbar.com/products/long-night",
        shopifyVariantId: "gid://shopify/ProductVariant/76666666666666",
      },
    ],
  },
);
const finalFreshEmail = renderFinalSkinPlanEmail({
  firstName: "Mila",
  experience: "fresh-facial-bar-lash-lounge",
  skinPlanUrl: `${previewBaseUrl}/skin-plan?token=preview-fresh-token`,
  appUrl: previewBaseUrl,
  products: [
    {
      productId: "make-it-melt-cleansing-balm",
      routineStep: "Cleanse",
      routineOrder: 1,
      productName: "Make It Melt Cleansing Balm",
      brand: "FarmHouse Fresh",
      customerGuidance: null,
      usageType: "daily",
      timing: "morning-evening",
      frequency: "daily",
      productUrl:
        "https://thefreshfacialbar.com/products/make-it-melt-cleansing-balm",
      shopifyVariantId:
        "gid://shopify/ProductVariant/11111111111111",
    },
    {
      productId: "watermelonaid",
      routineStep: "Treat",
      routineOrder: 2,
      productName: "WatermelonAid",
      brand: "FarmHouse Fresh",
      customerGuidance: null,
      usageType: "daily",
      timing: "morning",
      frequency: "daily",
      productUrl:
        "https://thefreshfacialbar.com/products/watermelonaid",
      shopifyVariantId:
        "gid://shopify/ProductVariant/22222222222222",
    },
    {
      productId: "three-milk-ageless-moisturizer",
      routineStep: "Moisturize",
      routineOrder: 3,
      productName: "Three Milk Ageless Moisturizer",
      brand: "FarmHouse Fresh",
      customerGuidance: null,
      usageType: "daily",
      timing: "morning-evening",
      frequency: "daily",
      productUrl:
        "https://thefreshfacialbar.com/products/three-milk-ageless-moisturizer",
      shopifyVariantId:
        "gid://shopify/ProductVariant/33333333333333",
    },
    {
      productId: "am-replenish-non-tinted-spf-40",
      routineStep: "Protect",
      routineOrder: 4,
      productName: "AM Replenish Non-Tinted SPF 40",
      brand: "TiZO",
      customerGuidance: null,
      usageType: "daily",
      timing: "morning",
      frequency: "daily",
      productUrl:
        "https://thefreshfacialbar.com/products/am-replenish-non-tinted-spf-40",
      shopifyVariantId:
        "gid://shopify/ProductVariant/44444444444444",
    },
  ],
});
const finalGentlemensEmail = renderFinalSkinPlanEmail({
  firstName: "James",
  experience: "gentlemens-corner",
  skinPlanUrl: `${previewBaseUrl}/skin-plan?token=preview-cgc-token`,
  appUrl: previewBaseUrl,
  products: [
    {
      productId: "zero-in",
      routineStep: "Treat",
      routineOrder: 1,
      productName: "Zero In",
      brand: "Curated Gentlemen's Corner",
      customerGuidance: null,
      usageType: "daily",
      timing: "morning-evening",
      frequency: "daily",
      productUrl:
        "https://thefreshfacialbar.com/products/zero-in",
      shopifyVariantId:
        "gid://shopify/ProductVariant/72222222222222",
    },
    {
      productId: "long-night",
      routineStep: "Moisturize",
      routineOrder: 2,
      productName: "Long Night",
      brand: "Curated Gentlemen's Corner",
      customerGuidance: null,
      usageType: "daily",
      timing: "evening",
      frequency: "daily",
      productUrl:
        "https://thefreshfacialbar.com/products/long-night",
      shopifyVariantId:
        "gid://shopify/ProductVariant/76666666666666",
    },
    {
      productId: "am-replenish-non-tinted-spf-40",
      routineStep: "Protect",
      routineOrder: 3,
      productName: "AM Replenish Non-Tinted SPF 40",
      brand: "TiZO",
      customerGuidance: null,
      usageType: "daily",
      timing: "morning",
      frequency: "daily",
      productUrl:
        "https://thefreshfacialbar.com/products/am-replenish-non-tinted-spf-40",
      shopifyVariantId:
        "gid://shopify/ProductVariant/74444444444444",
    },
  ],
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
  <h2 style={{ marginBottom: 12 }}>Gentlemen&apos;s Corner Guest HTML</h2>
  <iframe
    title="Gentlemen's Corner email preview"
    srcDoc={gentlemenEmail.html}
    style={{
      width: "100%",
      minHeight: 1400,
      border: "1px solid #ddd",
      background: "white",
    }}
  />
</section>
<section style={{ marginBottom: 36 }}>
  <h2 style={{ marginBottom: 12 }}>
    Fresh Final Skin Plan HTML
  </h2>

  <iframe
    title="Fresh final Skin Plan email preview"
    srcDoc={finalFreshEmail.html}
    style={{
      width: "100%",
      minHeight: 1200,
      border: "1px solid #ddd",
      background: "white",
    }}
  />
</section>
<section style={{ marginBottom: 36 }}>
  <h2 style={{ marginBottom: 12 }}>
    Gentlemen&apos;s Corner Final Skin Plan HTML
  </h2>

  <iframe
    title="Gentlemen's Corner final Skin Plan email preview"
    srcDoc={finalGentlemensEmail.html}
    style={{
      width: "100%",
      minHeight: 1200,
      border: "1px solid #ddd",
      background: "white",
    }}
  />
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
