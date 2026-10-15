import type {
  ExistingTargetRecord,
  MigrationTargetStore,
  ReadOnlyLegacySource,
  TargetCreateInput,
} from "./index";
import {
  countByStatus,
  extractReadOnlySnapshot,
  identityProfileTransformer,
  reconcileIdentityProfiles,
  runMigration,
} from "./index";
import { describe, expect, it } from "vitest";

class InMemoryStore implements MigrationTargetStore {
  readonly records = new Map<string, ExistingTargetRecord>();
  readonly createInputs: TargetCreateInput[] = [];

  async findByProvenanceKey(
    provenanceKey: string,
  ): Promise<ExistingTargetRecord | null> {
    return this.records.get(provenanceKey) ?? null;
  }

  async create(
    input: TargetCreateInput,
  ): Promise<{ targetEntityId: string }> {
    this.createInputs.push(input);
    const targetEntityId = `employee-${this.createInputs.length}`;

    this.records.set(input.provenanceKey, {
      provenanceKey: input.provenanceKey,
      sourcePayloadHash: input.sourcePayloadHash,
      transformedPayloadHash: input.transformedPayloadHash,
      transformerVersion: input.transformerVersion,
      targetEntityType: input.targetEntityType,
      targetEntityId,
    });

    return { targetEntityId };
  }
}

function sourceFor(
  values: Readonly<Record<string, string | boolean | null>>,
): ReadOnlyLegacySource {
  return {
    descriptor: {
      sourceSystem: "APP_LEAVE_GAS",
      sourceWorkbook: "CK&RR_Request",
      sourceTab: "Users",
      sourcePeriod: "CURRENT",
    },
    async readRows() {
      return [
        {
          rowNumber: 2,
          legacyId: String(values.UID),
          values,
        },
      ];
    },
  };
}

function activeValues() {
  return {
    UID: "USER-001",
    Username: "Employee@Example.test",
    Password: "legacy-hash-sensitive",
    Fullname: "Example Employee",
    Agency: "AGC-001",
    Department: "DPM-001",
    Role: "User",
    Profile: "legacy-profile-reference",
    Sig: "legacy-signature-reference",
    status: true,
    LineUserID: "sensitive-line-user-id",
    dateOfBirth: "02/01/1990",
    startDate: "04/03/2020",
    ResignationDate: null,
    Nickname: "Example",
  } as const;
}

async function transformed(
  values = activeValues(),
) {
  const snapshot = await extractReadOnlySnapshot({
    source: sourceFor(values),
    migrationRunId: "identity-run",
    extractedAt: "2026-10-05T05:00:00Z",
  });

  return identityProfileTransformer.transform(
    snapshot.records[0]!,
  );
}

describe("identity/profile migration transformer", () => {
  it("maps an active Users row deterministically without trusting display role names", async () => {
    const decision = await transformed();

    expect(decision).toMatchObject({
      action: "IMPORT",
      targetEntityType: "identity_profile_bundle",
      payload: {
        legacyUid: "USER-001",
        employee: {
          fullName: "Example Employee",
          nickname: "Example",
          dateOfBirth: "1990-01-02",
          employmentStart: "2020-03-04",
          resignationDate: null,
          legacyAgencyId: "AGC-001",
          legacyDepartmentId: "DPM-001",
        },
        userAccount: {
          loginName: "Employee@Example.test",
          normalizedLogin: "employee@example.test",
          accountState: "ACTIVE",
        },
        roleKey: "EMPLOYEE",
        lineAccount: {
          lineUserId: "sensitive-line-user-id",
        },
      },
    });
  });

  it("classifies pending, inactive and resigned legacy accounts explicitly", async () => {
    const pending = await transformed({
      ...activeValues(),
      UID: "USER-PENDING",
      status: false,
      Agency: "",
      Department: "",
      LineUserID: "",
    });
    const inactive = await transformed({
      ...activeValues(),
      UID: "USER-INACTIVE",
      status: false,
      ResignationDate: null,
    });
    const resigned = await transformed({
      ...activeValues(),
      UID: "USER-RESIGNED",
      status: false,
      ResignationDate: "01/10/2026",
    });

    expect(pending).toMatchObject({
      action: "IMPORT",
      payload: {
        userAccount: { accountState: "PENDING" },
      },
    });
    expect(inactive).toMatchObject({
      action: "IMPORT",
      payload: {
        userAccount: { accountState: "INACTIVE" },
      },
    });
    expect(resigned).toMatchObject({
      action: "IMPORT",
      payload: {
        userAccount: { accountState: "RESIGNED" },
        employee: { resignationDate: "2026-10-01" },
      },
    });
  });

  it("rejects unknown roles and unsupported dates instead of guessing", async () => {
    await expect(
      transformed({
        ...activeValues(),
        Role: "MysteryRole",
      }),
    ).resolves.toMatchObject({
      action: "REJECT",
      code: "IDENTITY_UNKNOWN_ROLE",
    });

    await expect(
      transformed({
        ...activeValues(),
        dateOfBirth: "01-02-1990",
      }),
    ).resolves.toMatchObject({
      action: "REJECT",
      code: "IDENTITY_INVALID_SOURCE_VALUE",
    });
  });

  it("keeps password and LINE identifiers out of migration reports", async () => {
    const store = new InMemoryStore();
    const snapshot = await extractReadOnlySnapshot({
      source: sourceFor(activeValues()),
      migrationRunId: "identity-report-run",
      extractedAt: "2026-10-05T05:00:00Z",
    });

    const report = await runMigration({
      migrationRunId: "identity-report-run",
      snapshot,
      transformer: identityProfileTransformer,
      targetStore: store,
    });
    const serializedReport = JSON.stringify(report);

    expect(report.importedCount).toBe(1);
    expect(serializedReport).not.toContain(
      "legacy-hash-sensitive",
    );
    expect(serializedReport).not.toContain(
      "sensitive-line-user-id",
    );
  });

  it("reconciles exact UID/state/LINE counts and makes mismatches blocking", () => {
    const source = [
      {
        legacyUid: "USER-001",
        accountState: "ACTIVE" as const,
        normalizedLogin: "one@example.test",
        lineLinked: true,
      },
      {
        legacyUid: "USER-002",
        accountState: "PENDING" as const,
        normalizedLogin: "two@example.test",
        lineLinked: false,
      },
    ];

    expect(
      countByStatus(
        reconcileIdentityProfiles(source, [...source]),
      ),
    ).toEqual({ PASS: 4, EXCEPTION: 0, FAIL: 0 });

    const mismatch = reconcileIdentityProfiles(
      source,
      source.slice(0, 1),
    );

    expect(countByStatus(mismatch).FAIL).toBeGreaterThan(0);
    expect(
      mismatch
        .filter((result) => result.status === "FAIL")
        .every(
          (result) =>
            Boolean(result.exceptionCode) &&
            Boolean(result.disposition),
        ),
    ).toBe(true);
  });
});
