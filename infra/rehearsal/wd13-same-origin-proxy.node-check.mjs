import test from "node:test";
import assert from "node:assert/strict";
import { validateTargets, targetForPath } from "./wd13-same-origin-proxy.mjs";

const web = "https://wd11-candidate---ckace-hr-web-test-cjcyhgow2q-as.a.run.app";
const api = "https://ckace-hr-api-test-cjcyhgow2q-as.a.run.app";

test("exact Project B TEST-only tagged web and api are accepted", () => {
  const targets = validateTargets(web, api);
  assert.equal(targetForPath("/api/security/session", targets), api);
  assert.equal(targetForPath("/desktop/medical", targets), web);
  assert.equal(targetForPath("/_next/static/main.js", targets), web);
});

test("also accepts precisely tagged 0%-traffic WD13 Medical TEST candidate", () => {
  const webCandidate = "https://wd13-medical---ckace-hr-web-test-cjcyhgow2q-as.a.run.app";
  const targets = validateTargets(webCandidate, api);
  assert.equal(targetForPath("/desktop/medical", targets), webCandidate);
  assert.equal(targetForPath("/api/medical/me", targets), api);
});

test("accepts only the explicitly tagged WD13 retry TEST candidate", () => {
  const retry = "https://wd13-retry---ckace-hr-web-test-cjcyhgow2q-as.a.run.app";
  const targets = validateTargets(retry, api);
  assert.equal(targetForPath("/desktop/medical", targets), retry);
  assert.equal(targetForPath("/api/attachments/upload-intent", targets), api);
});


test("accepts exact TASK-35 responsive TEST Web candidate tag", () => {
  const task35Web = "https://task35-responsive---ckace-hr-web-test-cjcyhgow2q-as.a.run.app";
  const taggedApi = "https://task30-uat---ckace-hr-api-test-cjcyhgow2q-as.a.run.app";
  const targets = validateTargets(task35Web, taggedApi);
  assert.equal(targetForPath("/desktop/leave", targets), task35Web);
  assert.equal(targetForPath("/api/test/desktop-uat/bootstrap", targets), taggedApi);
});

test("accepts TASK-28 tagged TEST API candidate", () => {
  const taggedApi = "https://task28-attest---ckace-hr-api-test-cjcyhgow2q-as.a.run.app";
  const targets = validateTargets(
    "https://wd13-retry---ckace-hr-web-test-cjcyhgow2q-as.a.run.app",
    taggedApi,
  );
  assert.equal(targetForPath("/api/security/session", targets), taggedApi);
});

test("accepts exact TASK-30 TEST API candidate tag", () => {
  const taggedApi = "https://task30-uat---ckace-hr-api-test-cjcyhgow2q-as.a.run.app";
  const targets = validateTargets(
    "https://wd13-retry---ckace-hr-web-test-cjcyhgow2q-as.a.run.app",
    taggedApi,
  );
  assert.equal(targetForPath("/api/test/desktop-uat/bootstrap", targets), taggedApi);
});

test("accepts exact TASK-32 private R2 TEST API candidate tag", () => {
  const taggedApi = "https://task32-r2---ckace-hr-api-test-cjcyhgow2q-as.a.run.app";
  const targets = validateTargets(
    "https://wd13-retry---ckace-hr-web-test-cjcyhgow2q-as.a.run.app",
    taggedApi,
  );
  assert.equal(targetForPath("/api/attachments/upload-intent", targets), taggedApi);
});

test("reject Production, unrelated host, embedded credentials, insecure URL", () => {
  for (const candidate of [
    "https://ckace-hr-web-prod-example.a.run.app",
    "https://wd11-candidate---ckace-hr-web-test.example.com",
    "https://wd13-unknown---ckace-hr-web-test-cjcyhgow2q-as.a.run.app",
    "https://wd13-medical---ckace-hr-web-prod-cjcyhgow2q-as.a.run.app",
    "http://wd11-candidate---ckace-hr-web-test-cjcyhgow2q-as.a.run.app",
    "https://me:pass@wd11-candidate---ckace-hr-web-test-cjcyhgow2q-as.a.run.app",
  ]) assert.throws(() => validateTargets(candidate, api), /TEST/);
  assert.throws(() => validateTargets(web, "https://ckace-hr-api-prod-cjcyhgow2q-as.a.run.app"), /TEST/);
});
