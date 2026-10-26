import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_SNAPSHOT_DIRECTORY,
  resolveSnapshotDirectory,
} from "./snapshot-directory.mjs";

describe("migration snapshot directory", () => {
  it("keeps the existing Windows snapshot directory as the default", () => {
    expect(resolveSnapshotDirectory({})).toBe(DEFAULT_SNAPSHOT_DIRECTORY);
    expect(resolveSnapshotDirectory({ CKACE_SNAPSHOT_DIR: "  " })).toBe(DEFAULT_SNAPSHOT_DIRECTORY);
  });

  it("resolves an explicitly configured directory from the current process", () => {
    expect(resolveSnapshotDirectory({ CKACE_SNAPSHOT_DIR: "./review-snapshot" })).toBe(
      path.resolve("./review-snapshot"),
    );
  });
});
