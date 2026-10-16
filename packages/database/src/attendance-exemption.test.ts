import { describe, expect, it } from "vitest";

import { isAttendanceExempt } from "./attendance-exemption";

const role = (attendanceExempt: boolean, active = true) => ({
  professionalRole: { attendanceExempt, active },
});

describe("attendance exemption", () => {
  it("is exempt by individual flag or by an active exempt professional role", () => {
    expect(isAttendanceExempt({ attendanceExempt: true, professionalRoles: [] })).toBe(true);
    expect(isAttendanceExempt({ attendanceExempt: false, professionalRoles: [role(true)] })).toBe(true);
  });

  it("is not exempt for ordinary or deactivated roles", () => {
    expect(isAttendanceExempt({ attendanceExempt: false, professionalRoles: [] })).toBe(false);
    expect(isAttendanceExempt({ attendanceExempt: false, professionalRoles: [role(false)] })).toBe(false);
    expect(isAttendanceExempt({ attendanceExempt: false, professionalRoles: [role(true, false)] })).toBe(false);
  });
});
