import type {
  ApprovalHistoryOverview,
  RequestStatusOverview,
  UnifiedRequestKind,
} from "@ckace/contracts";
import type { RequestStatusRepository } from "@ckace/database";
import { Inject, Injectable } from "@nestjs/common";

export const REQUEST_STATUS_REPOSITORY = "CKACE_REQUEST_STATUS_REPOSITORY";

function allowedApprovalKinds(
  permissions: readonly string[],
): ReadonlySet<UnifiedRequestKind> {
  return new Set(
    [
      permissions.includes("leave.approve") ? "LEAVE" : null,
      permissions.includes("time_correction.approve")
        ? "TIME_CORRECTION"
        : null,
      permissions.includes("overtime.approve")
        ? "OVERTIME"
        : null,
      permissions.includes("medical.approve")
        ? "MEDICAL"
        : null,
    ].filter((value): value is UnifiedRequestKind => Boolean(value)),
  );
}

@Injectable()
export class RequestStatusService {
  constructor(
    @Inject(REQUEST_STATUS_REPOSITORY)
    private readonly repository: RequestStatusRepository,
  ) {}

  getSelf(employeeId: string): Promise<RequestStatusOverview> {
    return this.repository.getSelf(employeeId);
  }

  async getAssigned(
    employeeId: string,
    permissions: readonly string[],
  ): Promise<RequestStatusOverview> {
    const overview = await this.repository.getAssigned(employeeId);
    const allowedKinds = allowedApprovalKinds(permissions);

    return {
      requests: overview.requests.filter((request) =>
        allowedKinds.has(request.kind),
      ),
    };
  }

  async getApprovalHistory(
    employeeId: string,
    permissions: readonly string[],
  ): Promise<ApprovalHistoryOverview> {
    const overview = await this.repository.getApprovalHistory(employeeId);
    const allowedKinds = allowedApprovalKinds(permissions);

    return {
      decisions: overview.decisions.filter((item) =>
        allowedKinds.has(item.kind),
      ),
    };
  }
}
