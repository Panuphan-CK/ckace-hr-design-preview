const {
  buildFinalLegacyDelta,
  buildModuleCutoverEvidence,
  extractReadOnlySnapshot,
} = require("../../packages/migration/dist/index.js");

function source(rows) {
  return {
    descriptor: {
      sourceSystem: "APP_LEAVE_GAS",
      sourceWorkbook: "Data_CK&RR_Requests",
      sourceTab: "LeaveRequests",
      sourcePeriod: "CURRENT",
    },
    async readRows() {
      return rows;
    },
  };
}

(async () => {
  const baseline = await extractReadOnlySnapshot({
    source: source([
      { rowNumber: 2, legacyId: "M9-DEMO-001", values: { status: "Pending", userId: "U-DEMO" } },
    ]),
    migrationRunId: "m9-3-demo-baseline",
    extractedAt: "2026-10-06T21:00:00+07:00",
  });
  const final = await extractReadOnlySnapshot({
    source: source([
      { rowNumber: 2, legacyId: "M9-DEMO-001", values: { status: "Approved", userId: "U-DEMO" } },
      { rowNumber: 3, legacyId: "M9-DEMO-002", values: { status: "Pending", userId: "U-DEMO-2" } },
    ]),
    migrationRunId: "m9-3-demo-final",
    extractedAt: "2026-10-06T21:05:00+07:00",
  });
  const delta = buildFinalLegacyDelta({
    module: "LEAVE",
    baselineSnapshots: [baseline],
    finalSnapshots: [final],
  });
  const snapshot = delta.importSnapshots[0];
  const outcomes = snapshot.records.map((record, index) => ({
    provenanceKey: [
      record.provenance.sourceSystem,
      record.provenance.sourceWorkbook,
      record.provenance.sourceTab,
      record.provenance.sourcePeriod || "CURRENT",
      record.provenance.legacyId,
    ].join("::"),
    legacyId: record.provenance.legacyId,
    rowNumber: record.rowNumber,
    status: "IMPORTED",
    code: null,
    detail: null,
    disposition: null,
    targetEntityType: "leave_request",
    targetEntityId: "m9-demo-target-" + (index + 1),
  }));
  const report = {
    migrationRunId: "m9-3-demo-import",
    sourceSnapshot: snapshot.snapshotHash,
    transformerVersion: "leave-v1",
    importedCount: outcomes.length,
    skippedCount: 0,
    rejectedCount: 0,
    exceptionCount: 0,
    mismatchCount: 0,
    ambiguousWriteCount: 0,
    stoppedEarly: false,
    outcomes,
  };
  const evidence = buildModuleCutoverEvidence({
    module: "LEAVE",
    generatedAt: "2026-10-06T21:10:00+07:00",
    delta,
    readAuthority: "LEGACY",
    writeAuthority: "LEGACY",
    writeFreezeActive: true,
    migrationReports: [report],
    removedReconciliation: [],
    moduleReconciliation: [{
      entityType: "leave_request",
      checkName: "synthetic-source-target-count",
      status: "PASS",
      sourceValue: "2",
      targetValue: "2",
      exceptionCode: null,
      disposition: null,
    }],
    runtimeVerification: {
      health: true,
      readiness: true,
      authentication: true,
      idempotency: true,
    },
  });
  process.stdout.write(JSON.stringify(evidence, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
