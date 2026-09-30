import "server-only";

import { createResendEmailProvider } from "@/lib/email/emailProvider";

type DeliverFinalSkinPlanOptions = {
  guestEmail: string;
  accessToken: string;
  firstName?: string;
};

export type FinalSkinPlanDeliveryResult = {
  success: boolean;
  messageId?: string;
  errorMessage?: string;
};

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export async function deliverFinalSkinPlan({
  guestEmail,
  accessToken,
  firstName,
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

  const result = await provider.send({
    to: guestEmail,
    subject: firstName
  ? `${firstName}, Your Personalized Skin Plan Is Ready`
  : "Your Personalized Skin Plan Is Ready",
    html: `
      <div style="font-family: Arial, sans-serif; color: #302C2A; line-height: 1.6;">
        <h1>Your Personalized Skin Plan Is Ready</h1>

        <p>
  ${firstName ? `Hi ${firstName},` : "Hello,"}
</p>

<p>
  Your Fresh professional has completed your personalized review and
  refined your Skin Plan based on your skin goals and routine needs.
</p>

<p>
  Your Fresh Method routine is ready to explore.
</p>

        <p>
          <a
            href="${skinPlanUrl}"
            style="display:inline-block;padding:14px 22px;background:#302C2A;color:#ffffff;text-decoration:none;border-radius:999px;"
          >
            View My Skin Plan
          </a>
        </p>

        <p>
          Your plan includes the products and guidance selected specifically
          for your skin goals.
        </p>

        <p>
          Fresh Facial Bar &amp; Lash Lounge
        </p>
      </div>
    `,
    text: [
  "Your Personalized Skin Plan Is Ready",
  "",
  firstName ? `Hi ${firstName},` : "Hello,",
  "",
  "Your Fresh professional has completed your personalized review and refined your Skin Plan based on your skin goals and routine needs.",
  "",
  "Your Fresh Method routine is ready to explore.",
  "",
  `View your Skin Plan: ${skinPlanUrl}`,
  "",
  "Fresh Facial Bar & Lash Lounge",
].join("\n"),
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