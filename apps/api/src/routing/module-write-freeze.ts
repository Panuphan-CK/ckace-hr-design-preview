import { ServiceUnavailableException } from "@nestjs/common";

import type { SecurityRequest } from "../security/security-request";

export function assertModuleWriteAllowed(
  request: SecurityRequest,
): void {
  const route = request.moduleRouting;

  if (route?.access === "WRITE" && request.systemReadOnly) {
    throw new ServiceUnavailableException({
      code: "SYSTEM_READ_ONLY",
      retryable: false,
    });
  }

  if (!route?.writeFrozen) {
    return;
  }

  throw new ServiceUnavailableException({
    code: "MODULE_WRITE_FROZEN",
    module: route.module,
    retryable: false,
  });
}
