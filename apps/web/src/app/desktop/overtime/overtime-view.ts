import type {
  OvertimeBreakCode,
  OvertimeRequestStatus,
  OvertimeRequestView,
  OvertimeSelfOverview,
} from "@ckace/contracts";

export interface OvertimeMetrics {
  readonly totalRequests: number;
  readonly pendingRequests: number;
  readonly approvedRequests: number;
  readonly totalRequestedMinutes: number;
  readonly linkedSegments: number;
  readonly unlinkedSegments: number;
}

export function overtimeMetrics(
  overview: OvertimeSelfOverview,
): OvertimeMetrics {
  return overview.requests.reduce<OvertimeMetrics>(
    (total, request) => {
      const linked = request.segments.filter(
        (segment) => Boolean(segment.attendanceRecordId),
      ).length;
      const minutes = request.segments.reduce(
        (sum, segment) => sum + segment.requestedMinutes,
        0,
      );
      return {
        totalRequests: total.totalRequests + 1,
        pendingRequests:
          total.pendingRequests +
          (request.status === "PENDING" ? 1 : 0),
        approvedRequests:
          total.approvedRequests +
          (request.status === "APPROVED" ? 1 : 0),
        totalRequestedMinutes:
          total.totalRequestedMinutes + minutes,
        linkedSegments: total.linkedSegments + linked,
        unlinkedSegments:
          total.unlinkedSegments +
          (request.segments.length - linked),
      };
    },
    {
      totalRequests: 0,
      pendingRequests: 0,
      approvedRequests: 0,
      totalRequestedMinutes: 0,
      linkedSegments: 0,
      unlinkedSegments: 0,
    },
  );
}

export function overtimeRequestMinutes(
  request: OvertimeRequestView,
): number {
  return request.segments.reduce(
    (sum, segment) => sum + segment.requestedMinutes,
    0,
  );
}

export function overtimeStatusLabel(
  status: OvertimeRequestStatus,
): string {
  switch (status) {
    case "PENDING":
      return "รออนุมัติ";
    case "APPROVED":
      return "อนุมัติแล้ว";
    case "REJECTED":
      return "ไม่อนุมัติ";
    case "CANCELLED":
      return "ยกเลิก";
    case "REVISION_REQUESTED":
      return "ส่งกลับให้แก้ไข";
  }
}

export function overtimeStatusClass(
  status: OvertimeRequestStatus,
): string {
  return `request-status status-${status.toLowerCase()}`;
}

export function attendanceLinkLabel(
  attendanceRecordId: string | null,
): string {
  return attendanceRecordId
    ? "เชื่อมข้อมูลเวลาเข้างานแล้ว"
    : "ยังไม่พบบันทึกเวลาเข้างานของวันนั้น";
}

export interface OvertimeBreakOption {
  readonly code: OvertimeBreakCode;
  readonly label: string;
  readonly start: number;
  readonly end: number;
  readonly maxMinutes: number;
}

/** Same windows as packages/business-rules/src/overtime.ts (server stays authoritative). */
export const OVERTIME_BREAK_OPTIONS: readonly OvertimeBreakOption[] = [
  { code: "LUNCH", label: "พักกินข้าวเที่ยง 12:00–13:00", start: 720, end: 780, maxMinutes: 60 },
  { code: "ACTIVITY", label: "พักทำกิจกรรม 13:00–14:00", start: 780, end: 840, maxMinutes: 60 },
  { code: "DINNER", label: "พักกินข้าวเย็น 17:30–18:30", start: 1050, end: 1110, maxMinutes: 60 },
  { code: "DINNER_SHORT", label: "พักกินข้าวเย็น 30 นาที", start: 1050, end: 1110, maxMinutes: 30 },
];

function clockToMinutes(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

/** Minutes of the chosen breaks that really fall inside the window (preview only). */
export function overtimeBreakDeduction(
  startTime: string,
  endTime: string,
  breaks: readonly OvertimeBreakCode[],
): number {
  const start = clockToMinutes(startTime);
  const end = clockToMinutes(endTime);
  if (start === null || end === null || end <= start) return 0;
  return OVERTIME_BREAK_OPTIONS.filter((option) => breaks.includes(option.code)).reduce(
    (sum, option) =>
      sum + Math.min(option.maxMinutes, Math.max(0, Math.min(end, option.end) - Math.max(start, option.start))),
    0,
  );
}
