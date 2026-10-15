import { describe, expect, it } from "vitest";

import {
  createAuditEvent,
  ensureCorrelationId,
  type InternalActorContext,
} from "./index";

describe("audit primitives", () => {
  it("preserves actor correlation ID", () => {
    const actor: InternalActorContext = {
      employeeId: "employee-1",
      legacyUid: null,
      roles: ["Employee"],
      permissions: [],
      agencyId: null,
      departmentId: null,
      authenticatedBy: "PROJECT_B_WEB",
      correlationId: "corr-1",
    };

    expect(
      createAuditEvent({
        actor,
        action: "READ_SELF",
        entityType: "Employee",
      }).correlationId,
    ).toBe("corr-1");
  });

  it("creates a correlation ID when absent", () => {
    expect(ensureCorrelationId(null)).toMatch(
      /^[0-9a-f-]{36}$/i,
    );
  });
});
