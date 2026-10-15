import { randomUUID } from "node:crypto";

import type { InternalActorContext } from "./internal-actor";

export interface AuditEvent {
  readonly actorEmployeeId: string | null;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string | null;
  readonly correlationId: string;
  readonly occurredAt: Date;
  readonly metadata: Readonly<Record<string, unknown>> | null;
}

export interface AuditSink {
  record(event: AuditEvent): Promise<void>;
}

export class AuditService {
  constructor(
    private readonly sink: AuditSink,
  ) {}

  async record(input: Parameters<typeof createAuditEvent>[0]): Promise<AuditEvent> {
    const event = createAuditEvent(input);
    await this.sink.record(event);
    return event;
  }
}

export function ensureCorrelationId(
  correlationId: string | null | undefined,
): string {
  const normalized = correlationId?.trim();
  return normalized ? normalized : randomUUID();
}

export function createAuditEvent(input: {
  readonly actor?: InternalActorContext | null;
  readonly action: string;
  readonly entityType: string;
  readonly entityId?: string | null;
  readonly correlationId?: string | null;
  readonly occurredAt?: Date;
  readonly metadata?: Readonly<Record<string, unknown>> | null;
}): AuditEvent {
  return {
    actorEmployeeId: input.actor?.employeeId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    correlationId: ensureCorrelationId(
      input.correlationId ?? input.actor?.correlationId,
    ),
    occurredAt: input.occurredAt ?? new Date(),
    metadata: input.metadata ?? null,
  };
}
