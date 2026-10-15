import type {
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
    : "ยังไม่มี Attendance linkage";
}
