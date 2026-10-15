import type {
  NotificationAdminOverview,
  NotificationRetryResult,
} from "@ckace/contracts";
import type { PrismaClient } from "@prisma/client";

export type NotificationAdminRepositoryOverview =
  Omit<NotificationAdminOverview, "canRetry">;

export interface NotificationAdminRepository {
  list(limit?: number): Promise<NotificationAdminRepositoryOverview>;
  retry(id: string, actorEmployeeId: string): Promise<NotificationRetryResult>;
}

export class PrismaNotificationAdminRepository implements NotificationAdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(
    limit = 100,
  ): Promise<NotificationAdminRepositoryOverview> {
    const rows = await this.prisma.notificationOutbox.findMany({
      take: Math.min(Math.max(limit, 1), 200),
      select: {
        id: true,
        aggregateType: true,
        aggregateId: true,
        eventType: true,
        status: true,
        attempts: true,
        lastError: true,
        availableAt: true,
        createdAt: true,
        _count: { select: { deliveries: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    return {
      notifications: rows.map((row) => ({
        id: row.id,
        aggregateType: row.aggregateType,
        aggregateId: row.aggregateId,
        eventType: row.eventType,
        status: row.status,
        attempts: row.attempts,
        lastError: row.lastError,
        availableAt: row.availableAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
        deliveryCount: row._count.deliveries,
      })),
    };
  }

  async retry(
    id: string,
    actorEmployeeId: string,
  ): Promise<NotificationRetryResult> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.notificationOutbox.updateMany({
        where: { id, status: "FAILED" },
        data: {
          status: "PENDING",
          lastError: null,
          availableAt: new Date(),
        },
      });
      if (updated.count !== 1) {
        throw new Error("Only FAILED notification can be retried");
      }
      await tx.auditLog.create({
        data: {
          actorEmployeeId,
          action: "NOTIFICATION_RETRY_REQUESTED",
          entityType: "NotificationOutbox",
          entityId: id,
        },
      });
      return { id, status: "PENDING" as const };
    });
  }
}
