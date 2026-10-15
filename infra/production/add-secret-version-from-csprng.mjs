import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";

const project = process.argv[2];
const secretName = process.argv[3];

if (!project || !secretName) {
  process.stderr.write("usage: node add-secret-version-from-csprng.mjs <project> <secret>\n");
  process.exit(2);
}

const secretValue = randomBytes(48).toString("base64");
const result = spawnSync(
  "gcloud",
  [
    "secrets",
    "versions",
    "add",
    secretName,
    "--project",
    project,
    "--data-file=-",
  ],
  {
    input: secretValue,
    encoding: "utf8",
    shell: process.platform === "win32",
  },
);

if (result.error) {
  process.stderr.write("SECRET_VERSION_ADD_FAIL process launch failed\n");
  process.exit(1);
}
if (result.status !== 0) {
  process.stderr.write("SECRET_VERSION_ADD_FAIL gcloud returned non-zero\n");
  process.exit(result.status ?? 1);
}

process.stdout.write("SECRET_VERSION_ADD_PASS secret=" + secretName + "\n");
