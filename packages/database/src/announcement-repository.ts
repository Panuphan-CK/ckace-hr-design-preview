import type {
  AnnouncementAdminItem,
  AnnouncementAdminListResult,
  AnnouncementCreateInput,
  AnnouncementListResult,
  AnnouncementView,
} from "@ckace/contracts";
import type { PrivateAttachmentDescriptor } from "@ckace/storage";
import type { PrismaClient } from "@prisma/client";

export interface AnnouncementActorScope {
  readonly employeeId: string;
  readonly agencyId: string | null;
  readonly departmentId: string | null;
}

export interface AnnouncementRepository {
  listVisible(actor: AnnouncementActorScope): Promise<AnnouncementListResult>;
  listAdmin(
    actor: AnnouncementActorScope,
  ): Promise<AnnouncementAdminListResult>;
  create(
    actor: AnnouncementActorScope,
    input: AnnouncementCreateInput,
  ): Promise<AnnouncementView>;
  update(
    actor: AnnouncementActorScope,
    announcementId: string,
    input: AnnouncementCreateInput,
  ): Promise<AnnouncementView>;
  delete(
    actor: AnnouncementActorScope,
    announcementId: string,
  ): Promise<void>;
  getVisibleAttachment(
    actor: AnnouncementActorScope,
    announcementId: string,
    attachmentId: string,
  ): Promise<PrivateAttachmentDescriptor>;
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

function toView(row: {
  id: string;
  title: string | null;
  content: string;
  scope: "GLOBAL" | "AGENCY" | "DEPARTMENT";
  publishedAt: Date | null;
  attachments: readonly { attachmentId: string }[];
}): AnnouncementView {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    scope: row.scope,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    hasAttachment: row.attachments.length > 0,
    attachmentIds: row.attachments.map((attachment) => attachment.attachmentId),
  };
}

function toAdminView(row: {
  id: string;
  title: string | null;
  content: string;
  scope: "GLOBAL" | "AGENCY" | "DEPARTMENT";
  agencyId: string | null;
  departmentId: string | null;
  agency: { name: string } | null;
  department: { name: string } | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  attachments: readonly { attachmentId: string }[];
}): AnnouncementAdminItem {
  return {
    ...toView(row),
    agencyId: row.agencyId,
    agencyName: row.agency?.name ?? null,
    departmentId: row.departmentId,
    departmentName: row.department?.name ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PrismaAnnouncementRepository implements AnnouncementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listVisible(actor: AnnouncementActorScope): Promise<AnnouncementListResult> {
    await assertActive(this.prisma, actor.employeeId);
    const now = new Date();
    const visibility = [
      { scope: "GLOBAL" as const },
      ...(actor.agencyId
        ? [{ scope: "AGENCY" as const, agencyId: actor.agencyId }]
        : []),
      ...(actor.departmentId
        ? [{ scope: "DEPARTMENT" as const, departmentId: actor.departmentId }]
        : []),
    ];
    const rows = await this.prisma.announcement.findMany({
      where: {
        publishedAt: { not: null, lte: now },
        OR: visibility,
      },
      select: {
        id: true,
        title: true,
        content: true,
        scope: true,
        publishedAt: true,
        attachments: { select: { attachmentId: true } },
      },
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
    });
    return {
      dataStatus: "AVAILABLE",
      announcements: rows.map(toView),
    };
  }

  async listAdmin(
    actor: AnnouncementActorScope,
  ): Promise<AnnouncementAdminListResult> {
    await assertActive(this.prisma, actor.employeeId);
    const [rows, agencies, departments] = await Promise.all([
      this.prisma.announcement.findMany({
        select: {
          id: true,
          title: true,
          content: true,
          scope: true,
          agencyId: true,
          departmentId: true,
          agency: { select: { name: true } },
          department: { select: { name: true } },
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          attachments: { select: { attachmentId: true } },
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: 2000,
      }),
      this.prisma.agency.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
      this.prisma.department.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      }),
    ]);
    return {
      announcements: rows.map(toAdminView),
      agencies,
      departments,
    };
  }

  async create(
    actor: AnnouncementActorScope,
    input: AnnouncementCreateInput,
  ): Promise<AnnouncementView> {
    await assertActive(this.prisma, actor.employeeId);
    const content = input.content.trim();
    if (!content || content.length > 5000) {
      throw new Error("Announcement content must be 1-5000 characters");
    }
    const title = input.title?.trim() || null;
    if (title && title.length > 250) {
      throw new Error("Announcement title must be at most 250 characters");
    }
    const agencyId = input.scope === "AGENCY" ? input.agencyId ?? null : null;
    const departmentId =
      input.scope === "DEPARTMENT" ? input.departmentId ?? null : null;
    if (input.scope === "AGENCY" && !agencyId) {
      throw new Error("Agency announcement requires agencyId");
    }
    if (input.scope === "DEPARTMENT" && !departmentId) {
      throw new Error("Department announcement requires departmentId");
    }
    const attachmentIds = [...new Set(input.attachmentIds ?? [])];
    if (attachmentIds.length > 10) {
      throw new Error("Announcement supports at most 10 attachments");
    }

    return this.prisma.$transaction(async (tx) => {
      if (attachmentIds.length > 0) {
        const attachments = await tx.attachment.findMany({
          where: {
            id: { in: attachmentIds },
            ownerEmployeeId: actor.employeeId,
            privacyClass: "INTERNAL",
            storageProvider: "R2",
            finalizedAt: { not: null },
            announcementLink: null,
            leaveLink: null,
            overtimeLink: null,
            medicalLink: null,
            employeeMedia: null,
          },
          select: { id: true },
        });
        if (attachments.length !== attachmentIds.length) {
          throw new Error("Announcement attachment is unavailable or already linked");
        }
      }

      const row = await tx.announcement.create({
        data: {
          title,
          content,
          scope: input.scope,
          ...(agencyId ? { agency: { connect: { id: agencyId } } } : {}),
          ...(departmentId ? { department: { connect: { id: departmentId } } } : {}),
          publishedAt: input.publishNow === false ? null : new Date(),
          ...(attachmentIds.length > 0
            ? {
                attachments: {
                  create: attachmentIds.map((attachmentId) => ({ attachmentId })),
                },
              }
            : {}),
        },
        select: {
          id: true,
          title: true,
          content: true,
          scope: true,
          publishedAt: true,
          attachments: { select: { attachmentId: true } },
        },
      });
      await tx.auditLog.create({
        data: {
          actorEmployeeId: actor.employeeId,
          action: "ANNOUNCEMENT_CREATED",
          entityType: "Announcement",
          entityId: row.id,
          metadata: { scope: input.scope, attachmentCount: attachmentIds.length },
        },
      });
      return toView(row);
    });
  }

  async update(
    actor: AnnouncementActorScope,
    announcementId: string,
    input: AnnouncementCreateInput,
  ): Promise<AnnouncementView> {
    await assertActive(this.prisma, actor.employeeId);
    const content = input.content.trim();
    if (!content || content.length > 5000) {
      throw new Error("Announcement content must be 1-5000 characters");
    }
    const title = input.title?.trim() || null;
    if (title && title.length > 250) {
      throw new Error("Announcement title must be at most 250 characters");
    }
    const agencyId =
      input.scope === "AGENCY" ? input.agencyId ?? null : null;
    const departmentId =
      input.scope === "DEPARTMENT"
        ? input.departmentId ?? null
        : null;
    if (input.scope === "AGENCY" && !agencyId) {
      throw new Error("Agency announcement requires agencyId");
    }
    if (input.scope === "DEPARTMENT" && !departmentId) {
      throw new Error("Department announcement requires departmentId");
    }
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.announcement.findUnique({
        where: { id: announcementId },
        select: { id: true, publishedAt: true },
      });
      if (!current) throw new Error("Announcement was not found");
      const row = await tx.announcement.update({
        where: { id: announcementId },
        data: {
          title,
          content,
          scope: input.scope,
          agencyId,
          departmentId,
          publishedAt:
            input.publishNow === false
              ? null
              : current.publishedAt ?? new Date(),
        },
        select: {
          id: true,
          title: true,
          content: true,
          scope: true,
          publishedAt: true,
          attachments: { select: { attachmentId: true } },
        },
      });
      await tx.auditLog.create({
        data: {
          actorEmployeeId: actor.employeeId,
          action: "ANNOUNCEMENT_UPDATED",
          entityType: "Announcement",
          entityId: announcementId,
          metadata: { scope: input.scope },
        },
      });
      return toView(row);
    });
  }

  async delete(
    actor: AnnouncementActorScope,
    announcementId: string,
  ): Promise<void> {
    await assertActive(this.prisma, actor.employeeId);
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.announcement.findUnique({
        where: { id: announcementId },
        select: {
          id: true,
          _count: { select: { attachments: true } },
        },
      });
      if (!row) throw new Error("Announcement was not found");
      if (row._count.attachments > 0) {
        throw new Error(
          "Announcement with attachments must be unpublished instead of deleted",
        );
      }
      await tx.announcement.delete({
        where: { id: announcementId },
      });
      await tx.auditLog.create({
        data: {
          actorEmployeeId: actor.employeeId,
          action: "ANNOUNCEMENT_DELETED",
          entityType: "Announcement",
          entityId: announcementId,
        },
      });
    });
  }

  async getVisibleAttachment(
    actor: AnnouncementActorScope,
    announcementId: string,
    attachmentId: string,
  ): Promise<PrivateAttachmentDescriptor> {
    await assertActive(this.prisma, actor.employeeId);
    const visibility = [
      { scope: "GLOBAL" as const },
      ...(actor.agencyId
        ? [{ scope: "AGENCY" as const, agencyId: actor.agencyId }]
        : []),
      ...(actor.departmentId
        ? [{ scope: "DEPARTMENT" as const, departmentId: actor.departmentId }]
        : []),
    ];
    const announcement = await this.prisma.announcement.findFirst({
      where: {
        id: announcementId,
        publishedAt: { not: null, lte: new Date() },
        OR: visibility,
      },
      select: {
        attachments: {
          where: { attachmentId },
          select: {
            attachment: {
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
              },
            },
          },
        },
      },
    });
    const row = announcement?.attachments[0]?.attachment;
    if (
      !row ||
      row.privacyClass !== "INTERNAL" ||
      row.storageProvider !== "R2" ||
      !row.storageKey ||
      !row.finalizedAt
    ) {
      throw new Error("Announcement attachment is unavailable");
    }
    return {
      id: row.id,
      ownerEmployeeId: row.ownerEmployeeId,
      privacyClass: "INTERNAL",
      storageProvider: "R2",
      storageKey: row.storageKey,
      originalFilename: row.originalFilename,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      checksumSha256: row.checksumSha256,
    };
  }
}
