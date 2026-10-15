import { describe, expect, it } from "vitest";
import type { OvertimeSelfOverview } from "@ckace/contracts";
import {
  attendanceLinkLabel,
  overtimeMetrics,
  overtimeRequestMinutes,
  overtimeStatusLabel,
} from "./overtime-view";

const overview: OvertimeSelfOverview = {
  requests: [
    {
      id: "00000000-0000-5000-8000-000000000001",
      employeeId: "00000000-0000-4000-8000-000000000001",
      reason: "ปิดงบ",
      status: "PENDING",
      decisionReason: null,
      submittedAt: "2026-10-07T08:00:00.000Z",
      segments: [
        {
          id: "00000000-0000-4000-8000-000000000011",
          workDate: "2026-10-06",
          startTime: "18:00",
          endTime: "20:00",
          requestedMinutes: 90,
          attendanceRecordId:
            "00000000-0000-4000-8000-000000000099",
        },
      ],
    },
    {
      id: "00000000-0000-5000-8000-000000000002",
      employeeId: "00000000-0000-4000-8000-000000000001",
      reason: "งานลูกค้า",
      status: "APPROVED",
      decisionReason: null,
      submittedAt: "2026-10-06T08:00:00.000Z",
      segments: [
        {
          id: "00000000-0000-4000-8000-000000000012",
          workDate: "2026-10-05",
          startTime: "17:30",
          endTime: "19:00",
          requestedMinutes: 90,
          attendanceRecordId: null,
        },
      ],
    },
  ],
};

describe("Desktop Overtime view helpers", () => {
  it("derives OT metrics from server records", () => {
    expect(overtimeMetrics(overview)).toEqual({
      totalRequests: 2,
      pendingRequests: 1,
      approvedRequests: 1,
      totalRequestedMinutes: 180,
      linkedSegments: 1,
      unlinkedSegments: 1,
    });
  });

  it("sums requested segment minutes", () => {
    expect(overtimeRequestMinutes(overview.requests[0]!)).toBe(90);
  });

  it("renders status and attendance linkage semantics", () => {
    expect(overtimeStatusLabel("APPROVED")).toBe("อนุมัติแล้ว");
    expect(
      attendanceLinkLabel(
        "00000000-0000-4000-8000-000000000099",
      ),
    ).toBe("เชื่อมข้อมูลเวลาเข้างานแล้ว");
    expect(attendanceLinkLabel(null)).toBe(
      "ยังไม่มี Attendance linkage",
    );
  });
});
