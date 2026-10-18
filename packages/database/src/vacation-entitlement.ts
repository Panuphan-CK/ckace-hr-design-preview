import { vacationEntitlementForYear } from "@ckace/business-rules";
import type { Prisma, PrismaClient } from "@prisma/client";

export const VACATION_LEAVE_TYPE_KEY = "ANNUAL";

/** Calendar year in Bangkok time (leave year = calendar year). */
export function currentLeaveYear(now: Date = new Date()): number {
  return new Date(now.getTime() + 7 * 60 * 60 * 1000).getUTCFullYear();
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/**
 * Creates the vacation entitlement of one employee for one calendar year from
 * tenure (measured on 1 January). An existing entitlement for that year is
 * never overwritten, so an admin's per-person edit always wins. Employees
 * without a recorded start date get the lowest tier until it is filled in.
 */
export async function ensureVacationEntitlement(
  tx: Prisma.TransactionClient,
  input: {
    readonly employeeId: string;
    readonly year: number;
    readonly actorEmployeeId?: string | null;
  },
): Promise<{ created: boolean; quota: number }> {
  const [leaveType, employee] = await Promise.all([
    tx.leaveType.findUnique({
      where: { key: VACATION_LEAVE_TYPE_KEY },
      select: { id: true, active: true },
    }),
    tx.employee.findUnique({
      where: { id: input.employeeId },
      select: { employmentStart: true },
    }),
  ]);

  if (!leaveType?.active) {
    throw new Error("Vacation leave type is not configured");
  }

  if (!employee) {
    throw new Error("Employee not found");
  }

  const validFrom = new Date(`${input.year}-01-01T00:00:00.000Z`);
  const validTo = new Date(`${input.year}-12-31T00:00:00.000Z`);
  const existing = await tx.leaveEntitlement.findFirst({
    where: {
      employeeId: input.employeeId,
      leaveTypeId: leaveType.id,
      OR: [
        { validFrom, validTo },
        { validFrom: null, validTo: null },
      ],
    },
    select: { quota: true },
  });

  if (existing) {
    return { created: false, quota: Number(existing.quota) };
  }

  const start = employee.employmentStart
    ? dateOnly(employee.employmentStart)
    : `${input.year}-01-01`;
  const quota = vacationEntitlementForYear({
    employmentStart: start > `${input.year}-01-01` ? `${input.year}-01-01` : start,
    leaveYear: input.year,
  });

  await tx.leaveEntitlement.create({
    data: {
      employeeId: input.employeeId,
      leaveTypeId: leaveType.id,
      quota,
      validFrom,
      validTo,
    },
  });
  await tx.auditLog.create({
    data: {
      actorEmployeeId: input.actorEmployeeId ?? null,
      action: "LEAVE_VACATION_ENTITLEMENT_GENERATED",
      entityType: "Employee",
      entityId: input.employeeId,
      metadata: { year: input.year, quota },
    },
  });

  return { created: true, quota };
}

/** Default yearly quotas of the non-vacation leave types (calendar year, no carry-over). */
export const YEARLY_DEFAULT_QUOTAS = [
  { leaveTypeKey: "PERSONAL", quota: 6 },
  { leaveTypeKey: "SICK", quota: 30 },
] as const;

/**
 * Creates the calendar-year entitlements of one employee: vacation by tenure plus
 * personal and sick leave. Existing rows (a per-person edit) are never touched, so
 * the balance of each year starts fresh and nothing carries over.
 */
export async function ensureYearlyEntitlements(
  tx: Prisma.TransactionClient,
  input: {
    readonly employeeId: string;
    readonly year: number;
    readonly actorEmployeeId?: string | null;
  },
): Promise<{ created: boolean }> {
  const vacation = await ensureVacationEntitlement(tx, input);
  let created = vacation.created;
  const validFrom = new Date(`${input.year}-01-01T00:00:00.000Z`);
  const validTo = new Date(`${input.year}-12-31T00:00:00.000Z`);

  for (const rule of YEARLY_DEFAULT_QUOTAS) {
    const leaveType = await tx.leaveType.findUnique({
      where: { key: rule.leaveTypeKey },
      select: { id: true, active: true },
    });

    if (!leaveType?.active) continue;

    const existing = await tx.leaveEntitlement.findFirst({
      where: {
        employeeId: input.employeeId,
        leaveTypeId: leaveType.id,
        OR: [
          { validFrom, validTo },
          { validFrom: null, validTo: null },
        ],
      },
      select: { id: true },
    });

    if (existing) continue;

    await tx.leaveEntitlement.create({
      data: {
        employeeId: input.employeeId,
        leaveTypeId: leaveType.id,
        quota: rule.quota,
        validFrom,
        validTo,
      },
    });
    created = true;
  }

  return { created };
}

/** Yearly run for every active employee; safe to repeat. */
export async function generateVacationEntitlementsForYear(
  prisma: PrismaClient,
  input: { readonly year: number; readonly actorEmployeeId: string | null },
): Promise<{ year: number; created: number; skipped: number }> {
  const employees = await prisma.employee.findMany({
    where: { userAccount: { state: "ACTIVE" } },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  let created = 0;
  let skipped = 0;

  for (const employee of employees) {
    const result = await prisma.$transaction((tx) =>
      ensureYearlyEntitlements(tx, {
        employeeId: employee.id,
        year: input.year,
        actorEmployeeId: input.actorEmployeeId,
      }),
    );

    if (result.created) {
      created += 1;
    } else {
      skipped += 1;
    }
  }

  return { year: input.year, created, skipped };
}

/** Job-friendly wrapper: grants the yearly balances of every active employee for one year. */
export async function ensureYearlyEntitlementsForAll(
  prisma: PrismaClient,
  year: number,
): Promise<{ year: number; created: number }> {
  const result = await generateVacationEntitlementsForYear(prisma, {
    year,
    actorEmployeeId: null,
  });

  return { year, created: result.created };
}
