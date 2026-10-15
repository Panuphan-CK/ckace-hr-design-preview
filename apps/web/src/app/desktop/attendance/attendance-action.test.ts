import { describe, expect, it } from "vitest";

import {
  attendanceWriteFailureMessage,
  buildAttendanceWritePayload,
  geolocationErrorMessage,
} from "./attendance-action";

const location = {
  latitude: 13.7563,
  longitude: 100.5018,
  accuracyMeters: 12,
} as const;

describe("Desktop attendance actions", () => {
  it("binds check-out to the explicit current attendance record", () => {
    expect(
      buildAttendanceWritePayload(
        "check-out",
        location,
        "attendance-client-001",
        "00000000-0000-4000-8000-000000000001",
      ),
    ).toEqual({
      ...location,
      clientKey: "attendance-client-001",
      attendanceRecordId: "00000000-0000-4000-8000-000000000001",
    });
  });

  it("fails closed when check-out has no current record", () => {
    expect(() =>
      buildAttendanceWritePayload(
        "check-out",
        location,
        "attendance-client-001",
        null,
      ),
    ).toThrow("ไม่พบรายการเวลาสำหรับลงเวลาออก");
  });

  it("explains that ambiguous responses require an explicit retry", () => {
    const message = attendanceWriteFailureMessage("check-in", 503);

    expect(message).toContain("ยังไม่ทราบ");
    expect(message).toContain("กดปุ่มเดิมอีกครั้ง");
  });

  it("gives a clear location permission message", () => {
    expect(geolocationErrorMessage(1)).toContain("ไม่อนุญาตให้เข้าถึงตำแหน่ง");
  });
});
