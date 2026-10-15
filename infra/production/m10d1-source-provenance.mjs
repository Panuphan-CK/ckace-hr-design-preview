import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const sha = (relative) =>
  createHash("sha256")
    .update(readFileSync(path.join(root, relative)))
    .digest("hex");

function collect(target) {
  const stat = statSync(target);
  if (!stat.isDirectory()) return [target];
  return readdirSync(target)
    .sort()
    .flatMap((name) => collect(path.join(target, name)));
}

const files = [
  ...["package.json", "package-lock.json", "tsconfig.base.json"].map((file) =>
    path.join(root, file),
  ),
  ...["apps", "packages"].flatMap((dir) => collect(path.join(root, dir))),
]
  .filter(
    (file) =>
      !file.includes(path.sep + "dist" + path.sep) &&
      !file.includes(path.sep + ".next" + path.sep) &&
      !file.includes(path.sep + "node_modules" + path.sep),
  )
  .sort();

const entries = files.map(
  (file) =>
    path.relative(root, file).replaceAll("\\", "/") +
    "\0" +
    createHash("sha256").update(readFileSync(file)).digest("hex"),
);

const migrationDir = path.join(root, "packages", "database", "prisma", "migrations");
const migrations = readdirSync(migrationDir)
  .filter((name) => statSync(path.join(migrationDir, name)).isDirectory())
  .sort();
const migrationEntries = migrations.map(
  (name) =>
    name +
    "\0" +
    createHash("sha256")
      .update(readFileSync(path.join(migrationDir, name, "migration.sql")))
      .digest("hex"),
);

const result = {
  artifactInputFileCount: files.length,
  artifactInputSha256: createHash("sha256")
    .update(entries.join("\n"))
    .digest("hex"),
  packageLockSha256: sha("package-lock.json"),
  prismaSchemaSha256: sha("packages/database/prisma/schema.prisma"),
  migrationCount: migrations.length,
  migrations,
  migrationSetSha256: createHash("sha256")
    .update(migrationEntries.join("\n"))
    .digest("hex"),
  apiDockerfileSha256: sha("infra/cloudrun/api.Dockerfile"),
  webDockerfileSha256: sha("infra/cloudrun/web.Dockerfile"),
  apiCloudBuildConfigSha256: sha("infra/cloudbuild/api.yaml"),
  webCloudBuildConfigSha256: sha("infra/cloudbuild/web.yaml"),
  firebaseProdSha256: sha("firebase.prod.json"),
};

process.stdout.write(JSON.stringify(result, null, 2) + "\n");
