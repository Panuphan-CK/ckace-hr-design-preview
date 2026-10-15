import { describe, expect, it } from "vitest";

import {
  signActorEnvelope,
  verifyActorEnvelope,
  type InternalActorContext,
} from "./index";

const secret = "0123456789abcdef0123456789abcdef";
const actor: InternalActorContext = {
  employeeId: "employee-1",
  legacyUid: "UID-1",
  roles: ["Employee"],
  permissions: ["leave.self.read"],
  agencyId: "agency-1",
  departmentId: "department-1",
  authenticatedBy: "LEGACY_DESKTOP_BRIDGE",
  correlationId: "corr-1",
};

describe("signed legacy bridge actor envelope", () => {
  it("round-trips a valid short-lived actor context", () => {
    const envelope = signActorEnvelope(actor, secret, {
      nowMs: 1_000_000,
      ttlMs: 60_000,
      nonce: "nonce-1",
    });

    expect(
      verifyActorEnvelope(envelope, secret, 1_030_000),
    ).toEqual(actor);
  });

  it("rejects tampering", () => {
    const envelope = signActorEnvelope(actor, secret, {
      nowMs: 1_000_000,
      nonce: "nonce-1",
    });

    expect(() =>
      verifyActorEnvelope(
        {
          ...envelope,
          actor: {
            ...envelope.actor,
            permissions: ["admin.users.write"],
          },
        },
        secret,
        1_010_000,
      ),
    ).toThrow("Invalid bridge actor envelope signature");
  });

  it("rejects expired envelopes", () => {
    const envelope = signActorEnvelope(actor, secret, {
      nowMs: 1_000_000,
      ttlMs: 1_000,
      nonce: "nonce-1",
    });

    expect(() =>
      verifyActorEnvelope(envelope, secret, 1_001_000),
    ).toThrow("Bridge actor envelope expired");
  });

  it("rejects weak signing secrets", () => {
    expect(() =>
      signActorEnvelope(actor, "too-short"),
    ).toThrow("at least 32 bytes");
  });
});
