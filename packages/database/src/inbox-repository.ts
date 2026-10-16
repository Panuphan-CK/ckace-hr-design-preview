import type { InboxOverview } from "@ckace/contracts";
import type { PrismaClient } from "@prisma/client";

export interface InboxRepository {
  overview(employeeId: string, limit?: number): Promise<InboxOverview>;
  /** Marks the given notifications (or all when ids is null) as read; returns how many changed. */
  markRead(employeeId: string, ids: readonly string[] | null): Promise<number>;
}

export class PrismaInboxRepository implements InboxRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async overview(employeeId: string, limit = 50): Promise<InboxOverview> {
    const [rows, unread] = await Promise.all([
      this.prisma.inAppNotification.findMany({
        where: { employeeId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: Math.min(Math.max(limit, 1), 100),
      }),
      this.prisma.inAppNotification.count({ where: { employeeId, readAt: null } }),
    ]);

    return {
      unread,
      items: rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        title: row.title,
        body: row.body,
        requestNo: row.requestNo,
        aggregateType: row.aggregateType,
        aggregateId: row.aggregateId,
        createdAt: row.createdAt.toISOString(),
        read: row.readAt !== null,
      })),
    };
  }

  async markRead(employeeId: string, ids: readonly string[] | null): Promise<number> {
    const result = await this.prisma.inAppNotification.updateMany({
      where: { employeeId, readAt: null, ...(ids ? { id: { in: [...ids] } } : {}) },
      data: { readAt: new Date() },
    });

    return result.count;
  }
}
