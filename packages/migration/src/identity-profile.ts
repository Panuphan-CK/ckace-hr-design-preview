import {
  classifyLegacyAccountState,
  type AccountState,
} from "@ckace/business-rules";

import type {
  JsonValue,
  LegacyExtractedRecord,
  MigrationTransformer,
} from "./migration-contracts";
import type { ReconciliationResult } from "./reconciliation";
import { canonicalJson } from "./source-snapshot";

const LEGACY_ROLE_TO_ROLE_KEY: Readonly<Record<string, string>> =
  Object.freeze({
    USER: "EMPLOYEE",
    SUPERUSER: "SUPERUSER",
    ADMIN: "ADMIN",
    SUPERADMIN: "SUPERADMIN",
  });

export interface IdentityProfileReconciliationRecord {
  readonly legacyUid: string;
  readonly accountState: AccountState;
  readonly normalizedLogin: string;
  readonly lineLinked: boolean;
}

function requiredString(
  record: LegacyExtractedRecord,
  key: string,
): string {
  const value = record.values[key];

  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing or invalid legacy ${key}`);
  }

  return value.trim();
}

function optionalString(
  record: LegacyExtractedRecord,
  key: string,
): string | null {
  const value = record.values[key];

  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`Invalid legacy ${key}`);
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function parseLegacyBoolean(
  value: JsonValue | undefined,
): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();

    if (normalized === "TRUE") {
      return true;
    }

    if (normalized === "FALSE") {
      return false;
    }
  }

  throw new Error("Invalid legacy account status");
}

function parseOptionalDate(
  value: string | null,
): string | null {
  if (!value) {
    return null;
  }

  const ddmmyyyy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);

  if (ddmmyyyy) {
    const day = Number(ddmmyyyy[1]);
    const month = Number(ddmmyyyy[2]);
    const year = Number(ddmmyyyy[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new Error("Invalid legacy calendar date");
    }

    return `${year.toString().padStart(4, "0")}-${month
      .toString()
      .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new Error("Invalid legacy calendar date");
    }

    return value;
  }

  throw new Error("Unsupported legacy date format");
}

function transformLegacyUser(
  record: LegacyExtractedRecord,
) {
  try {
    if (record.provenance.sourceTab !== "Users") {
      return {
        action: "REJECT" as const,
        code: "IDENTITY_WRONG_SOURCE_TAB",
        reason: "Identity/Profile transformer only accepts Users rows",
      };
    }

    const uid = requiredString(record, "UID");

    if (uid !== record.provenance.legacyId) {
      return {
        action: "REJECT" as const,
        code: "IDENTITY_UID_PROVENANCE_MISMATCH",
        reason: "Users UID does not match source-qualified legacy identity",
      };
    }

    const fullName = requiredString(record, "Fullname");
    const loginName = requiredString(record, "Username");
    const legacyRole = requiredString(record, "Role").toUpperCase();
    const roleKey = LEGACY_ROLE_TO_ROLE_KEY[legacyRole];

    if (!roleKey) {
      return {
        action: "REJECT" as const,
        code: "IDENTITY_UNKNOWN_ROLE",
        reason: "Legacy role is not mapped explicitly",
      };
    }

    const agencyId = optionalString(record, "Agency");
    const departmentId = optionalString(record, "Department");
    const resignationDate = parseOptionalDate(
      optionalString(record, "ResignationDate"),
    );
    const active = parseLegacyBoolean(record.values.status);
    const accountState = classifyLegacyAccountState({
      active,
      resignationDate,
      agencyId,
      departmentId,
    });

    const payload = {
      legacyUid: uid,
      employee: {
        fullName,
        nickname: optionalString(record, "Nickname"),
        dateOfBirth: parseOptionalDate(
          optionalString(record, "dateOfBirth"),
        ),
        employmentStart: parseOptionalDate(
          optionalString(record, "startDate"),
        ),
        resignationDate,
        legacyAgencyId: agencyId,
        legacyDepartmentId: departmentId,
      },
      userAccount: {
        loginName,
        normalizedLogin: loginName.toLowerCase(),
        legacyPasswordHash: optionalString(record, "Password"),
        accountState,
      },
      roleKey,
      lineAccount: (() => {
        const lineUserId = optionalString(record, "LineUserID");

        return lineUserId ? { lineUserId } : null;
      })(),
      media: {
        legacyProfileUrl: optionalString(record, "Profile"),
        legacySignatureUrl: optionalString(record, "Sig"),
      },
    } satisfies JsonValue;

    return {
      action: "IMPORT" as const,
      targetEntityType: "identity_profile_bundle",
      payload,
    };
  } catch (error) {
    return {
      action: "REJECT" as const,
      code: "IDENTITY_INVALID_SOURCE_VALUE",
      reason:
        error instanceof Error
          ? error.message
          : "Invalid legacy identity/profile source value",
    };
  }
}

export const identityProfileTransformer: MigrationTransformer = {
  version: "identity-profile-v1",
  transform: transformLegacyUser,
};

function stateCounts(
  records: readonly IdentityProfileReconciliationRecord[],
): Readonly<Record<AccountState, number>> {
  return records.reduce<Record<AccountState, number>>(
    (counts, record) => {
      counts[record.accountState] += 1;
      return counts;
    },
    {
      ACTIVE: 0,
      PENDING: 0,
      INACTIVE: 0,
      RESIGNED: 0,
    },
  );
}

function reconciliationResult(input: {
  readonly checkName: string;
  readonly sourceValue: string;
  readonly targetValue: string;
  readonly code: string;
}): ReconciliationResult {
  if (input.sourceValue === input.targetValue) {
    return {
      entityType: "identity_profile",
      checkName: input.checkName,
      status: "PASS",
      sourceValue: input.sourceValue,
      targetValue: input.targetValue,
      exceptionCode: null,
      disposition: null,
    };
  }

  return {
    entityType: "identity_profile",
    checkName: input.checkName,
    status: "FAIL",
    sourceValue: input.sourceValue,
    targetValue: input.targetValue,
    exceptionCode: input.code,
    disposition:
      "BLOCK_IDENTITY_PROFILE_ACCEPTANCE_UNTIL_SOURCE_AND_TARGET_RECONCILE",
  };
}

export function reconcileIdentityProfiles(
  source: readonly IdentityProfileReconciliationRecord[],
  target: readonly IdentityProfileReconciliationRecord[],
): readonly ReconciliationResult[] {
  const sourceUids = [...source.map((record) => record.legacyUid)].sort();
  const targetUids = [...target.map((record) => record.legacyUid)].sort();

  return [
    reconciliationResult({
      checkName: "employee_count",
      sourceValue: String(source.length),
      targetValue: String(target.length),
      code: "IDENTITY_EMPLOYEE_COUNT_MISMATCH",
    }),
    reconciliationResult({
      checkName: "legacy_uid_set",
      sourceValue: canonicalJson(sourceUids),
      targetValue: canonicalJson(targetUids),
      code: "IDENTITY_LEGACY_UID_SET_MISMATCH",
    }),
    reconciliationResult({
      checkName: "account_state_counts",
      sourceValue: canonicalJson(stateCounts(source)),
      targetValue: canonicalJson(stateCounts(target)),
      code: "IDENTITY_ACCOUNT_STATE_COUNT_MISMATCH",
    }),
    reconciliationResult({
      checkName: "line_linked_count",
      sourceValue: String(
        source.filter((record) => record.lineLinked).length,
      ),
      targetValue: String(
        target.filter((record) => record.lineLinked).length,
      ),
      code: "IDENTITY_LINE_LINKED_COUNT_MISMATCH",
    }),
  ];
}
