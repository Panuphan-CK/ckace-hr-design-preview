import {
  MODULE_ROUTE_DEFINITIONS,
  type ModuleRouteKey,
  type ServerModuleRouteContext,
} from "@ckace/contracts";
import { Injectable } from "@nestjs/common";

import { readRuntimeConfig } from "../runtime/runtime-config";
import {
  readModuleRoutingConfig,
  summarizeModuleRoutingState,
  type ModuleRoutingMode,
} from "./module-routing-config";

@Injectable()
export class ModuleRoutingService {
  private readonly runtime = readRuntimeConfig();
  private readonly config = readModuleRoutingConfig(
    process.env,
    this.runtime.stage,
  );
  private readonly frozen = new Set(
    this.config.frozenWriteModules,
  );

  get systemReadOnly(): boolean {
    return this.config.systemWriteMode === "READ_ONLY";
  }

  get authorityMode(): ModuleRoutingMode {
    return summarizeModuleRoutingState(this.config.state);
  }

  resolve(routeKey: ModuleRouteKey): ServerModuleRouteContext {
    const definition = MODULE_ROUTE_DEFINITIONS[routeKey];

    return Object.freeze({
      routeKey,
      module: definition.module,
      access: definition.access,
      authority: this.config.state[routeKey],
      writeFrozen:
        definition.access === "WRITE" &&
        this.frozen.has(definition.module),
    });
  }
}
