import { afterEach, describe, expect, it, vi } from "vitest";

import { ModuleRoutingService } from "./module-routing.service";

describe("ModuleRoutingService", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps a stable configuration snapshot until the service is recreated", () => {
    vi.stubEnv("CKACE_RUNTIME_STAGE", "local");
    vi.stubEnv("CKACE_MODULE_ROUTING", "LEGACY");
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
    vi.stubEnv("CKACE_MODULE_ROUTING", "LEGACY");
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
});
