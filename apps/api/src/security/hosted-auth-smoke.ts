import {
  signActorEnvelope,
  type InternalActorContext,
} from "@ckace/auth";

interface SmokeCaseResult {
  readonly name: string;
  readonly status: number;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function encodeEnvelope(
  envelope: ReturnType<typeof signActorEnvelope>,
): string {
  return Buffer.from(JSON.stringify(envelope), "utf8")
    .toString("base64url");
}

async function callSession(
  targetUrl: string,
  headers: Record<string, string> = {},
): Promise<{
  status: number;
  body: string;
}> {
  const response = await fetch(
    `${targetUrl}/api/security/session`,
    { headers },
  );

  return {
    status: response.status,
    body: await response.text(),
  };
}

async function main(): Promise<void> {
  const targetUrl = requireEnv("CKACE_AUTH_SMOKE_TARGET_URL")
    .replace(/\/$/, "");
  const secret = requireEnv("CKACE_LEGACY_BRIDGE_SECRET");

  const actor: InternalActorContext = {
    employeeId: "synthetic-employee-m4",
    legacyUid: "SYNTHETIC-M4",
    roles: ["Employee"],
    permissions: ["profile.self.read"],
    agencyId: "synthetic-agency",
    departmentId: "synthetic-department",
    authenticatedBy: "LEGACY_DESKTOP_BRIDGE",
    correlationId: "upstream-correlation-is-not-authority",
  };

  const validEnvelope = signActorEnvelope(
    actor,
    secret,
    {
      ttlMs: 60_000,
      nonce: "m4-hosted-auth-smoke-valid",
    },
  );

  const tamperedEnvelope = {
    ...validEnvelope,
    actor: {
      ...validEnvelope.actor,
      roles: ["SuperAdmin"],
    },
  };

  const results: SmokeCaseResult[] = [];

  const signedOut = await callSession(targetUrl);
  results.push({
    name: "signed-out",
    status: signedOut.status,
  });

  const forgedHeaders = await callSession(
    targetUrl,
    {
      "x-ckace-role": "SuperAdmin",
      "x-ckace-employee-id": "forged-employee",
    },
  );
  results.push({
    name: "forged-client-headers",
    status: forgedHeaders.status,
  });

  const signedIn = await callSession(
    targetUrl,
    {
      "x-ckace-bridge-envelope":
        encodeEnvelope(validEnvelope),
      "x-ckace-role": "SuperAdmin",
    },
  );
  results.push({
    name: "valid-signed-envelope",
    status: signedIn.status,
  });

  const tampered = await callSession(
    targetUrl,
    {
      "x-ckace-bridge-envelope":
        encodeEnvelope(tamperedEnvelope),
    },
  );
  results.push({
    name: "tampered-envelope",
    status: tampered.status,
  });

  if (
    signedOut.status !== 401 ||
    forgedHeaders.status !== 401 ||
    signedIn.status !== 200 ||
    tampered.status !== 401
  ) {
    throw new Error(
      `Hosted auth smoke failed: ${JSON.stringify(results)}`,
    );
  }

  const signedInBody = JSON.parse(
    signedIn.body,
  ) as Record<string, unknown>;

  if (
    signedInBody.authenticated !== true ||
    signedInBody.employeeId !== actor.employeeId ||
    signedInBody.authenticatedBy !==
      "LEGACY_DESKTOP_BRIDGE" ||
    signedInBody.roleCount !== 1 ||
    signedInBody.permissionCount !== 1 ||
    signedInBody.clientRoleAuthority !== false
  ) {
    throw new Error(
      "Hosted auth smoke returned unexpected safe session metadata",
    );
  }

  console.log(
    JSON.stringify({
      ok: true,
      cases: results,
      clientRoleAuthority:
        signedInBody.clientRoleAuthority,
      authenticatedBy:
        signedInBody.authenticatedBy,
    }),
  );
}

void main().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : "Unknown hosted auth smoke failure";

  console.error(message);
  process.exitCode = 1;
});
