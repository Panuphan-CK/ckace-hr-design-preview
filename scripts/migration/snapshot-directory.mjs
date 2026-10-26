import path from "node:path";

export const DEFAULT_SNAPSHOT_DIRECTORY = "D:\\CKACE_HR_snapshot";

export function resolveSnapshotDirectory(env = process.env) {
  const configured = env.CKACE_SNAPSHOT_DIR?.trim();
  return configured ? path.resolve(configured) : DEFAULT_SNAPSHOT_DIRECTORY;
}
