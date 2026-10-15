import { describe, expect, it } from "vitest";
import type { NotificationAdminOverview } from "@ckace/contracts";

import {
  filterNotifications,
  notificationMetrics,
  notificationStatusLabel,
} from "./notifications-view";

const overview: NotificationAdminOverview = {
  canRetry: true,
  notifications: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      aggregateType: "LeaveRequest",
      aggregateId: "leave-001",
      eventType: "LEAVE_APPROVED",
      status: "SENT",
      attempts: 1,
      lastError: null,
      availableAt: "2026-10-07T10:00:00.000Z",
      createdAt: "2026-10-07T09:59:00.000Z",
      deliveryCount: 2,
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      aggregateType: "MedicalClaim",
      aggregateId: "medical-002",
      eventType: "MEDICAL_APPROVED",
      status: "FAILED",
      attempts: 3,
      lastError: "provider timeout",
      availableAt: "2026-10-07T10:10:00.000Z",
      createdAt: "2026-10-07T10:09:00.000Z",
      deliveryCount: 1,
    },
  ],
};

describe("Desktop Notifications view helpers", () => {
  it("derives operational metrics", () => {
    expect(notificationMetrics(overview)).toEqual({
      total: 2,
      pending: 0,
      processing: 0,
      sent: 1,
      failed: 1,
      cancelled: 0,
      deliveryCount: 3,
    });
  });

  it("filters by status and text", () => {
    expect(
      filterNotifications(
        overview.notifications,
        "FAILED",
        "medical",
      ),
    ).toHaveLength(1);
    expect(
      filterNotifications(
        overview.notifications,
        "ALL",
        "provider timeout",
      ),
    ).toHaveLength(1);
  });

  it("renders canonical status labels", () => {
    expect(notificationStatusLabel("PROCESSING")).toBe(
      "กำลังส่ง",
    );
    expect(notificationStatusLabel("FAILED")).toBe("ล้มเหลว");
  });
});
