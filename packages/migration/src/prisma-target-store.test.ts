import { describe, expect, it } from "vitest";

import { assertDisposableMigrationDatabase, assertMigrationTargetEnvironment, PrismaMigrationTargetStore } from "./prisma-target-store";

describe("PrismaMigrationTargetStore safety gates", () => {
  it("accepts only the named loopback disposable database", () => {
    expect(assertDisposableMigrationDatabase("postgresql://user:pass@127.0.0.1:5432/ckace_hr_dev")).toBe("ckace_hr_dev");
    expect(assertDisposableMigrationDatabase("postgres://user:pass@[::1]:5432/ckace_hr_dev")).toBe("ckace_hr_dev");
    expect(() => assertDisposableMigrationDatabase("postgresql://user:pass@db.example.test/ckace_hr_dev")).toThrow(/loopback/);
    expect(() => assertDisposableMigrationDatabase("postgresql://user:pass@127.0.0.1:5432/ckace_hr_prod")).toThrow(/ckace_hr_dev/);
    expect(() => assertDisposableMigrationDatabase("mysql://user:pass@127.0.0.1:3306/ckace_hr_dev")).toThrow(/PostgreSQL/);
  });

  it("requires the explicit migration-job capability even for loopback DEV", () => {
    expect(() => new PrismaMigrationTargetStore({} as never, {
      DATABASE_URL: "postgresql://user:pass@127.0.0.1:5432/ckace_hr_dev",
    })).toThrow(/migration job/);
    expect(() => new PrismaMigrationTargetStore({} as never, {
      CKACE_MIGRATION_JOB: "YES",
      DATABASE_URL: "postgresql://user:pass@db.example.test/ckace_hr_dev",
    })).toThrow(/loopback/);
  });

  it("exposes the same guarded database target for rehearsal seed scripts", () => {
    expect(assertMigrationTargetEnvironment({
      CKACE_MIGRATION_JOB: "YES",
      DATABASE_URL: "postgresql://user:pass@127.0.0.1:5432/ckace_hr_dev",
    })).toBe("ckace_hr_dev");
    expect(() => assertMigrationTargetEnvironment({
      CKACE_MIGRATION_JOB: "YES",
      DATABASE_URL: "postgresql://user:pass@db.example.test/ckace_hr_dev",
    })).toThrow(/loopback/);
  });
});
