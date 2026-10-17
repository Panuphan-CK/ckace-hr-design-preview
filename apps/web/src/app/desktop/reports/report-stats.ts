import type { ManagementReportRow } from "@ckace/contracts";

export interface MonthBucket {
  readonly key: string;
  readonly label: string;
  readonly parts: Readonly<Record<string, number>>;
  readonly total: number;
}

export interface TypeShare {
  readonly label: string;
  readonly value: number;
  readonly percent: number;
}

export interface PersonSummary {
  readonly employeeId: string;
  readonly employeeName: string;
  readonly count: number;
  readonly value: number;
  readonly byType: Readonly<Record<string, number>>;
}

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."] as const;

/** Numeric weight of a row: the `amount` when it parses, otherwise one record. */
export function rowValue(row: ManagementReportRow): number {
  const parsed = Number(row.amount);
  return row.amount !== null && row.amount !== undefined && Number.isFinite(parsed) ? parsed : 1;
}

/** Sub-type label: the first word of the summary ("พักร้อน 1 วัน" -> "พักร้อน"). */
export function rowType(row: ManagementReportRow): string {
  return row.summary.trim().split(/\s+/)[0] || row.status;
}

export function monthlyBuckets(rows: readonly ManagementReportRow[]): readonly MonthBucket[] {
  const map = new Map<string, { parts: Record<string, number>; total: number }>();
  for (const row of rows) {
    const key = row.date.slice(0, 7);
    const bucket = map.get(key) ?? { parts: {}, total: 0 };
    const type = rowType(row);
    const value = rowValue(row);
    bucket.parts[type] = (bucket.parts[type] ?? 0) + value;
    bucket.total += value;
    map.set(key, bucket);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, bucket]) => ({
      key,
      label: MONTHS[Number(key.slice(5, 7)) - 1] ?? key,
      parts: bucket.parts,
      total: bucket.total,
    }));
}

export function typeShares(rows: readonly ManagementReportRow[]): readonly TypeShare[] {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(rowType(row), (totals.get(rowType(row)) ?? 0) + rowValue(row));
  const sum = [...totals.values()].reduce((a, b) => a + b, 0);
  return [...totals.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([label, value]) => ({ label, value, percent: sum > 0 ? Math.round((value / sum) * 100) : 0 }));
}

export function personSummaries(rows: readonly ManagementReportRow[]): readonly PersonSummary[] {
  const map = new Map<string, { name: string; count: number; value: number; byType: Record<string, number> }>();
  for (const row of rows) {
    const entry = map.get(row.employeeId) ?? { name: row.employeeName, count: 0, value: 0, byType: {} };
    const type = rowType(row);
    entry.count += 1;
    entry.value += rowValue(row);
    entry.byType[type] = (entry.byType[type] ?? 0) + rowValue(row);
    map.set(row.employeeId, entry);
  }
  return [...map.entries()]
    .map(([employeeId, e]) => ({ employeeId, employeeName: e.name, count: e.count, value: e.value, byType: e.byType }))
    .sort((a, b) => b.value - a.value);
}

export function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
