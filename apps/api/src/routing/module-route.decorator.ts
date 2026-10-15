import type { ModuleRouteKey } from "@ckace/contracts";
import { SetMetadata } from "@nestjs/common";

export const MODULE_ROUTE_KEY_METADATA = "ckace.moduleRouteKey";

export function ModuleRoute(
  routeKey: ModuleRouteKey,
): MethodDecorator & ClassDecorator {
  return SetMetadata(MODULE_ROUTE_KEY_METADATA, routeKey);
}
