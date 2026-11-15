import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type SavedDeliveryContext = {
  businessId: string;
  consultationId: string;
  skinPlanId: string;
};

export type DeliveryClaim = {
  claimed: boolean;
  deliveryId: string;
  status: string;
  attempts: number;
};

export async function claimEmailDelivery(
  context: SavedDeliveryContext,
  recipient: "guest" | "team",
  recipientEmail: string,
): Promise<DeliveryClaim> {
  const deliveryKey =
    `discovery_results:${recipient}:${context.consultationId}`;

  const { data, error } = await supabaseAdmin.rpc(
    "claim_skin_plan_email_delivery",
    {
      p_business_id: context.businessId,
      p_consultation_id: context.consultationId,
      p_skin_plan_id: context.skinPlanId,
      p_email_type: "discovery_results",
      p_delivery_key: deliveryKey,
      p_recipient_email: recipientEmail,
    },
  );

  if (error) {
    throw new Error(`Email delivery claim failed: ${error.message}`);
  }

  const claim = data?.[0];

  if (!claim) {
    throw new Error("Email delivery claim returned no record.");
  }

  return {
    claimed: claim.claimed,
    deliveryId: claim.delivery_id,
    status: claim.delivery_status,
    attempts: claim.attempts,
  };
}

export async function completeEmailDelivery(
  deliveryId: string,
  result:
    | {
        success: true;
        messageId: string;
      }
    | {
        success: false;
        errorMessage: string;
      },
): Promise<void> {
  const { data, error } = await supabaseAdmin.rpc(
    "complete_skin_plan_email_delivery",
    {
      p_delivery_id: deliveryId,
      p_success: result.success,
      p_resend_message_id: result.success ? result.messageId : null,
      p_error_message: result.success ? null : result.errorMessage,
    },
  );

  if (error) {
    throw new Error(
      `Email delivery completion failed: ${error.message}`,
    );
  }

  if (data !== true) {
    throw new Error(
      "Email delivery completion was rejected because the record is no longer in sending status.",
    );
  }
}