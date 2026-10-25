import type {
  AttendanceRadiusState,
  AttendanceSelfOverview,
  AttendanceEventSource,
} from "@ckace/contracts";

export const ATTENDANCE_SESSION_EXPIRED_MESSAGE =
  "การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่";

export interface AttendanceMetrics {
  readonly totalRecords: number;
  readonly lateRecords: number;
  readonly earlyRecords: number;
  readonly outsideRadiusEvents: number;
  readonly overtimeMinutes: number;
}

export function attendanceMetrics(
  overview: AttendanceSelfOverview,
): AttendanceMetrics {
  return overview.records.reduce<AttendanceMetrics>(
    (total, record) => ({
      totalRecords: total.totalRecords + 1,
      lateRecords:
        total.lateRecords + ((record.lateMinutes ?? 0) > 0 ? 1 : 0),
      earlyRecords:
        total.earlyRecords + ((record.earlyMinutes ?? 0) > 0 ? 1 : 0),
      outsideRadiusEvents:
        total.outsideRadiusEvents +
        (record.checkInRadius === "OUTSIDE" ? 1 : 0) +
        (record.checkOutRadius === "OUTSIDE" ? 1 : 0),
      overtimeMinutes:
        total.overtimeMinutes + (record.overtimeMinutes ?? 0),
    }),
    {
      totalRecords: 0,
      lateRecords: 0,
      earlyRecords: 0,
      outsideRadiusEvents: 0,
      overtimeMinutes: 0,
    },
  );
}

export function radiusLabel(
  radius: AttendanceRadiusState,
): string {
  switch (radius) {
    case "INSIDE":
      return "ในพื้นที่";
    case "OUTSIDE":
      return "นอกพื้นที่";
    case "UNKNOWN":
      return "ไม่ทราบตำแหน่ง";
  }
}

export function sourceLabel(
  source: AttendanceEventSource | null,
): string {
  switch (source) {
    case "DEVICE":
      return "อุปกรณ์";
    case "CORRECTION":
      return "แก้ไขเวลา";
    case "LEGACY":
      return "ข้อมูลเดิม";
    case "UNKNOWN":
    case null:
      return "ไม่ทราบ";
  }
}

export function correctionTargets(): readonly ("CHECK_IN" | "CHECK_OUT")[] {
  return ["CHECK_IN", "CHECK_OUT"];
}
