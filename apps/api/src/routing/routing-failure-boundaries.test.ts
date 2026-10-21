import { describe, expect, it, vi } from "vitest";

import { AttendanceService } from "../attendance/attendance.service";
import { LeaveService } from "../leave/leave.service";
import { MedicalService } from "../medical/medical.service";
import { OvertimeService } from "../overtime/overtime.service";

const employeeId =
  "00000000-0000-4000-8000-000000000001";
const correlationId = "corr-m9-2";

describe("ambiguous write routing boundaries", () => {
  it("does not blindly retry an ambiguous Leave repository failure", async () => {
    const createSelfLeave = vi.fn(async () => {
      throw new Error("ambiguous commit state");
    });
    const service = new LeaveService({
      createSelfLeave,
    } as never);

    await expect(
      service.createSelfLeave({
        employeeId,
        correlationId,
        body: {
          clientKey: "m9-leave-1",
          entitlementId:
            "00000000-0000-4000-8000-000000000008",
          description: "M9 failure QA",
          startDate: "2026-10-06",
          endDate: "2026-10-06",
          durationCode: "FULL_DAY",
          approverEmployeeIds: [
            "00000000-0000-4000-8000-000000000009",
          ],
        },
      }),
    ).rejects.toThrow("ambiguous commit state");

    expect(createSelfLeave).toHaveBeenCalledOnce();
  });

  it("does not blindly retry an ambiguous Attendance repository failure", async () => {
    const checkIn = vi.fn(async () => {
      throw new Error("ambiguous commit state");
    });
    const service = new AttendanceService({
      checkIn,
    } as never);

    await expect(
      service.checkIn({
        employeeId,
        correlationId,
        body: {
          clientKey: "m9-attendance-1",
          latitude: 13.7563,
          longitude: 100.5018,
          accuracyMeters: 12,
        },
      }),
    ).rejects.toThrow("ambiguous commit state");

    expect(checkIn).toHaveBeenCalledOnce();
  });

  it("does not blindly retry an ambiguous OT repository failure", async () => {
    const createSelfOvertime = vi.fn(async () => {
      throw new Error("ambiguous commit state");
    });
    const service = new OvertimeService({
      createSelfOvertime,
    } as never);

    await expect(
      service.createSelfOvertime({
        employeeId,
        correlationId,
        body: {
          startDate: "2026-10-06",
          endDate: "2026-10-06",
          startTime: "17:30",
          endTime: "18:30",
          reason: "M9 failure QA",
          clientKey: "m9-ot-01",
        },
      }),
    ).rejects.toThrow("ambiguous commit state");

    expect(createSelfOvertime).toHaveBeenCalledOnce();
  });

  it("does not blindly retry an ambiguous Medical repository failure", async () => {
    const createSelfMedical = vi.fn(async () => {
      throw new Error("ambiguous commit state");
    });
    const service = new MedicalService({
      createSelfMedical,
    } as never);

    await expect(
      service.createSelfMedical({
        employeeId,
        correlationId,
        body: {
          sicknessDate: "2026-10-06",
          amount: 500,
          description: "M9 failure QA",
          attachmentIds: [
            "00000000-0000-4000-8000-000000000101",
          ],
          clientKey: "m9-medical-1",
        },
      }),
    ).rejects.toThrow("ambiguous commit state");

    expect(createSelfMedical).toHaveBeenCalledOnce();
  });
});
