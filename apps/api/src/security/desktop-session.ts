import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const VERSION = 1;
const DEFAULT_TTL_SECONDS = 8 * 60 * 60;
const MAX_TTL_SECONDS = 12 * 60 * 60;
const CLOCK_SKEW_SECONDS = 60;

export const DESKTOP_SESSION_COOKIE = "__session";

export interface DesktopSessionClaims {
  readonly version: 1;
  readonly employeeId: string;
  readonly issuedAt: number;
  readonly expiresAt: number;
  readonly nonce: string;
}

function assertSecret(secret: string): void {
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error(
      "Desktop session secret must be at least 32 bytes",
    );
  }
}

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("base64url");
}

export function issueDesktopSessionToken(input: {
  readonly employeeId: string;
  readonly secret: string;
  readonly nowSeconds?: number;
  readonly ttlSeconds?: number;
}): {
  readonly token: string;
  readonly claims: DesktopSessionClaims;
} {
  assertSecret(input.secret);
  const employeeId = input.employeeId.trim();
  if (!employeeId || employeeId.length > 128) {
    throw new Error("Invalid desktop session employee");
  }

  const now = Math.floor(input.nowSeconds ?? Date.now() / 1000);
  const ttl = input.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  if (
    !Number.isInteger(ttl) ||
    ttl < 60 ||
    ttl > MAX_TTL_SECONDS
  ) {
    throw new Error("Invalid desktop session TTL");
  }

  const claims: DesktopSessionClaims = {
    version: VERSION,
    employeeId,
    issuedAt: now,
    expiresAt: now + ttl,
    nonce: randomBytes(16).toString("base64url"),
  };
  const payload = Buffer.from(
    JSON.stringify(claims),
    "utf8",
  ).toString("base64url");

  return {
    token: `${payload}.${signature(payload, input.secret)}`,
    claims,
  };
}

export function verifyDesktopSessionToken(input: {
  readonly token: string;
  readonly secret: string;
  readonly nowSeconds?: number;
}): DesktopSessionClaims {
  assertSecret(input.secret);
  const [payload, providedSignature, extra] =
    input.token.split(".");
  if (!payload || !providedSignature || extra) {
    throw new Error("Invalid desktop session token");
  }

  const expected = Buffer.from(
    signature(payload, input.secret),
  );
  const actual = Buffer.from(providedSignature);
  if (
    expected.byteLength !== actual.byteLength ||
    !timingSafeEqual(expected, actual)
  ) {
    throw new Error("Invalid desktop session signature");
  }

  let claims: DesktopSessionClaims;
  try {
    claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as DesktopSessionClaims;
  } catch {
    throw new Error("Invalid desktop session payload");
  }

  const now = Math.floor(input.nowSeconds ?? Date.now() / 1000);
  if (
    claims.version !== VERSION ||
    typeof claims.employeeId !== "string" ||
    !claims.employeeId.trim() ||
    typeof claims.issuedAt !== "number" ||
    typeof claims.expiresAt !== "number" ||
    typeof claims.nonce !== "string" ||
    !claims.nonce ||
    claims.issuedAt > now + CLOCK_SKEW_SECONDS ||
    claims.expiresAt <= now ||
    claims.expiresAt - claims.issuedAt > MAX_TTL_SECONDS
  ) {
    throw new Error("Invalid desktop session claims");
  }

  return claims;
}

export function readCookie(
  rawCookieHeader: string | undefined,
  name: string,
): string | null {
  if (!rawCookieHeader || rawCookieHeader.length > 16_384) {
    return null;
  }
  for (const part of rawCookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index < 1) continue;
    const key = part.slice(0, index).trim();
    if (key !== name) continue;
    const value = part.slice(index + 1).trim();
    return value || null;
  }
  return null;
}

export function desktopSessionCookie(
  token: string,
  stage: string | undefined,
): string {
  const secure =
    stage?.trim().toLowerCase() === "local" ? "" : "; Secure";
  return [
    `${DESKTOP_SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${DEFAULT_TTL_SECONDS}`,
  ].join("; ") + secure;
}

export function clearDesktopSessionCookie(
  stage: string | undefined,
): string {
  const secure =
    stage?.trim().toLowerCase() === "local" ? "" : "; Secure";
  return [
    `${DESKTOP_SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
  ].join("; ") + secure;
}
