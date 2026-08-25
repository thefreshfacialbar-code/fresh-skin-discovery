import { Resend } from "resend";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailSendResult = {
  ok: boolean;
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
};

export interface EmailProvider {
  send(message: EmailMessage): Promise<EmailSendResult>;
}

export type DeliveryErrorCode = "provider_error" | "validation_error" | "delivery_disabled";

export type EmailDeliveryAttempt = {
  attempted: boolean;
  success: boolean;
  messageId?: string;
  errorCode?: DeliveryErrorCode;
  errorMessage?: string;
};

export type SkinDiscoveryDeliveryResult = {
  status: "sent" | "partial-failure" | "delivery-disabled" | "invalid-submission";
  submissionId?: string;
  guestEmail: EmailDeliveryAttempt;
  teamEmail: EmailDeliveryAttempt;
  overallSuccess: boolean;
};

export type ResendEmailProviderConfig = {
  apiKey: string;
  fromEmail: string;
  replyTo?: string;
};

class ResendEmailProvider implements EmailProvider {
  private readonly client: Resend;
  private readonly fromEmail: string;
  private readonly replyTo?: string;

  constructor(config: ResendEmailProviderConfig) {
    this.client = new Resend(config.apiKey);
    this.fromEmail = config.fromEmail;
    this.replyTo = config.replyTo;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const response = await this.client.emails.send({
      from: this.fromEmail,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: this.replyTo,
    });

    if (response.error) {
      return {
        ok: false,
        errorCode: "provider_error",
        errorMessage: response.error.message ?? "Provider rejected the email request.",
      };
    }

    return {
      ok: true,
      messageId: response.data?.id,
    };
  }
}

export function createResendEmailProvider(config: ResendEmailProviderConfig): EmailProvider {
  return new ResendEmailProvider(config);
}
