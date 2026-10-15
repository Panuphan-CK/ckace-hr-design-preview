import type {
  AttendanceCheckInInput,
  AttendanceCheckOutInput,
  AttendanceLocationInput,
} from "@ckace/contracts";

export type AttendanceWriteAction = "check-in" | "check-out";

export function attendanceWritePath(
  action: AttendanceWriteAction,
): string {
  return action === "check-in"
    ? "/api/attendance/check-in"
    : "/api/attendance/check-out";
}

export function buildAttendanceWritePayload(
  action: AttendanceWriteAction,
  location: AttendanceLocationInput,
  clientKey: string,
  attendanceRecordId?: string | null,
): AttendanceCheckInInput | AttendanceCheckOutInput {
  if (action === "check-out") {
    if (!attendanceRecordId) {
      throw new Error("ไม่พบรายการเวลาสำหรับลงเวลาออก");
    }
    return {
      ...location,
      clientKey,
      attendanceRecordId,
    };
  }

  return {
    ...location,
    clientKey,
  };
}

export function attendanceActionLabel(
  action: AttendanceWriteAction,
): string {
  return action === "check-in" ? "ลงเวลาเข้า" : "ลงเวลาออก";
}

export function attendanceWriteRetryMessage(
  action: AttendanceWriteAction,
): string {
  return `ยังไม่ทราบว่าการ${attendanceActionLabel(action)}สำเร็จหรือไม่ กรุณากดปุ่มเดิมอีกครั้งเพื่อส่งซ้ำ`;
}

export function attendanceWriteFailureMessage(
  action: AttendanceWriteAction,
  status: number,
): string {
  if (status === 401) return "การเข้าสู่ระบบหมดอายุ กรุณาเข้าสู่ระบบใหม่";
  if (status === 403) return "บัญชีนี้ไม่มีสิทธิ์บันทึกเวลา";
  if (status === 404 && action === "check-out") {
    return "ไม่พบรายการเวลาที่ต้องการลงเวลาออก กรุณารีเฟรชข้อมูล";
  }
  if (status === 409) {
    return "สถานะเวลาเปลี่ยนแล้ว กรุณารีเฟรชข้อมูลก่อนลองใหม่";
  }
  if (status >= 500) return attendanceWriteRetryMessage(action);
  return `ไม่สามารถ${attendanceActionLabel(action)}ได้ กรุณาตรวจสอบข้อมูลแล้วลองใหม่`;
}

export function geolocationErrorMessage(code: number): string {
  if (code === 1) {
    return "ไม่อนุญาตให้เข้าถึงตำแหน่ง กรุณาอนุญาตตำแหน่งในเบราว์เซอร์แล้วลองใหม่";
  }
  if (code === 2) {
    return "ไม่สามารถระบุตำแหน่งได้ กรุณาตรวจสอบการเชื่อมต่อหรือสัญญาณตำแหน่ง";
  }
  if (code === 3) {
    return "การระบุตำแหน่งใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง";
  }
  return "ไม่สามารถระบุตำแหน่งได้ กรุณาลองใหม่อีกครั้ง";
}
