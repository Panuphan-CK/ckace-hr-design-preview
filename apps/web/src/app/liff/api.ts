export interface LiffSession {
  readonly employeeId: string;
  readonly navigation: Readonly<Record<string, boolean>>;
}

export function errorText(status: number): string {
  if (status === 401) return "เซสชันหมดอายุ กรุณาเปิดจาก LINE ใหม่อีกครั้ง";
  if (status === 403) return "บัญชีนี้ไม่มีสิทธิ์ทำรายการนี้";
  if (status === 409) return "รายการนี้ถูกส่งหรือเปลี่ยนแปลงไปแล้ว กรุณาตรวจสอบประวัติ";
  if (status === 429) return "ทำรายการถี่เกินไป กรุณารอสักครู่";
  if (status >= 500) return "ระบบขัดข้อง ยังไม่ทราบผล กรุณาตรวจสอบประวัติก่อนส่งใหม่";
  return "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
}

export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error(errorText(response.status));
  return response.json() as Promise<T>;
}

export async function optionalJson<T>(url: string): Promise<T | null> {
  try {
    return await getJson<T>(url);
  } catch {
    return null;
  }
}

/** Server message when the API explains a business-rule rejection. */
const KNOWN_ERRORS: readonly (readonly [RegExp, string])[] = [
  [/must consume positive leave quota/i, "วันที่เลือกไม่มีวันทำงานให้ลา (เป็นวันหยุดหรือเสาร์-อาทิตย์)"],
  [/entitlement is unavailable/i, "ไม่มีสิทธิ์ลาประเภทนี้ในช่วงวันที่เลือก"],
  [/entitlement exceeded/i, "วันลาคงเหลือไม่พอ"],
  [/overlaps another/i, "มีใบลาอื่นในช่วงวันเดียวกันอยู่แล้ว"],
  [/end date must not precede/i, "วันสิ้นสุดต้องไม่ก่อนวันเริ่ม"],
  [/No leave entitlement is available for year (\d+)/i, "ยังไม่มีสิทธิ์ลาของปีที่เลือก"],
  [/across New Year/i, "ลาข้ามปีต้องเป็นแบบเต็มวัน และไม่เกิน 2 ปีปฏิทิน"],
  [/No eligible .*approver/i, "ยังไม่พบผู้อนุมัติ กรุณาติดต่อฝ่ายบุคคล"],
];

/** Server messages are English; show Thai to the user (known ones precisely, others generically). */
export function thaiError(message: string): string {
  for (const [pattern, text] of KNOWN_ERRORS) {
    if (pattern.test(message)) return text;
  }
  return /^[\x00-\x7F]*$/.test(message) ? "ทำรายการไม่สำเร็จ ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" : message;
}

export async function submitError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body.message === "string" && body.message.trim() && response.status < 500) {
      return thaiError(body.message);
    }
  } catch {
    /* fall through */
  }
  return errorText(response.status);
}

export function formatThaiDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${Number(y) + 543}`;
}

export function formatRange(start: string, end: string): string {
  return start === end ? formatThaiDate(start) : `${formatThaiDate(start)} - ${formatThaiDate(end)}`;
}

export const KIND_LABEL: Readonly<Record<string, string>> = {
  LEAVE: "การลา",
  OVERTIME: "ทำงานล่วงเวลา",
  TIME_CORRECTION: "แก้ไขเวลา",
  MEDICAL: "ค่ารักษาพยาบาล",
};
