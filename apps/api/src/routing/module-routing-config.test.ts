import {
  HR_MODULE_KEYS,
  LEGACY_ONLY_ROUTING,
  MODULE_ROUTE_KEYS,
} from "@ckace/contracts";
import { describe, expect, it } from "vitest";

import { readModuleRoutingConfig } from "./module-routing-config";

describe("readModuleRoutingConfig", () => {
  it("defaults every route to LEGACY with no write freeze", () => {
    const config = readModuleRoutingConfig({}, "test");
    expect(config.state).toEqual(LEGACY_ONLY_ROUTING);
    expect(config.frozenWriteModules).toEqual([]);
    expect(config.systemWriteMode).toBe("ACTIVE");
    expect(MODULE_ROUTE_KEYS).toHaveLength(26);
  });

  it("accepts paired READ/WRITE NEW authority in non-Production", () => {
    const config = readModuleRoutingConfig(
      {
        CKACE_MODULE_ROUTING_STATE: JSON.stringify({
          LEAVE_READ: "NEW",
          LEAVE_WRITE: "NEW",
        }),
      },
      "test",
    );
    expect(config.state.LEAVE_READ).toBe("NEW");
    expect(config.state.LEAVE_WRITE).toBe("NEW");
    expect(config.state.OT_READ).toBe("LEGACY");
  });

  it("rejects malformed and non-object routing configuration", () => {
    expect(() =>
      readModuleRoutingConfig(
        { CKACE_MODULE_ROUTING_STATE: "{" },
        "test",
      ),
    ).toThrow(/valid JSON/);

    expect(() =>
      readModuleRoutingConfig(
        { CKACE_MODULE_ROUTING_STATE: "[]" },
        "test",
      ),
    ).toThrow(/JSON object/);

    expect(() =>
      readModuleRoutingConfig(
        { CKACE_MODULE_ROUTING_STATE: "null" },
        "test",
      ),
    ).toThrow(/JSON object/);
  });

  it("rejects split READ/WRITE authority", () => {
    expect(() =>
      readModuleRoutingConfig(
        {
          CKACE_MODULE_ROUTING_STATE: JSON.stringify({
            LEAVE_READ: "NEW",
          }),
        },
        "test",
      ),
    ).toThrow(/switch READ and WRITE authority together/);
  });

  it("rejects unknown route keys and authority values", () => {
    expect(() =>
      readModuleRoutingConfig(
        {
          CKACE_MODULE_ROUTING_STATE: JSON.stringify({
            MAGIC_READ: "NEW",
          }),
        },
        "test",
      ),
    ).toThrow(/Unknown module route key/);

    expect(() =>
      readModuleRoutingConfig(
        {
          CKACE_MODULE_ROUTING_STATE: JSON.stringify({
            LEAVE_READ: "MAYBE",
          }),
        },
        "test",
      ),
    ).toThrow(/LEGACY or NEW/);
  });

  it("keeps Production fail-closed unless a bounded cutover module is explicit", () => {
    expect(() =>
      readModuleRoutingConfig(
        {
          CKACE_MODULE_ROUTING_STATE: JSON.stringify({
            LEAVE_READ: "NEW",
            LEAVE_WRITE: "NEW",
          }),
        },
        "production",
      ),
    ).toThrow(/explicit bounded cutover module/);

    const config = readModuleRoutingConfig(
      {
        CKACE_PRODUCTION_CUTOVER_MODULE: "LEAVE",
        CKACE_MODULE_ROUTING_STATE: JSON.stringify({
          LEAVE_READ: "NEW",
          LEAVE_WRITE: "NEW",
        }),
      },
      "production",
    );
    expect(config.state.LEAVE_READ).toBe("NEW");
    expect(config.state.LEAVE_WRITE).toBe("NEW");
    expect(config.state.OT_READ).toBe("LEGACY");
  });

  it("rejects invalid or broader Production NEW authority", () => {
    expect(() =>
      readModuleRoutingConfig(
        {
          CKACE_PRODUCTION_CUTOVER_MODULE: "MAGIC",
        },
        "production",
      ),
    ).toThrow(/Unknown Production cutover module/);

    expect(() =>
      readModuleRoutingConfig(
        {
          CKACE_PRODUCTION_CUTOVER_MODULE: "LEAVE",
          CKACE_MODULE_ROUTING_STATE: JSON.stringify({
            LEAVE_READ: "NEW",
            LEAVE_WRITE: "NEW",
            OT_READ: "NEW",
            OT_WRITE: "NEW",
          }),
        },
        "production",
      ),
    ).toThrow(/only paired NEW authority/);

    expect(() =>
      readModuleRoutingConfig(
        {
          CKACE_PRODUCTION_CUTOVER_MODULE: "LEAVE",
        },
        "production",
      ),
    ).toThrow(/only paired NEW authority/);
  });

  it("parses bounded module write-freeze state and rejects unknown modules", () => {
    const config = readModuleRoutingConfig(
      {
        CKACE_MODULE_WRITE_FREEZE: "leave, time_correction,LEAVE",
      },
      "dev",
    );
    expect(config.frozenWriteModules).toEqual([
      "LEAVE",
      "TIME_CORRECTION",
    ]);

    expect(() =>
      readModuleRoutingConfig(
        {
          CKACE_MODULE_WRITE_FREEZE: "LEAVE,MAGIC",
        },
        "dev",
      ),
    ).toThrow(/Unknown module write-freeze key/);
  });

  it("freezes every user module in system-wide read-only mode", () => {
    const config = readModuleRoutingConfig(
      { CKACE_SYSTEM_WRITE_MODE: "READ_ONLY" },
      "test",
    );

    expect(config.systemWriteMode).toBe("READ_ONLY");
    expect(config.frozenWriteModules).toEqual(HR_MODULE_KEYS);
    expect(config.state).toEqual(LEGACY_ONLY_ROUTING);
  });
});
