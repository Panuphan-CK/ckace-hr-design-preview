import type { AuthenticatedBy } from "@ckace/contracts";

import {
  ensureCorrelationId,
} from "./audit";
import type { InternalActorContext } from "./internal-actor";

export type IdentityAccountState =
  | "ACTIVE"
  | "PENDING"
  | "INACTIVE"
  | "RESIGNED";

export interface IdentityRecord {
  readonly employeeId: string;
  readonly legacyUid: string | null;
  readonly accountState: IdentityAccountState;
  readonly agencyId: string | null;
  readonly departmentId: string | null;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}

export interface IdentityRepository {
  findByEmployeeId(
    employeeId: string,
  ): Promise<IdentityRecord | null>;

  findByLineUserId(
    lineUserId: string,
  ): Promise<IdentityRecord | null>;
}

export class IdentityUnavailableError extends Error {
  constructor() {
    super("Identity unavailable");
    this.name = "IdentityUnavailableError";
  }
}

export class IdentityInactiveError extends Error {
  constructor() {
    super("Identity inactive");
    this.name = "IdentityInactiveError";
  }
}

function toActor(
  identity: IdentityRecord,
  authenticatedBy: AuthenticatedBy,
  correlationId?: string | null,
): InternalActorContext {
  if (identity.accountState !== "ACTIVE") {
    throw new IdentityInactiveError();
  }

  return {
    employeeId: identity.employeeId,
    legacyUid: identity.legacyUid,
    roles: [...new Set(identity.roles)],
    permissions: [...new Set(identity.permissions)],
    agencyId: identity.agencyId,
    departmentId: identity.departmentId,
    authenticatedBy,
    correlationId: ensureCorrelationId(correlationId),
  };
}

export class IdentityService {
  constructor(
    private readonly repository: IdentityRepository,
  ) {}

  async resolveEmployeeActor(input: {
    readonly employeeId: string;
    readonly authenticatedBy: AuthenticatedBy;
    readonly correlationId?: string | null;
    readonly legacyUid?: string | null;
  }): Promise<InternalActorContext> {
    const identity = await this.repository.findByEmployeeId(
      input.employeeId,
    );

    if (!identity) {
      throw new IdentityUnavailableError();
    }

    return toActor(
      {
        ...identity,
        legacyUid: input.legacyUid ?? identity.legacyUid,
      },
      input.authenticatedBy,
      input.correlationId,
    );
  }

  async resolveLineActor(input: {
    readonly lineUserId: string;
    readonly correlationId?: string | null;
  }): Promise<InternalActorContext> {
    const identity = await this.repository.findByLineUserId(
      input.lineUserId,
    );

    if (!identity) {
      throw new IdentityUnavailableError();
    }

    return toActor(
      identity,
      "LINE_LIFF",
      input.correlationId,
    );
  }
}
