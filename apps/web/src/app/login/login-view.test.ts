import { describe, expect, it } from "vitest";

import {
  clearRememberedUsername,
  loadRememberedUsername,
  REMEMBERED_USERNAME_STORAGE_KEY,
  saveRememberedUsername,
  validateRegistrationForm,
  type UsernameStorage,
} from "./login-view";

function createStorage(): UsernameStorage & { readonly values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

describe("Desktop login helpers", () => {
  it("remembers only the username under the named key", () => {
    const storage = createStorage();

    saveRememberedUsername("  employee@example.com  ", storage);

    expect(storage.values).toEqual(
      new Map([[REMEMBERED_USERNAME_STORAGE_KEY, "employee@example.com"]]),
    );
    expect(loadRememberedUsername(storage)).toBe("employee@example.com");
  });

  it("can clear the remembered username without touching other storage", () => {
    const storage = createStorage();
    storage.values.set("other-key", "keep");
    saveRememberedUsername("employee", storage);

    clearRememberedUsername(storage);

    expect(loadRememberedUsername(storage)).toBe("");
    expect(storage.values.get("other-key")).toBe("keep");
  });

  it("requires the confirmation password to match", () => {
    expect(
      validateRegistrationForm({
        username: "employee",
        password: "password-123",
        confirmPassword: "password-456",
        fullName: "พนักงาน ตัวอย่าง",
        nickname: "ตัวอย่าง",
        dateOfBirth: "1990-01-01",
        employmentStart: "2026-01-01",
      }),
    ).toBe("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
  });
});
