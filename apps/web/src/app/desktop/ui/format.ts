const TH_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
] as const;

/** "2026-10-23" -> "23 ต.ค. 2569" (Buddhist year). Returns the input when it is not an ISO date. */
export function thaiDate(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const year = Number(match[1]) + 543;
  const month = TH_MONTHS[Number(match[2]) - 1] ?? "";
  return `${Number(match[3])} ${month} ${year}`;
}

/** "2026-10-23" .. "2026-10-24" -> "23 ถึง 24 ต.ค. 2569" */
export function thaiDateRange(start: string, end: string): string {
  if (!end || end === start) return thaiDate(start);
  const a = /^(\d{4})-(\d{2})-(\d{2})/.exec(start);
  const b = /^(\d{4})-(\d{2})-(\d{2})/.exec(end);
  if (a && b && a[1] === b[1] && a[2] === b[2]) {
    return `${Number(a[3])} ถึง ${thaiDate(end)}`;
  }
  return `${thaiDate(start)} ถึง ${thaiDate(end)}`;
}

/** ISO timestamp -> "15 ต.ค. 2569 09:12" in the viewer's local time. */
export function thaiDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `${thaiDate(iso)} ${time}`;
}

/** Monday..Friday between two ISO dates, inclusive. A client-side estimate only; the server computes the real usage. */
export function weekdaysBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const from = new Date(start + "T00:00:00");
  const to = new Date(end + "T00:00:00");
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return 0;
  let days = 0;
  for (const cursor = new Date(from); cursor <= to; cursor.setDate(cursor.getDate() + 1)) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) days += 1;
  }
  return days;
}

/** "2026-10-23" -> "23/10/2569" (DD/MM/YYYY, Buddhist year). "" for anything that is not an ISO date. */
export function isoToDmy(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "";
  return `${match[3]}/${match[2]}/${Number(match[1]) + 543}`;
}

/**
 * "23/10/2569" or "23/10/2026" -> "2026-10-23". Years from 2400 are read as Buddhist years.
 * Returns "" unless the text is a complete, real calendar date.
 */
export function dmyToIso(value: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return "";
  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year >= 2400) year -= 543;
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1) return "";
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Keeps digits only and inserts the slashes while the user types: "2310256" -> "23/10/256". */
export function maskDmy(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** "13:00" + 3 hours -> "16:00"; returns "" when the input is invalid or crosses midnight. */
export function addHours(startTime: string, hours: number): string {
  const match = /^(\d{2}):(\d{2})$/.exec(startTime);
  if (!match || !Number.isFinite(hours) || hours <= 0) return "";
  const total = Number(match[1]) * 60 + Number(match[2]) + Math.round(hours * 60);
  if (total >= 24 * 60) return "";
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
