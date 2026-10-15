import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import type { InternalActorContext } from "./internal-actor";

const MIN_SECRET_BYTES = 32;
const DEFAULT_TTL_MS = 60_000;
const MAX_TTL_MS = 5 * 60_000;

export interface SignedActorEnvelope {
  readonly version: 1;
  readonly issuedAtMs: number;
  readonly expiresAtMs: number;
  readonly nonce: string;
  readonly actor: InternalActorContext;
  readonly signature: string;
}

function assertStrongSecret(secret: string): void {
  if (Buffer.byteLength(secret, "utf8") < MIN_SECRET_BYTES) {
    throw new Error("Bridge signing secret must be at least 32 bytes");
  }
}

function payloadFor(
  envelope: Omit<SignedActorEnvelope, "signature">,
): string {
  return JSON.stringify({
    version: envelope.version,
    issuedAtMs: envelope.issuedAtMs,
    expiresAtMs: envelope.expiresAtMs,
    nonce: envelope.nonce,
    actor: envelope.actor,
  });
}

function signatureFor(
  envelope: Omit<SignedActorEnvelope, "signature">,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(payloadFor(envelope))
    .digest("base64url");
}

export function signActorEnvelope(
  actor: InternalActorContext,
  secret: string,
  options: {
    readonly nowMs?: number;
    readonly ttlMs?: number;
    readonly nonce?: string;
  } = {},
): SignedActorEnvelope {
  assertStrongSecret(secret);

  const nowMs = options.nowMs ?? Date.now();
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;

  if (ttlMs <= 0 || ttlMs > MAX_TTL_MS) {
    throw new Error("Bridge actor envelope TTL is out of range");
  }

  const unsigned = {
    version: 1 as const,
    issuedAtMs: nowMs,
    expiresAtMs: nowMs + ttlMs,
    nonce: options.nonce ?? randomUUID(),
    actor,
  };

  return {
    ...unsigned,
    signature: signatureFor(unsigned, secret),
  };
}

export function verifyActorEnvelope(
  envelope: SignedActorEnvelope,
  secret: string,
  nowMs = Date.now(),
): InternalActorContext {
  assertStrongSecret(secret);

  if (envelope.version !== 1) {
    throw new Error("Unsupported bridge actor envelope version");
  }

  if (
    !Number.isSafeInteger(envelope.issuedAtMs) ||
    !Number.isSafeInteger(envelope.expiresAtMs) ||
    envelope.expiresAtMs <= envelope.issuedAtMs ||
    envelope.expiresAtMs - envelope.issuedAtMs > MAX_TTL_MS
  ) {
    throw new Error("Invalid bridge actor envelope lifetime");
  }

  if (nowMs < envelope.issuedAtMs - 30_000) {
    throw new Error("Bridge actor envelope issued in the future");
  }

  if (nowMs >= envelope.expiresAtMs) {
    throw new Error("Bridge actor envelope expired");
  }

  const expected = signatureFor(
    {
      version: envelope.version,
      issuedAtMs: envelope.issuedAtMs,
      expiresAtMs: envelope.expiresAtMs,
      nonce: envelope.nonce,
      actor: envelope.actor,
    },
    secret,
  );

  const actualBuffer = Buffer.from(envelope.signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid bridge actor envelope signature");
  }

  return envelope.actor;
}
