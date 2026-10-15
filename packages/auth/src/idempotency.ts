import { createHash } from "node:crypto";

export interface IdempotencyClaim {
  readonly actorEmployeeId: string;
  readonly operationKind: string;
  readonly clientKey: string;
  readonly payloadHash: string;
}

export interface IdempotencyClaimResult {
  readonly replayed: boolean;
  readonly resultReferenceId: string | null;
}

export interface IdempotencyStore {
  claim(
    claim: IdempotencyClaim,
  ): Promise<IdempotencyClaimResult>;

  complete(input: {
    readonly actorEmployeeId: string;
    readonly operationKind: string;
    readonly clientKey: string;
    readonly resultReferenceId: string;
  }): Promise<void>;
}

export function hashIdempotencyPayload(
  canonicalPayload: string,
): string {
  return createHash("sha256")
    .update(canonicalPayload)
    .digest("hex");
}

export function createIdempotencyClaim(input: {
  readonly actorEmployeeId: string;
  readonly operationKind: string;
  readonly clientKey: string;
  readonly canonicalPayload: string;
}): IdempotencyClaim {
  const operationKind = input.operationKind.trim();
  const clientKey = input.clientKey.trim();

  if (!operationKind || !clientKey) {
    throw new Error("Idempotency operation and client key are required");
  }

  return {
    actorEmployeeId: input.actorEmployeeId,
    operationKind,
    clientKey,
    payloadHash: hashIdempotencyPayload(
      input.canonicalPayload,
    ),
  };
}

export class IdempotencyConflictError extends Error {
  constructor() {
    super("Idempotency conflict");
    this.name = "IdempotencyConflictError";
  }
}
