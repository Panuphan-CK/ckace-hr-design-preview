import { describe, expect, it } from "vitest";
import type { LeaveCalendarItem, RequestStatusItem } from "@ckace/contracts";
import {
  baht,
  bangkokDateKey,
  dayLabel,
  greeting,
  inProgressRequests,
  leaveTone,
  longThaiDate,
  teamLeaveThisWeek,
  weekRange,
} from "./dashboard-view";

function item(overrides: Partial<LeaveCalendarItem> = {}): LeaveCalendarItem {
  return {
    id: "c1",
    employeeId: "e2",
    employeeName: "พิมพ์ชนก ใจดี",
    leaveType: "ลากิจ",
    startDate: "2026-10-15",
    endDate: "2026-10-15",
    durationCode: "FULL_DAY",
    status: "APPROVED",
    currentApprovalStep: null,
    ...overrides,
  };
}

function request(overrides: Partial<RequestStatusItem> = {}): RequestStatusItem {
  return {
    id: "r1",
    requestNo: "LEV-0001",
    kind: "LEAVE",
    status: "PENDING",
    submittedAt: "2026-10-10T00:00:00.000Z",
    summary: "ลาพักร้อน",
    decisionReason: null,
    employeeId: "e1",
    canDecide: false,
    approvalStepId: null,
    stepOrder: null,
    ...overrides,
  };
}

describe("dashboard view", () => {
  it("greets by Bangkok hour", () => {
    expect(greeting(new Date("2026-10-15T01:00:00.000Z"))).toBe("สวัสดีตอนเช้า"); // 08:00
    expect(greeting(new Date("2026-10-15T07:00:00.000Z"))).toBe("สวัสดีตอนบ่าย"); // 14:00
    expect(greeting(new Date("2026-10-15T12:00:00.000Z"))).toBe("สวัสดีตอนเย็น"); // 19:00
  });

  it("uses the Bangkok date and long Thai format", () => {
    expect(bangkokDateKey(new Date("2026-10-14T18:00:00.000Z"))).toBe("2026-10-15");
    expect(longThaiDate("2026-10-15")).toBe("วันพฤหัสบดีที่ 15 ตุลาคม 2569");
  });

  it("builds the Monday to Sunday week", () => {
    expect(weekRange("2026-10-15")).toEqual({ from: "2026-10-12", to: "2026-10-18" });
    expect(weekRange("2026-10-18")).toEqual({ from: "2026-10-12", to: "2026-10-18" });
    expect(weekRange("2026-10-12")).toEqual({ from: "2026-10-12", to: "2026-10-18" });
  });

  it("lists other people's approved leave this week, today first", () => {
    const rows = [
      item({ id: "later", startDate: "2026-10-16", endDate: "2026-10-17" }),
      item({ id: "today" }),
      item({ id: "mine", employeeId: "e1" }),
      item({ id: "pending", status: "PENDING" }),
      item({ id: "next-week", startDate: "2026-10-20", endDate: "2026-10-21" }),
    ];
    expect(teamLeaveThisWeek(rows, "e1", "2026-10-15").map((r) => r.id)).toEqual(["today", "later"]);
  });

  it("keeps sent-back requests on top of the in-progress list", () => {
    const rows = [
      request({ id: "a" }),
      request({ id: "b", status: "REVISION_REQUESTED", submittedAt: "2026-10-01T00:00:00.000Z" }),
      request({ id: "c", status: "APPROVED" }),
    ];
    expect(inProgressRequests(rows).map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("formats numbers and tones", () => {
    expect(leaveTone("VACATION")).toBe("leave");
    expect(leaveTone("OTHER")).toBe("gray");
    expect(dayLabel(4)).toBe("4");
    expect(dayLabel(4.5)).toBe("4.5");
    expect(baht(3750)).toBe("3,750");
  });
});
