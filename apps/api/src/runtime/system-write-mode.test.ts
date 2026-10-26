import { describe, expect, it } from "vitest";

import { readSystemWriteMode } from "./system-write-mode";

describe("readSystemWriteMode", () => {
  it("defaults to ACTIVE to preserve existing TEST behavior", () => {
    expect(readSystemWriteMode({})).toBe("ACTIVE");
    expect(readSystemWriteMode({ CKACE_SYSTEM_WRITE_MODE: "" })).toBe("ACTIVE");
  });

  it("accepts explicit read-only mode case-insensitively", () => {
    expect(
      readSystemWriteMode({ CKACE_SYSTEM_WRITE_MODE: " read_only " }),
    ).toBe("READ_ONLY");
  });

  it("fails closed for an invalid mode", () => {
    expect(() =>
      readSystemWriteMode({ CKACE_SYSTEM_WRITE_MODE: "READONLY" }),
    ).toThrow("CKACE_SYSTEM_WRITE_MODE must be ACTIVE or READ_ONLY.");
  });
});
