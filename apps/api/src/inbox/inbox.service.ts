import type { InboxOverview } from "@ckace/contracts";
import type { InboxRepository } from "@ckace/database";
import { BadRequestException, Inject, Injectable } from "@nestjs/common";

export const INBOX_REPOSITORY = "CKACE_INBOX_REPOSITORY";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class InboxService {
  constructor(
    @Inject(INBOX_REPOSITORY)
    private readonly repository: InboxRepository,
  ) {}

  overview(employeeId: string): Promise<InboxOverview> {
    return this.repository.overview(employeeId);
  }

  async markRead(employeeId: string, body: unknown): Promise<{ readonly updated: number }> {
    if (body !== undefined && body !== null && (typeof body !== "object" || Array.isArray(body))) {
      throw new BadRequestException("Inbox body is invalid");
    }

    const ids = (body as { ids?: unknown } | null | undefined)?.ids;

    if (ids === undefined || ids === null) {
      return { updated: await this.repository.markRead(employeeId, null) };
    }

    if (!Array.isArray(ids) || ids.length > 100 || ids.some((id) => typeof id !== "string" || !UUID.test(id))) {
      throw new BadRequestException("ids must be a list of up to 100 notification IDs");
    }

    return { updated: await this.repository.markRead(employeeId, ids as string[]) };
  }
}
