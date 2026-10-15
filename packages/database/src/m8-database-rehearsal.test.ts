import { describe, expect, it } from "vitest";

import {
  assertRehearsalSource,
  databaseNameFromUrl,
  M8_REHEARSAL_DATABASE,
  replaceDatabaseName,
} from "./m8-database-rehearsal";

describe("M8 database rehearsal safety", () => {
  it("replaces only the database name while preserving connection options", () => {
    const input =
      "postgresql://user:secret@example.test/ckace_hr_dev?sslmode=require&channel_binding=require";
    const output = replaceDatabaseName(input, M8_REHEARSAL_DATABASE);
    const parsed = new URL(output);

    expect(parsed.pathname).toBe(`/${M8_REHEARSAL_DATABASE}`);
    expect(parsed.searchParams.get("sslmode")).toBe("require");
    expect(parsed.searchParams.get("channel_binding")).toBe("require");
  });

  it("extracts the source database name", () => {
    expect(
      databaseNameFromUrl(
        "postgresql://user:secret@example.test/ckace_hr_dev?sslmode=require",
      ),
    ).toBe("ckace_hr_dev");
  });

  it("fails closed outside the explicit DEV/LEGACY rehearsal boundary", () => {
    expect(() =>
      assertRehearsalSource({
        databaseUrl: "postgresql://x:y@example.test/ckace_hr_prod",
        allowed: "true",
        moduleRouting: "LEGACY",
      }),
    ).toThrow(/ckace_hr_dev/);

    expect(() =>
      assertRehearsalSource({
        databaseUrl: "postgresql://x:y@example.test/ckace_hr_dev",
        allowed: "false",
        moduleRouting: "LEGACY",
      }),
    ).toThrow(/M8_REHEARSAL_ALLOWED/);

    expect(() =>
      assertRehearsalSource({
        databaseUrl: "postgresql://x:y@example.test/ckace_hr_dev",
        allowed: "true",
        moduleRouting: "NEW",
      }),
    ).toThrow(/LEGACY/);
  });
});
