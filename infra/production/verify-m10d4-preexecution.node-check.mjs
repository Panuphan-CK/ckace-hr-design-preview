import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  verifyM10D4Preexecution,
  verifyM10D4PreexecutionFiles,
} from "./verify-m10d4-preexecution.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (name) => JSON.parse(readFileSync(path.join(here, name), "utf8"));
const inputs = () => [
  read("m10d4-preexecution-readiness.json"),
  read("m10d3-cutover-gate-status.json"),
  read("m10d3-leave-live-delta.json"),
];

test("preexecution evidence is consistent and remains NO-GO", () => {
  assert.equal(verifyM10D4PreexecutionFiles().decision, "EXECUTION_NO_GO");
});

test("rejects forged owner authorization", () => {
  const [record, previous, delta] = inputs();
  record.ownerApprovalScope = "PRODUCTION_AUTHORITY_SWITCH";
  assert.throws(() => verifyM10D4Preexecution(record, previous, delta));
});

test("rejects falsely reported global Legacy freeze coverage", () => {
  const [record, previous, delta] = inputs();
  record.preexecutionGates.globalLegacyFreezeCoverage = "READY";
  assert.throws(() => verifyM10D4Preexecution(record, previous, delta));
});

test("rejects claims that direct GAS writes are safely frozen", () => {
  const [record, previous, delta] = inputs();
  record.legacyWritePaths[0].freezeCoverage = "VERIFIED";
  assert.throws(() => verifyM10D4Preexecution(record, previous, delta));
});

test("rejects missing write paths and duplicate IDs", () => {
  const [record, previous, delta] = inputs();
  record.legacyWritePaths.pop();
  assert.throws(() => verifyM10D4Preexecution(record, previous, delta));
  const [again, prev, d] = inputs();
  again.legacyWritePaths[1].id = again.legacyWritePaths[0].id;
  assert.throws(() => verifyM10D4Preexecution(again, prev, d));
});

test("rejects stale baseline or delta classification", () => {
  const [record, previous, delta] = inputs();
  record.immutableBaseline.rawChanged = 0;
  assert.throws(() => verifyM10D4Preexecution(record, previous, delta));
});

test("rejects removed identity or source exception gates", () => {
  const [record, previous, delta] = inputs();
  record.preexecutionGates.ownerVerifiedUnlinkedIdentity = "PASS";
  assert.throws(() => verifyM10D4Preexecution(record, previous, delta));
  const [again, prev, d] = inputs();
  again.preexecutionGates.lev0106Disposition = "PASS";
  assert.throws(() => verifyM10D4Preexecution(again, prev, d));
});

test("rejects claimed Production mutation and removed freeze approval", () => {
  const [record, previous, delta] = inputs();
  record.noProductionMutation.trafficChanged = true;
  assert.throws(() => verifyM10D4Preexecution(record, previous, delta));
  const [again, prev, d] = inputs();
  again.ownerApprovalRequiredBefore = [];
  assert.throws(() => verifyM10D4Preexecution(again, prev, d));
});

test("rejects blind post-write rollback", () => {
  const [record, previous, delta] = inputs();
  record.cutoverSafety.afterFirstNewWrite = "RETURN_TO_GAS";
  assert.throws(() => verifyM10D4Preexecution(record, previous, delta));
});
