import type {
  AdminSettingsView,
  NotificationAdminOverview,
  NotificationRetryResult,
} from "@ckace/contracts";
import type { NotificationAdminRepository } from "@ckace/database";
import {
  ConflictException,
  Inject,
  Injectable,
} from "@nestjs/common";

import { readRuntimeConfig } from "../runtime/runtime-config";
import { readModuleRoutingConfig, summarizeModuleRoutingState } from "../routing/module-routing-config";

export const NOTIFICATION_ADMIN_REPOSITORY = "CKACE_NOTIFICATION_ADMIN_REPOSITORY";

@Injectable()
export class AdminService {
  constructor(
    @Inject(NOTIFICATION_ADMIN_REPOSITORY)
    private readonly repository: NotificationAdminRepository,
  ) {}

  async notifications(
    permissions: readonly string[],
  ): Promise<NotificationAdminOverview> {
    const overview = await this.repository.list();
    return {
      ...overview,
      canRetry: permissions.includes(
        "notifications.admin.retry",
      ),
    };
  }

  async retryNotification(
    id: string,
    actorEmployeeId: string,
  ): Promise<NotificationRetryResult> {
    try {
      return await this.repository.retry(
        id,
        actorEmployeeId,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message ===
          "Only FAILED notification can be retried"
      ) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  settings(): AdminSettingsView {
    const runtime = readRuntimeConfig();
    const routing = readModuleRoutingConfig(process.env, runtime.stage);
    return {
      runtimeStage: runtime.stage,
      moduleRouting: summarizeModuleRoutingState(routing.state),
      storageProvider: "R2",
      permanentPublicStorageUrls: false,
      protectedActorRequiresActiveAccount: true,
      pendingLineBindingSupported: true,
    };
  }
}
