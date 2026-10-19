import type { PrismaClient } from "@prisma/client";

export type RegistrationMediaKind = "PROFILE" | "SIGNATURE";

export interface RegistrationMediaDescriptor {
  readonly id: string;
  readonly ownerEmployeeId: string;
  readonly privacyClass: "EMPLOYEE_PRIVATE";
  readonly storageProvider: "R2";
  readonly storageKey: string;
  readonly originalFilename: string | null;
  readonly mimeType: string | null;
  readonly sizeBytes: bigint | null;
  readonly checksumSha256: string | null;
  readonly finalizedAt: Date | null;
}

/** Profile photo / signature uploaded while the account is still waiting for approval. */
export interface RegistrationMediaRepository {
  createPending(
    employeeId: string,
    kind: RegistrationMediaKind,
    input: {
      readonly originalFilename: string;
      readonly mimeType: string;
      readonly sizeBytes: number;
      readonly checksumSha256: string;
    },
  ): Promise<string>;
  assignStorageKey(attachmentId: string, employeeId: string, storageKey: string): Promise<void>;
  getDescriptor(attachmentId: string, employeeId: string): Promise<RegistrationMediaDescriptor>;
  finalizeAndLink(attachmentId: string, employeeId: string, kind: RegistrationMediaKind): Promise<void>;
  deletePending(attachmentId: string, employeeId: string): Promise<void>;
  /** The finalized photo/signature linked to an employee, or null. For admin review. */
  findLinkedDescriptor(
    employeeId: string,
    kind: RegistrationMediaKind,
  ): Promise<RegistrationMediaDescriptor | null>;
}

const MAX_OPEN_UPLOADS = 6;

async function assertPending(
  prisma: Pick<PrismaClient, "employee">,
  employeeId: string,
): Promise<void> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { userAccount: { select: { state: true } } },
  });
  if (employee?.userAccount?.state !== "PENDING") {
    throw new Error("Registration upload is unavailable");
  }
}

export class PrismaRegistrationMediaRepository implements RegistrationMediaRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createPending(
    employeeId: string,
    kind: RegistrationMediaKind,
    input: {
      readonly originalFilename: string;
      readonly mimeType: string;
      readonly sizeBytes: number;
      readonly checksumSha256: string;
    },
  ): Promise<string> {
    await assertPending(this.prisma, employeeId);
    const existing = await this.prisma.employeeMedia.findUnique({
      where: { employeeId_kind: { employeeId, kind } },
      select: { id: true },
    });
    if (existing) throw new Error("Registration upload is unavailable");
    const open = await this.prisma.attachment.count({
      where: { ownerEmployeeId: employeeId, finalizedAt: null },
    });
    if (open >= MAX_OPEN_UPLOADS) throw new Error("Registration upload is unavailable");
    const row = await this.prisma.attachment.create({
      data: {
        ownerEmployeeId: employeeId,
        privacyClass: "EMPLOYEE_PRIVATE",
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

  async assignStorageKey(attachmentId: string, employeeId: string, storageKey: string): Promise<void> {
    await assertPending(this.prisma, employeeId);
    const result = await this.prisma.attachment.updateMany({
      where: { id: attachmentId, ownerEmployeeId: employeeId, finalizedAt: null, storageKey: null },
      data: { storageKey },
    });
    if (result.count !== 1) throw new Error("Registration upload is unavailable");
  }

  async getDescriptor(attachmentId: string, employeeId: string): Promise<RegistrationMediaDescriptor> {
    await assertPending(this.prisma, employeeId);
    const row = await this.prisma.attachment.findFirst({
      where: { id: attachmentId, ownerEmployeeId: employeeId, privacyClass: "EMPLOYEE_PRIVATE", storageProvider: "R2" },
      select: {
        id: true,
        storageKey: true,
        originalFilename: true,
        mimeType: true,
        sizeBytes: true,
        checksumSha256: true,
        finalizedAt: true,
      },
    });
    if (!row || !row.storageKey) throw new Error("Registration upload is unavailable");
    return {
      id: row.id,
      ownerEmployeeId: employeeId,
      privacyClass: "EMPLOYEE_PRIVATE",
      storageProvider: "R2",
      storageKey: row.storageKey,
      originalFilename: row.originalFilename,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      checksumSha256: row.checksumSha256,
      finalizedAt: row.finalizedAt,
    };
  }

  async finalizeAndLink(attachmentId: string, employeeId: string, kind: RegistrationMediaKind): Promise<void> {
    await assertPending(this.prisma, employeeId);
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.attachment.updateMany({
        where: { id: attachmentId, ownerEmployeeId: employeeId, finalizedAt: null, storageKey: { not: null } },
        data: { finalizedAt: new Date() },
      });
      if (result.count !== 1) throw new Error("Registration upload is unavailable");
      await tx.employeeMedia.create({ data: { employeeId, attachmentId, kind } });
    });
  }

  async deletePending(attachmentId: string, employeeId: string): Promise<void> {
    await this.prisma.attachment.deleteMany({
      where: { id: attachmentId, ownerEmployeeId: employeeId, finalizedAt: null, employeeMedia: null },
    });
  }

  async findLinkedDescriptor(
    employeeId: string,
    kind: RegistrationMediaKind,
  ): Promise<RegistrationMediaDescriptor | null> {
    const media = await this.prisma.employeeMedia.findUnique({
      where: { employeeId_kind: { employeeId, kind } },
      select: {
        attachment: {
          select: {
            id: true,
            storageKey: true,
            originalFilename: true,
            mimeType: true,
            sizeBytes: true,
            checksumSha256: true,
            finalizedAt: true,
            privacyClass: true,
            storageProvider: true,
          },
        },
      },
    });
    const row = media?.attachment;
    if (!row || !row.storageKey || !row.finalizedAt || row.storageProvider !== "R2") return null;
    return {
      id: row.id,
      ownerEmployeeId: employeeId,
      privacyClass: "EMPLOYEE_PRIVATE",
      storageProvider: "R2",
      storageKey: row.storageKey,
      originalFilename: row.originalFilename,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      checksumSha256: row.checksumSha256,
      finalizedAt: row.finalizedAt,
    };
  }
}
