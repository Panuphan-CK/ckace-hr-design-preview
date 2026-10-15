import type {
  Prisma,
  PrismaClient,
} from "@prisma/client";

import type {
  AuditEvent,
  AuditSink,
} from "@ckace/auth";

export class PrismaAuditSink implements AuditSink {
  constructor(
    private readonly prisma: PrismaClient,
  ) {}

  async record(event: AuditEvent): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorEmployeeId: event.actorEmployeeId,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        correlationId: event.correlationId,
        occurredAt: event.occurredAt,
        ...(event.metadata
          ? {
              metadata:
                event.metadata as Prisma.InputJsonValue,
            }
          : {}),
      },
    });
  }
}
