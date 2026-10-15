import { describe, expect, it } from "vitest";

import {
  createIdempotencyClaim,
  hashIdempotencyPayload,
} from "./index";

describe("idempotency primitives", () => {
  it("hashes the same canonical payload deterministically", () => {
    expect(hashIdempotencyPayload('{"a":1}')).toBe(
      hashIdempotencyPayload('{"a":1}'),
    );
  });

  it("binds client keys to actor, operation and payload hash", () => {
    expect(
      createIdempotencyClaim({
        actorEmployeeId: "employee-1",
        operationKind: "LEAVE_CREATE",
        clientKey: "client-key-1",
        canonicalPayload: '{"leave":"annual"}',
      }),
    ).toMatchObject({
      actorEmployeeId: "employee-1",
      operationKind: "LEAVE_CREATE",
      clientKey: "client-key-1",
    });
  });

  it("rejects blank operation/client keys", () => {
    expect(() =>
      createIdempotencyClaim({
        actorEmployeeId: "employee-1",
        operationKind: "",
        clientKey: "client-key-1",
        canonicalPayload: "{}",
      }),
    ).toThrow("required");
  });
});
