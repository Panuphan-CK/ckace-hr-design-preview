import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const API_SRC = join(__dirname, "..");
const MIGRATIONS = join(__dirname, "..", "..", "..", "..", "packages", "database", "prisma", "migrations");
const MANIFEST = join(__dirname, "..", "..", "..", "..", "infra", "production", "m10d2-rbac-manifest.json");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      return entry.name === "node_modules" || entry.name === "dist" ? [] : sourceFiles(path);
    }

    return entry.name.endsWith(".ts") && !entry.name.includes(".test.") ? [path] : [];
  });
}

describe("permission catalog", () => {
  it("defines every permission key the API requires (manifest or a migration)", () => {
    const used = new Set<string>();

    for (const file of sourceFiles(API_SRC)) {
      const text = readFileSync(file, "utf8");

      for (const match of text.matchAll(/(?:Require(?:Self)?Permission|has)\(\s*"([a-z_]+(?:\.[a-z_]+)+)"/g)) {
        used.add(match[1] as string);
      }
    }

    const manifest = JSON.parse(readFileSync(MANIFEST, "utf8")) as { permissionCatalog: string[] };
    const defined = new Set(manifest.permissionCatalog);
    const migrationText = readdirSync(MIGRATIONS)
      .map((name) => {
        try {
          return readFileSync(join(MIGRATIONS, name, "migration.sql"), "utf8");
        } catch {
          return "";
        }
      })
      .join("\n");
    const missing = [...used].filter((key) => !defined.has(key) && !migrationText.includes(`'${key}'`));

    expect(used.size).toBeGreaterThan(30);
    expect(missing).toEqual([]);
  });
});
