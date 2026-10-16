import { describe, expect, it } from "vitest";

import { formatLeaveRequestNo } from "./leave-repository";

describe("leave request number", () => {
  it("pads to four digits and keeps growing after that", () => {
    expect(formatLeaveRequestNo(1)).toBe("LEV-0001");
    expect(formatLeaveRequestNo(42)).toBe("LEV-0042");
    expect(formatLeaveRequestNo(12345)).toBe("LEV-12345");
  });
});
