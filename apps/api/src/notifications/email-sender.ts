import type { NotificationSender } from "@ckace/database";
import nodemailer from "nodemailer";

export interface EmailTransport {
  sendMail(message: { from: string; to: string; subject: string; text: string }): Promise<{ messageId?: string }>;
}

/** Sends from the company mailbox through SMTP; the app password comes from the runtime secret configuration. */
export class SmtpEmailSender implements NotificationSender {
  readonly channel = "EMAIL" as const;

  constructor(
    private readonly from: string,
    private readonly transport: EmailTransport,
  ) {}

  static gmail(user: string, appPassword: string): SmtpEmailSender {
    if (!user.trim() || !appPassword.trim()) {
      throw new Error("SMTP user and password are required");
    }

    return new SmtpEmailSender(
      `"CKACE HR" <${user}>`,
      nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: { user, pass: appPassword },
      }),
    );
  }

  async send(input: { readonly to: string; readonly title: string; readonly body: string }): Promise<string | null> {
    const result = await this.transport.sendMail({
      from: this.from,
      to: input.to,
      subject: input.title,
      text: input.body,
    });

    return result.messageId ?? null;
  }
}
