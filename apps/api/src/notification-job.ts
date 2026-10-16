import {
  dispatchNotifications,
  getPrismaClient,
  queueOverdueApprovalReminders,
  type NotificationSender,
} from "@ckace/database";

import { SmtpEmailSender } from "./notifications/email-sender";
import { LinePushSender } from "./notifications/line-sender";

/**
 * One notification cycle: queue overdue-approval reminders (24h, repeating every 24h, working hours),
 * then deliver pending events to the in-app inbox, LINE and email. Run it every few minutes
 * (Cloud Run Job + scheduler). Channels without credentials are simply skipped, so the inbox always works.
 */
async function main(): Promise<void> {
  const prisma = getPrismaClient();
  const senders: NotificationSender[] = [];
  const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
  const smtpUser = process.env.CKACE_SMTP_USER?.trim();
  const smtpPassword = process.env.CKACE_SMTP_PASSWORD?.trim();

  if (lineToken) {
    senders.push(new LinePushSender(lineToken));
  }

  if (smtpUser && smtpPassword) {
    senders.push(SmtpEmailSender.gmail(smtpUser, smtpPassword));
  }

  const reminders = await queueOverdueApprovalReminders(prisma);
  const result = await dispatchNotifications(prisma, { senders });

  console.log(
    JSON.stringify({
      job: "notification-cycle",
      channels: senders.map((sender) => sender.channel),
      remindersQueued: reminders,
      ...result,
    }),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "notification job failed");
    process.exit(1);
  });
