import type { BenefitsSelfOverview } from "@ckace/contracts";
import type {
  MedicalRepository,
  OvertimeRepository,
} from "@ckace/database";
import { Inject, Injectable } from "@nestjs/common";

export const BENEFITS_OVERTIME_REPOSITORY = "CKACE_BENEFITS_OVERTIME_REPOSITORY";
export const BENEFITS_MEDICAL_REPOSITORY = "CKACE_BENEFITS_MEDICAL_REPOSITORY";

@Injectable()
export class BenefitsService {
  constructor(
    @Inject(BENEFITS_OVERTIME_REPOSITORY)
    private readonly overtime: OvertimeRepository,
    @Inject(BENEFITS_MEDICAL_REPOSITORY)
    private readonly medical: MedicalRepository,
  ) {}

  async getSelfOverview(employeeId: string): Promise<BenefitsSelfOverview> {
    const [ot, medical] = await Promise.all([
      this.overtime.getSelfOverview(employeeId),
      this.medical.getSelfOverview(employeeId),
    ]);

    const requests = [
      ...ot.requests.map((request) => {
        const first = request.segments[0];
        const requestedMinutes = request.segments.reduce(
          (sum, segment) => sum + segment.requestedMinutes,
          0,
        );

        return {
          id: request.id,
          kind: "OVERTIME" as const,
          date: first?.workDate ?? request.submittedAt.slice(0, 10),
          startTime: first?.startTime ?? null,
          endTime: first?.endTime ?? null,
          value: requestedMinutes / 60,
          reason: request.reason,
          status: request.status,
          comment: request.decisionReason,
          submittedAt: request.submittedAt,
          attachments: [],
        };
      }),
      ...medical.claims.map((claim) => ({
        id: claim.id,
        kind: "MEDICAL" as const,
        date: claim.sicknessDate,
        startTime: null,
        endTime: null,
        value: claim.amount,
        reason: claim.description,
        status: claim.status,
        comment: claim.decisionReason,
        submittedAt: claim.submittedAt,
        attachments: claim.attachments.map((attachment, index) => ({
          attachmentId: attachment.attachmentId,
          label: attachment.fileName ?? `Medical attachment ${index + 1}`,
        })),
      })),
    ].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

    return {
      medicalEntitlement: medical.entitlement,
      requests,
    };
  }
}
