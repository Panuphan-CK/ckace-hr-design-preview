import { describe, expect, it } from "vitest";

import {
  APPROVAL_STEP_STATUS_LABELS,
  LEAVE_REQUEST_STATUS_LABELS,
  LEAVE_DURATION_LABELS,
  leaveTypeDisplayLabel,
  REQUEST_STATUS_LABELS,
} from "./request-labels";

describe("shared request display labels", () => {
  it("uses Thai labels for every request and approval-step status", () => {
    expect(REQUEST_STATUS_LABELS).toEqual({
      PENDING: "รออนุมัติ",
      APPROVED: "อนุมัติแล้ว",
      REJECTED: "ไม่อนุมัติ",
      CANCELLED: "ยกเลิก",
      REVISION_REQUESTED: "ส่งกลับแก้ไข",
    });
    expect(LEAVE_REQUEST_STATUS_LABELS).toEqual({
      PENDING: "รออนุมัติ",
      APPROVED: "อนุมัติ",
      REJECTED: "ไม่อนุมัติ",
      CANCELLED: "ยกเลิก",
      REVISION_REQUESTED: "รอแก้ไข",
    });
    expect(APPROVAL_STEP_STATUS_LABELS).toEqual({
      PENDING: "รอพิจารณา",
      APPROVED: "อนุมัติแล้ว",
      REJECTED: "ไม่อนุมัติ",
      REVISION_REQUESTED: "ส่งกลับให้แก้ไข",
      SKIPPED: "ข้ามขั้น",
      CANCELLED: "ยกเลิก",
    });
  });

  it("labels canonical leave types and durations while preserving configured custom type names", () => {
    expect(leaveTypeDisplayLabel("ANNUAL", "Annual leave")).toBe("ลาพักร้อน");
    expect(leaveTypeDisplayLabel("VACATION", "Vacation")).toBe("ลาพักร้อน");
    expect(leaveTypeDisplayLabel("SICK", "Sick leave")).toBe("ลาป่วย");
    expect(leaveTypeDisplayLabel("PERSONAL", "Personal leave")).toBe("ลากิจ");
    expect(leaveTypeDisplayLabel("SPECIAL", "ลาคลอด")).toBe("ลาคลอด");
    expect(LEAVE_DURATION_LABELS).toEqual({
      FULL_DAY: "เต็มวัน",
      HOURLY: "รายชั่วโมง",
      MORNING: "ครึ่งเช้า",
      AFTERNOON: "ครึ่งบ่าย",
    });
  });
});
