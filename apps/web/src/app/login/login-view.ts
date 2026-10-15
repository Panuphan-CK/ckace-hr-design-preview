export const REMEMBERED_USERNAME_STORAGE_KEY =
  "ckace.hr.desktop.remembered-username" as const;

export interface UsernameStorage {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
  readonly removeItem: (key: string) => void;
}

function browserStorage(): UsernameStorage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadRememberedUsername(
  storage: UsernameStorage | null = browserStorage(),
): string {
  if (!storage) return "";

  try {
    return storage.getItem(REMEMBERED_USERNAME_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function saveRememberedUsername(
  username: string,
  storage: UsernameStorage | null = browserStorage(),
): void {
  if (!storage) return;

  try {
    storage.setItem(
      REMEMBERED_USERNAME_STORAGE_KEY,
      username.trim(),
    );
  } catch {
    // A blocked or full localStorage must not prevent login.
  }
}

export function clearRememberedUsername(
  storage: UsernameStorage | null = browserStorage(),
): void {
  if (!storage) return;

  try {
    storage.removeItem(REMEMBERED_USERNAME_STORAGE_KEY);
  } catch {
    // A blocked localStorage must not prevent login.
  }
}

export interface RegistrationFormValues {
  readonly username: string;
  readonly password: string;
  readonly confirmPassword: string;
  readonly fullName: string;
  readonly nickname: string;
  readonly dateOfBirth: string;
  readonly employmentStart: string;
}

function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value;
}

export function validateRegistrationForm(
  values: RegistrationFormValues,
): string | null {
  const username = values.username.trim();
  const fullName = values.fullName.trim();

  if (username.length < 3 || username.length > 120) {
    return "ชื่อผู้ใช้ต้องมีความยาว 3–120 ตัวอักษร";
  }
  if (values.password.length < 8 || values.password.length > 200) {
    return "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร";
  }
  if (values.password !== values.confirmPassword) {
    return "รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน";
  }
  if (!fullName || fullName.length > 250) {
    return "กรุณากรอกชื่อ-นามสกุลให้ครบถ้วน";
  }
  if (!validIsoDate(values.dateOfBirth)) {
    return "กรุณาระบุวันเกิดให้ถูกต้อง";
  }
  if (!validIsoDate(values.employmentStart)) {
    return "กรุณาระบุวันเริ่มงานให้ถูกต้อง";
  }

  return null;
}
