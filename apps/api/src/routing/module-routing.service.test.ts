import { afterEach, describe, expect, it, vi } from "vitest";
import { MODULE_ROUTE_KEYS } from "@ckace/contracts";

import { ModuleRoutingService } from "./module-routing.service";

describe("ModuleRoutingService", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps a stable configuration snapshot until the service is recreated", () => {
    vi.stubEnv("CKACE_RUNTIME_STAGE", "local");
    vi.stubEnv("CKACE_MODULE_ROUTING_STATE", "");
    vi.stubEnv("CKACE_MODULE_WRITE_FREEZE", "");

    const first = new ModuleRoutingService();

    vi.stubEnv(
      "CKACE_MODULE_ROUTING_STATE",
      JSON.stringify({
        LEAVE_READ: "NEW",
        LEAVE_WRITE: "NEW",
      }),
    );
    vi.stubEnv("CKACE_MODULE_WRITE_FREEZE", "LEAVE");

    const second = new ModuleRoutingService();

    expect(first.resolve("LEAVE_WRITE")).toEqual({
      routeKey: "LEAVE_WRITE",
      module: "LEAVE",
      access: "WRITE",
      authority: "LEGACY",
      writeFrozen: false,
    });
    expect(second.resolve("LEAVE_WRITE")).toEqual({
      routeKey: "LEAVE_WRITE",
      module: "LEAVE",
      access: "WRITE",
      authority: "NEW",
      writeFrozen: true,
    });
  });

  it("resolves paired NEW authority and freezes only WRITE access", () => {
    vi.stubEnv("CKACE_RUNTIME_STAGE", "local");
    vi.stubEnv(
      "CKACE_MODULE_ROUTING_STATE",
      JSON.stringify({
        LEAVE_READ: "NEW",
        LEAVE_WRITE: "NEW",
      }),
    );
    vi.stubEnv("CKACE_MODULE_WRITE_FREEZE", "LEAVE");

    const routing = new ModuleRoutingService();

    expect(routing.resolve("LEAVE_READ")).toEqual({
      routeKey: "LEAVE_READ",
      module: "LEAVE",
      access: "READ",
      authority: "NEW",
      writeFrozen: false,
    });
    expect(routing.resolve("LEAVE_WRITE")).toEqual({
      routeKey: "LEAVE_WRITE",
      module: "LEAVE",
      access: "WRITE",
      authority: "NEW",
      writeFrozen: true,
    });
    expect(routing.resolve("OT_WRITE")).toEqual({
      routeKey: "OT_WRITE",
      module: "OT",
      access: "WRITE",
      authority: "LEGACY",
      writeFrozen: false,
    });
  });

  it("freezes writes across every module only when the system switch is enabled", () => {
    vi.stubEnv("CKACE_RUNTIME_STAGE", "local");
    vi.stubEnv("CKACE_MODULE_ROUTING_STATE", "");
    vi.stubEnv("CKACE_MODULE_WRITE_FREEZE", "");
    vi.stubEnv("CKACE_SYSTEM_WRITE_MODE", "READ_ONLY");

    const routing = new ModuleRoutingService();

    expect(routing.systemReadOnly).toBe(true);
    expect(routing.resolve("LEAVE_READ").writeFrozen).toBe(false);
    expect(routing.resolve("LEAVE_WRITE").writeFrozen).toBe(true);
    expect(routing.resolve("ATTENDANCE_WRITE").writeFrozen).toBe(true);
    expect(routing.resolve("OT_WRITE").writeFrozen).toBe(true);
    expect(routing.resolve("MEDICAL_WRITE").writeFrozen).toBe(true);
    expect(routing.resolve("ADMIN_WRITE").writeFrozen).toBe(true);
  });

  it("reports full Production authority accurately and rejects mixed startup state", () => {
    vi.stubEnv("CKACE_RUNTIME_STAGE", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://synthetic.invalid/ckace_hr_prod");
    vi.stubEnv("CKACE_LEGACY_BRIDGE_SECRET", "synthetic-bridge-secret");
    vi.stubEnv("R2_ACCOUNT_ID", "synthetic-account");
    vi.stubEnv("R2_BUCKET_NAME", "ckace-hr-prod-private");
    vi.stubEnv("R2_ACCESS_KEY_ID", "synthetic-access-key");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "synthetic-secret-key");
    vi.stubEnv("LINE_LOGIN_CHANNEL_ID", "synthetic-channel");
    const allNew = Object.fromEntries(MODULE_ROUTE_KEYS.map((routeKey) => [routeKey, "NEW"]));
    vi.stubEnv("CKACE_MODULE_ROUTING_STATE", JSON.stringify(allNew));
    vi.stubEnv("CKACE_PRODUCTION_CUTOVER_MODULE", "");

    expect(new ModuleRoutingService().authorityMode).toBe("NEW");

    const mixed = { ...allNew, LEAVE_READ: "LEGACY", LEAVE_WRITE: "LEGACY" };
    vi.stubEnv("CKACE_MODULE_ROUTING_STATE", JSON.stringify(mixed));
    expect(() => new ModuleRoutingService()).toThrow(/all LEGACY or all NEW/);
  });
});
