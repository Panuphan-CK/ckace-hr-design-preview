import type {
  NotificationAdminItem,
  NotificationAdminOverview,
} from "@ckace/contracts";

export type NotificationStatusFilter =
  | "ALL"
  | NotificationAdminItem["status"];

export interface NotificationMetrics {
  readonly total: number;
  readonly pending: number;
  readonly processing: number;
  readonly sent: number;
  readonly failed: number;
  readonly cancelled: number;
  readonly deliveryCount: number;
}

export function notificationMetrics(
  overview: NotificationAdminOverview,
): NotificationMetrics {
  return overview.notifications.reduce<NotificationMetrics>(
    (total, item) => ({
      total: total.total + 1,
      pending:
        total.pending + (item.status === "PENDING" ? 1 : 0),
      processing:
        total.processing +
        (item.status === "PROCESSING" ? 1 : 0),
      sent: total.sent + (item.status === "SENT" ? 1 : 0),
      failed:
        total.failed + (item.status === "FAILED" ? 1 : 0),
      cancelled:
        total.cancelled +
        (item.status === "CANCELLED" ? 1 : 0),
      deliveryCount: total.deliveryCount + item.deliveryCount,
    }),
    {
      total: 0,
      pending: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      cancelled: 0,
      deliveryCount: 0,
    },
  );
}

export function filterNotifications(
  rows: readonly NotificationAdminItem[],
  status: NotificationStatusFilter,
  query: string,
): readonly NotificationAdminItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (status !== "ALL" && row.status !== status) {
      return false;
    }
    if (!normalizedQuery) return true;
    return [
      row.eventType,
      row.aggregateType,
      row.aggregateId,
      row.id,
      row.lastError ?? "",
    ].some((value) =>
      value.toLowerCase().includes(normalizedQuery),
    );
  });
}

export function notificationStatusLabel(
  status: NotificationAdminItem["status"],
): string {
  switch (status) {
    case "PENDING":
      return "รอส่ง";
    case "PROCESSING":
      return "กำลังส่ง";
    case "SENT":
      return "ส่งแล้ว";
    case "FAILED":
      return "ล้มเหลว";
    case "CANCELLED":
      return "ยกเลิก";
  }
}

export function notificationStatusClass(
  status: NotificationAdminItem["status"],
): string {
  return `request-status status-${status.toLowerCase()}`;
}
