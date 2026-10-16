/**
 * Prisma filter for employees who count in attendance statistics: not flagged
 * individually and not holding an active professional role that is exempt from
 * clocking in (for example auditors).
 */
export const ATTENDANCE_STATS_EMPLOYEE_FILTER = {
  attendanceExempt: false,
  professionalRoles: {
    none: {
      professionalRole: { attendanceExempt: true, active: true },
    },
  },
} as const;

export function isAttendanceExempt(row: {
  readonly attendanceExempt: boolean;
  readonly professionalRoles: readonly {
    readonly professionalRole: {
      readonly attendanceExempt: boolean;
      readonly active: boolean;
    };
  }[];
}): boolean {
  return (
    row.attendanceExempt ||
    row.professionalRoles.some(
      (item) => item.professionalRole.attendanceExempt && item.professionalRole.active,
    )
  );
}
