-- Notifications (Owner 2026-10-16): in-app inbox for every event, LINE first and email as a second channel,
-- overdue approval reminders after 24 hours repeating every 24 hours. Additive.
ALTER TABLE "approval_steps" ADD COLUMN "lastReminderAt" TIMESTAMPTZ(3);

ALTER TABLE "notification_deliveries" ADD COLUMN "recipientEmployeeId" UUID;
CREATE UNIQUE INDEX "notification_deliveries_outboxId_channel_recipientEmployeeId_key"
  ON "notification_deliveries"("outboxId", "channel", "recipientEmployeeId");

CREATE TABLE "in_app_notifications" (
    "id" UUID NOT NULL,
    "employeeId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "requestNo" TEXT,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "sourceOutboxId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMPTZ(3),
    CONSTRAINT "in_app_notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "in_app_notifications_sourceOutboxId_employeeId_key"
  ON "in_app_notifications"("sourceOutboxId", "employeeId");
CREATE INDEX "in_app_notifications_employeeId_readAt_createdAt_idx"
  ON "in_app_notifications"("employeeId", "readAt", "createdAt");

ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
