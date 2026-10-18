import type {
  AttachmentPrivacyClass,
  AttachmentUploadIntentInput,
} from "@ckace/contracts";
import type { PrivateAttachmentDescriptor } from "@ckace/storage";
import type { PrismaClient } from "@prisma/client";

export interface AttachmentAccessRecord {
  readonly descriptor: PrivateAttachmentDescriptor;
  readonly finalizedAt: Date | null;
  readonly linked: boolean;
  readonly medicalRelationAuthorized: boolean;
}

export interface AttachmentRepository {
  createMetadata(
    actorEmployeeId: string,
    input: AttachmentUploadIntentInput,
  ): Promise<string>;
  assignStorageKey(
    attachmentId: string,
    actorEmployeeId: string,
    storageKey: string,
  ): Promise<void>;
  getForAccess(
    attachmentId: string,
    actorEmployeeId: string,
  ): Promise<AttachmentAccessRecord>;
  markFinalized(
    attachmentId: string,
    actorEmployeeId: string,
  ): Promise<void>;
  deletePendingMetadata(
    attachmentId: string,
    actorEmployeeId: string,
  ): Promise<void>;
  deleteUnlinkedMetadata(
    attachmentId: string,
    actorEmployeeId: string,
  ): Promise<void>;
}

async function assertActive(
  prisma: Pick<PrismaClient, "employee">,
  employeeId: string,
): Promise<void> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { userAccount: { select: { state: true } } },
  });
  if (!employee?.userAccount || employee.userAccount.state !== "ACTIVE") {
    throw new Error("Active employee account is required");
  }
}

export class PrismaAttachmentRepository implements AttachmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createMetadata(
    actorEmployeeId: string,
    input: AttachmentUploadIntentInput,
  ): Promise<string> {
    await assertActive(this.prisma, actorEmployeeId);
    const row = await this.prisma.attachment.create({
      data: {
        ownerEmployeeId: actorEmployeeId,
        privacyClass: input.privacyClass,
        storageProvider: "R2",
        storageKey: null,
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
        sizeBytes: BigInt(input.sizeBytes),
        checksumSha256: input.checksumSha256.toLowerCase(),
        finalizedAt: null,
      },
      select: { id: true },
    });
    return row.id;
  }

  async assignStorageKey(
    attachmentId: string,
    actorEmployeeId: string,
    storageKey: string,
  ): Promise<void> {
    await assertActive(this.prisma, actorEmployeeId);
    const result = await this.prisma.attachment.updateMany({
      where: {
        id: attachmentId,
        ownerEmployeeId: actorEmployeeId,
        finalizedAt: null,
        storageKey: null,
      },
      data: { storageKey },
    });
    if (result.count !== 1) {
      throw new Error("Attachment upload intent is unavailable");
    }
  }

  async getForAccess(
    attachmentId: string,
    actorEmployeeId: string,
  ): Promise<AttachmentAccessRecord> {
    await assertActive(this.prisma, actorEmployeeId);
    const row = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      select: {
        id: true,
        ownerEmployeeId: true,
        privacyClass: true,
        storageProvider: true,
        storageKey: true,
        originalFilename: true,
        mimeType: true,
        sizeBytes: true,
        checksumSha256: true,
        finalizedAt: true,
        leaveLink: { select: { attachmentId: true } },
        overtimeLink: { select: { attachmentId: true } },
        announcementLink: { select: { attachmentId: true } },
        employeeMedia: { select: { id: true } },
        medicalLink: {
          select: {
            attachmentId: true,
            medicalClaim: {
              select: {
                employeeId: true,
                approvalInstance: {
                  select: {
                    currentStepOrder: true,
                    steps: {
                      where: {
                        OR: [
                          { approverEmployeeId: actorEmployeeId },
                          { coApproverEmployeeIds: { has: actorEmployeeId } },
                        ],
                        status: "PENDING",
                      },
                      select: { stepOrder: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!row || row.storageProvider !== "R2" || !row.storageKey) {
      throw new Error("Attachment is unavailable");
    }

    const linked = Boolean(
      row.leaveLink ||
      row.overtimeLink ||
      row.medicalLink ||
      row.announcementLink ||
      row.employeeMedia,
    );
    const medicalRelationAuthorized =
      row.ownerEmployeeId === actorEmployeeId ||
      Boolean(
        row.medicalLink?.medicalClaim.approvalInstance?.steps.some(
          (step) =>
            step.stepOrder ===
            row.medicalLink?.medicalClaim.approvalInstance?.currentStepOrder,
        ),
      );

    if (
      row.privacyClass === "MEDICAL_PRIVATE" &&
      row.ownerEmployeeId !== actorEmployeeId &&
      !medicalRelationAuthorized
    ) {
      throw new Error("Medical attachment is not assigned to this actor");
    }

    return {
      descriptor: {
        id: row.id,
        ownerEmployeeId: row.ownerEmployeeId,
        privacyClass: row.privacyClass as AttachmentPrivacyClass,
        storageProvider: "R2",
        storageKey: row.storageKey,
        originalFilename: row.originalFilename,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        checksumSha256: row.checksumSha256,
      },
      finalizedAt: row.finalizedAt,
      linked,
      medicalRelationAuthorized,
    };
  }

  async markFinalized(
    attachmentId: string,
    actorEmployeeId: string,
  ): Promise<void> {
    await assertActive(this.prisma, actorEmployeeId);
    const result = await this.prisma.attachment.updateMany({
      where: {
        id: attachmentId,
        ownerEmployeeId: actorEmployeeId,
        finalizedAt: null,
        storageKey: { not: null },
      },
      data: { finalizedAt: new Date() },
    });
    if (result.count !== 1) {
      throw new Error("Attachment cannot be finalized");
    }
  }

  async deletePendingMetadata(
    attachmentId: string,
    actorEmployeeId: string,
  ): Promise<void> {
    await assertActive(this.prisma, actorEmployeeId);
    await this.prisma.attachment.deleteMany({
      where: {
        id: attachmentId,
        ownerEmployeeId: actorEmployeeId,
        finalizedAt: null,
        leaveLink: null,
        overtimeLink: null,
        medicalLink: null,
        announcementLink: null,
        employeeMedia: null,
      },
    });
  }

  async deleteUnlinkedMetadata(
    attachmentId: string,
    actorEmployeeId: string,
  ): Promise<void> {
    const record = await this.getForAccess(attachmentId, actorEmployeeId);
    if (record.linked) {
      throw new Error("Linked attachment cannot be deleted directly");
    }
    await this.prisma.attachment.delete({ where: { id: attachmentId } });
  }
}
