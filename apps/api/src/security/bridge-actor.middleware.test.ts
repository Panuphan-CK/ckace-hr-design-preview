import {
  signActorEnvelope,
  type InternalActorContext,
} from "@ckace/auth";
import { UnauthorizedException } from "@nestjs/common";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { BridgeActorMiddleware } from "./bridge-actor.middleware";
import type { SecurityRequest } from "./security-request";

const secret = "0123456789abcdef0123456789abcdef";

const actor: InternalActorContext = {
  employeeId: "employee-1",
  legacyUid: "UID-1",
  roles: ["Employee"],
  permissions: ["profile.self.read"],
  agencyId: "agency-1",
  departmentId: "department-1",
  authenticatedBy: "LEGACY_DESKTOP_BRIDGE",
  correlationId: "upstream-correlation",
};

function encodeEnvelope(
  value: ReturnType<typeof signActorEnvelope>,
): string {
  return Buffer.from(JSON.stringify(value), "utf8")
    .toString("base64url");
}

function requestFor(
  headers: Record<string, string | string[] | undefined>,
): SecurityRequest & {
  headers: Record<string, string | string[] | undefined>;
} {
  return {
    headers,
    correlationId: "request-correlation",
  };
}

describe("BridgeActorMiddleware", () => {
  beforeEach(() => {
    vi.stubEnv("CKACE_LEGACY_BRIDGE_SECRET", secret);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("leaves signed-out requests without an actor", () => {
    const request = requestFor({
      "x-ckace-role": "SuperAdmin",
      "x-ckace-employee-id": "employee-forged",
    });
    const next = vi.fn();

    new BridgeActorMiddleware().use(
      request,
      {},
      next,
    );

    expect(next).toHaveBeenCalledOnce();
    expect(request.actor).toBeUndefined();
  });

  it("populates actor only from a valid signed bridge envelope", () => {
    const envelope = signActorEnvelope(actor, secret, {
      nowMs: Date.now(),
      nonce: "hosted-synthetic-valid",
    });
    const request = requestFor({
      "x-ckace-bridge-envelope": encodeEnvelope(envelope),
      "x-ckace-role": "SuperAdmin",
    });
    const next = vi.fn();

    new BridgeActorMiddleware().use(
      request,
      {},
      next,
    );

    expect(next).toHaveBeenCalledOnce();
    expect(request.actor).toEqual({
      ...actor,
      correlationId: "request-correlation",
    });
    expect(request.actor?.roles).toEqual(["Employee"]);
  });

  it("rejects a tampered signed envelope", () => {
    const envelope = signActorEnvelope(actor, secret, {
      nowMs: Date.now(),
      nonce: "hosted-synthetic-tampered",
    });
    const encoded = encodeEnvelope({
      ...envelope,
      actor: {
        ...envelope.actor,
        roles: ["SuperAdmin"],
      },
    });

    expect(() =>
      new BridgeActorMiddleware().use(
        requestFor({
          "x-ckace-bridge-envelope": encoded,
        }),
        {},
        vi.fn(),
      ),
    ).toThrow(UnauthorizedException);
  });

  it("rejects a bridge envelope when no server secret exists", () => {
    vi.stubEnv("CKACE_LEGACY_BRIDGE_SECRET", "");
    const envelope = signActorEnvelope(actor, secret, {
      nowMs: Date.now(),
      nonce: "hosted-synthetic-no-secret",
    });

    expect(() =>
      new BridgeActorMiddleware().use(
        requestFor({
          "x-ckace-bridge-envelope": encodeEnvelope(envelope),
        }),
        {},
        vi.fn(),
      ),
    ).toThrow(UnauthorizedException);
  });
});
