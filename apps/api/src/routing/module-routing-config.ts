import {
  HR_MODULE_KEYS,
  LEGACY_ONLY_ROUTING,
  MODULE_ROUTE_DEFINITIONS,
  MODULE_ROUTE_KEYS,
  type AuthorityTarget,
  type HrModuleKey,
  type ModuleRouteKey,
  type ModuleRoutingState,
} from "@ckace/contracts";

import type { RuntimeStage } from "../runtime/runtime-config";
import { readSystemWriteMode, type SystemWriteMode } from "../runtime/system-write-mode";

export interface ModuleRoutingConfig {
  readonly state: ModuleRoutingState;
  readonly frozenWriteModules: readonly HrModuleKey[];
  readonly systemWriteMode: SystemWriteMode;
}

export type ModuleRoutingMode = "LEGACY" | "NEW" | "MIXED";

export function summarizeModuleRoutingState(
  state: ModuleRoutingState,
): ModuleRoutingMode {
  const authorities = new Set(Object.values(state));
  if (authorities.size !== 1) return "MIXED";
  return authorities.values().next().value === "NEW" ? "NEW" : "LEGACY";
}

function isAuthorityTarget(value: unknown): value is AuthorityTarget {
  return value === "LEGACY" || value === "NEW";
}

function readRoutingState(
  env: NodeJS.ProcessEnv,
  stage: RuntimeStage,
): ModuleRoutingState {
  const raw = env.CKACE_MODULE_ROUTING_STATE?.trim();
  const state: Record<ModuleRouteKey, AuthorityTarget> = {
    ...LEGACY_ONLY_ROUTING,
  };

  if (raw) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(
        "CKACE_MODULE_ROUTING_STATE must be valid JSON.",
      );
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(
        "CKACE_MODULE_ROUTING_STATE must be a JSON object.",
      );
    }

    for (const [key, value] of Object.entries(parsed)) {
      if (!MODULE_ROUTE_KEYS.includes(key as ModuleRouteKey)) {
        throw new Error(
          `Unknown module route key: ${key}.`,
        );
      }

      if (!isAuthorityTarget(value)) {
        throw new Error(
          `Module route ${key} must be LEGACY or NEW.`,
        );
      }

      state[key as ModuleRouteKey] = value;
    }
  }

  for (const moduleKey of HR_MODULE_KEYS) {
    const readKey = `${moduleKey}_READ` as ModuleRouteKey;
    const writeKey = `${moduleKey}_WRITE` as ModuleRouteKey;

    if (state[readKey] !== state[writeKey]) {
      throw new Error(
        `Module ${moduleKey} must switch READ and WRITE authority together.`,
      );
    }
  }

  if (stage === "production") {
    const productionCutoverModule =
      env.CKACE_PRODUCTION_CUTOVER_MODULE?.trim().toUpperCase() ?? "";
    const newRoutes = MODULE_ROUTE_KEYS.filter(
      (routeKey) => state[routeKey] === "NEW",
    );

    if (productionCutoverModule) {
      throw new Error(
        "CKACE_PRODUCTION_CUTOVER_MODULE is unsupported; Production routing must switch the full system together.",
      );
    }

    if (newRoutes.length !== 0 && newRoutes.length !== MODULE_ROUTE_KEYS.length) {
      throw new Error(
        "Production module routing must be all LEGACY or all NEW; mixed authority is not allowed.",
      );
    }
  }

  return Object.freeze(state);
}

function readWriteFreeze(
  env: NodeJS.ProcessEnv,
): readonly HrModuleKey[] {
  const raw = env.CKACE_MODULE_WRITE_FREEZE?.trim();
  if (!raw) {
    return Object.freeze([]);
  }

  const modules = raw
    .split(",")
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean);

  const unique = new Set<HrModuleKey>();
  for (const moduleKey of modules) {
    if (!HR_MODULE_KEYS.includes(moduleKey as HrModuleKey)) {
      throw new Error(
        `Unknown module write-freeze key: ${moduleKey}.`,
      );
    }
    unique.add(moduleKey as HrModuleKey);
  }

  return Object.freeze([...unique]);
}

export function readModuleRoutingConfig(
  env: NodeJS.ProcessEnv,
  stage: RuntimeStage,
): ModuleRoutingConfig {
  const state = readRoutingState(env, stage);
  const systemWriteMode = readSystemWriteMode(env);
  const configuredFreeze = readWriteFreeze(env);
  const frozenWriteModules = Object.freeze(
    systemWriteMode === "READ_ONLY"
      ? [...new Set([...HR_MODULE_KEYS, ...configuredFreeze])]
      : [...configuredFreeze],
  );

  for (const routeKey of MODULE_ROUTE_KEYS) {
    const definition = MODULE_ROUTE_DEFINITIONS[routeKey];
    if (!definition) {
      throw new Error(
        `Missing module route definition for ${routeKey}.`,
      );
    }
  }

  return Object.freeze({
    state,
    frozenWriteModules,
    systemWriteMode,
  });
}
