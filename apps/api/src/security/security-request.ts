import type {
  AuthorizationTarget,
  ServerModuleRouteContext,
} from "@ckace/contracts";
import type { InternalActorContext } from "@ckace/auth";

export interface SecurityRequest {
  method?: string;
  actor?: InternalActorContext;
  authorizationTarget?: AuthorizationTarget;
  correlationId?: string;
  moduleRouting?: ServerModuleRouteContext;
  systemReadOnly?: boolean;
}
