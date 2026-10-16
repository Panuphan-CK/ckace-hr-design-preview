import { describe, expect, it } from "vitest";

import {
  classifyNotificationEvent,
  isReminderDue,
  isReminderWindow,
  notificationText,
} from "./notification-messages";

describe("notification classification", () => {
  it("tells the approver about new, resubmitted and advanced requests", () => {
    for (const event of ["LEAVE_REQUEST_CREATED", "OVERTIME_REQUEST_RESUBMITTED", "MEDICAL_APPROVAL_ADVANCED", "TIME_CORRECTION_CREATED"]) {
      expect(classifyNotificationEvent(event)).toEqual({ audience: "APPROVER", kind: "REQUEST_WAITING" });
    }
  });

  it("tells the requester about the outcome", () => {
    expect(classifyNotificationEvent("OVERTIME_REQUEST_APPROVED")).toEqual({ audience: "REQUESTER", kind: "REQUEST_APPROVED" });
    expect(classifyNotificationEvent("MEDICAL_CLAIM_AUTO_APPROVED").kind).toBe("REQUEST_APPROVED");
    expect(classifyNotificationEvent("TIME_CORRECTION_REJECTED").kind).toBe("REQUEST_REJECTED");
    expect(classifyNotificationEvent("MEDICAL_CLAIM_REVISION_REQUESTED").kind).toBe("REQUEST_REVISION");
    expect(classifyNotificationEvent("LEAVE_REQUEST_WITHDRAWN").kind).toBe("REQUEST_WITHDRAWN");
  });

  it("uses the request status for the shared leave decision event", () => {
    expect(classifyNotificationEvent("LEAVE_REQUEST_DECIDED", "PENDING").audience).toBe("APPROVER");
    expect(classifyNotificationEvent("LEAVE_REQUEST_DECIDED", "APPROVED").kind).toBe("REQUEST_APPROVED");
    expect(classifyNotificationEvent("LEAVE_REQUEST_DECIDED", "REJECTED").kind).toBe("REQUEST_REJECTED");
    expect(classifyNotificationEvent("LEAVE_REQUEST_DECIDED", "REVISION_REQUESTED").kind).toBe("REQUEST_REVISION");
    expect(classifyNotificationEvent("LEAVE_REQUEST_DECIDED", "CANCELLED").audience).toBe("NONE");
  });

  it("handles delegation, reminders, account approval and ignores noise", () => {
    expect(classifyNotificationEvent("APPROVAL_DELEGATION_CREATED").audience).toBe("DELEGATE");
    expect(classifyNotificationEvent("APPROVAL_REMINDER")).toEqual({ audience: "APPROVER", kind: "APPROVAL_REMINDER" });
    expect(classifyNotificationEvent("ACCOUNT_APPROVED").audience).toBe("EMPLOYEE");
    expect(classifyNotificationEvent("ATTENDANCE_CHECKED_IN").audience).toBe("NONE");
    expect(classifyNotificationEvent("LEAVE_REQUEST_CANCELLED").audience).toBe("NONE");
  });
});

describe("notification text", () => {
  it("mentions request number, requester and summary", () => {
    const text = notificationText({ kind: "REQUEST_WAITING", requestNo: "LEV-0007", requestLabel: "ใบลา", requesterName: "สมชาย", summary: "ลาพักร้อน 2026-11-02" });
    expect(text.title).toBe("มีใบลารออนุมัติ LEV-0007");
    expect(text.body).toContain("ของ สมชาย");
    expect(text.body).toContain("ลาพักร้อน 2026-11-02");
  });

  it("includes the comment for rejection and send-back, and clips long text", () => {
    const text = notificationText({ kind: "REQUEST_REVISION", requestNo: "OT-0003", requestLabel: "คำขอ OT", comment: "ก".repeat(500) });
    expect(text.body).toContain("ส่งกลับให้แก้ไข");
    expect(text.body.length).toBeLessThan(300);
    expect(text.body).toContain("…");
  });

  it("separates a Latin request label from the Thai text that follows", () => {
    expect(notificationText({ kind: "REQUEST_WAITING", requestNo: "OT-0001", requestLabel: "คำขอ OT" }).title).toBe("มีคำขอ OT รออนุมัติ OT-0001");
    expect(notificationText({ kind: "REQUEST_APPROVED", requestNo: "OT-0001", requestLabel: "คำขอ OT" }).body).toContain("OT-0001 ของคุณ");
  });

  it("states how long a reminder has been waiting", () => {
    expect(notificationText({ kind: "APPROVAL_REMINDER", requestNo: "MED-0001", requestLabel: "คำขอเบิกค่ารักษา", hoursPending: 49.7 }).body).toContain("49 ชั่วโมง");
  });
});

describe("reminder timing", () => {
  const assignedAt = new Date("2026-10-14T03:00:00.000Z");

  it("waits 24 hours, then repeats every 24 hours", () => {
    expect(isReminderDue({ assignedAt, lastReminderAt: null, now: new Date("2026-10-15T02:59:00.000Z") })).toBe(false);
    expect(isReminderDue({ assignedAt, lastReminderAt: null, now: new Date("2026-10-15T03:00:00.000Z") })).toBe(true);
    expect(isReminderDue({ assignedAt, lastReminderAt: new Date("2026-10-15T03:05:00.000Z"), now: new Date("2026-10-16T03:00:00.000Z") })).toBe(false);
    expect(isReminderDue({ assignedAt, lastReminderAt: new Date("2026-10-15T03:05:00.000Z"), now: new Date("2026-10-16T03:06:00.000Z") })).toBe(true);
  });

  it("only sends during working hours on working days", () => {
    expect(isReminderWindow({ isoWeekday: 3, minutesOfDay: 9 * 60, isWorkday: true })).toBe(true);
    expect(isReminderWindow({ isoWeekday: 3, minutesOfDay: 8 * 60 + 59, isWorkday: true })).toBe(false);
    expect(isReminderWindow({ isoWeekday: 3, minutesOfDay: 17 * 60 + 30, isWorkday: true })).toBe(false);
    expect(isReminderWindow({ isoWeekday: 6, minutesOfDay: 10 * 60, isWorkday: false })).toBe(false);
  });
});
