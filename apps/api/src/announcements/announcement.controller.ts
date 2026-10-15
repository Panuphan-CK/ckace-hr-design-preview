import type {
  AnnouncementAdminListResult,
  AnnouncementCreateInput,
  AnnouncementCreateResult,
  AnnouncementListResult,
  AnnouncementScope,
  AnnouncementUpdateResult,
  AnnouncementDeleteResult,
  AttachmentDownloadResult,
} from "@ckace/contracts";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import { ModuleRoute } from "../routing/module-route.decorator";
import { AuthorizationGuard } from "../security/authorization.guard";
import { RequirePermission } from "../security/require-permission.decorator";
import type { SecurityRequest } from "../security/security-request";
import { AnnouncementService } from "./announcement.service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseUuid(value: string, label: string): string {
  if (!UUID.test(value)) throw new BadRequestException(`Invalid ${label}`);
  return value;
}

function parseCreate(body: unknown): AnnouncementCreateInput {
  if (!body || typeof body !== "object") throw new BadRequestException("Body is required");
  const value = body as Record<string, unknown>;
  const scope = value.scope;
  if (scope !== "GLOBAL" && scope !== "AGENCY" && scope !== "DEPARTMENT") {
    throw new BadRequestException("Invalid announcement scope");
  }
  const content = typeof value.content === "string" ? value.content.trim() : "";
  if (!content || content.length > 5000) {
    throw new BadRequestException(
      "Announcement content must be 1-5000 characters",
    );
  }
  const attachmentIds = Array.isArray(value.attachmentIds)
    ? value.attachmentIds.map((entry) => String(entry).trim())
    : [];
  if (attachmentIds.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {
    throw new BadRequestException("Invalid attachmentId");
  }
  const readOptional = (name: string): string | null | undefined => {
    if (!(name in value)) return undefined;
    if (value[name] === null) return null;
    if (typeof value[name] !== "string") throw new BadRequestException(`Invalid ${name}`);
    const normalized = value[name].trim();
    return normalized || null;
  };
  const title = readOptional("title");
  const agencyId = readOptional("agencyId");
  const departmentId = readOptional("departmentId");
  if (title && title.length > 250) {
    throw new BadRequestException(
      "Announcement title must be at most 250 characters",
    );
  }
  if (agencyId && !UUID.test(agencyId)) {
    throw new BadRequestException("Invalid agencyId");
  }
  if (departmentId && !UUID.test(departmentId)) {
    throw new BadRequestException("Invalid departmentId");
  }
  return {
    ...(title !== undefined ? { title } : {}),
    content,
    scope: scope as AnnouncementScope,
    ...(agencyId !== undefined ? { agencyId } : {}),
    ...(departmentId !== undefined ? { departmentId } : {}),
    attachmentIds,
    publishNow: value.publishNow === false ? false : true,
  };
}

function parseUpdate(body: unknown): AnnouncementCreateInput {
  if (
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    Object.prototype.hasOwnProperty.call(body, "attachmentIds")
  ) {
    throw new BadRequestException(
      "Announcement attachments cannot be changed by update",
    );
  }
  return parseCreate(body);
}

@Controller("announcements")
@UseGuards(AuthorizationGuard)
export class AnnouncementController {
  constructor(@Inject(AnnouncementService) private readonly service: AnnouncementService) {}

  @Get()
  @ModuleRoute("ANNOUNCEMENTS_READ")
  @RequirePermission("announcements.read", "GLOBAL")
  list(@Req() request: SecurityRequest): Promise<AnnouncementListResult> {
    if (!request.actor) throw new UnauthorizedException();
    return this.service.list({
      employeeId: request.actor.employeeId,
      agencyId: request.actor.agencyId,
      departmentId: request.actor.departmentId,
    });
  }

  @Get("admin")
  @ModuleRoute("ANNOUNCEMENTS_READ")
  @RequirePermission("announcements.admin.write", "GLOBAL")
  adminList(
    @Req() request: SecurityRequest,
  ): Promise<AnnouncementAdminListResult> {
    if (!request.actor) throw new UnauthorizedException();
    return this.service.adminList({
      employeeId: request.actor.employeeId,
      agencyId: request.actor.agencyId,
      departmentId: request.actor.departmentId,
    });
  }

  @Post()
  @ModuleRoute("ANNOUNCEMENTS_WRITE")
  @RequirePermission("announcements.admin.write", "GLOBAL")
  create(
    @Req() request: SecurityRequest,
    @Body() body: unknown,
  ): Promise<AnnouncementCreateResult> {
    if (!request.actor) throw new UnauthorizedException();
    return this.service.create(
      {
        employeeId: request.actor.employeeId,
        agencyId: request.actor.agencyId,
        departmentId: request.actor.departmentId,
      },
      parseCreate(body),
    );
  }

  @Patch(":announcementId")
  @ModuleRoute("ANNOUNCEMENTS_WRITE")
  @RequirePermission("announcements.admin.write", "GLOBAL")
  update(
    @Req() request: SecurityRequest,
    @Param("announcementId") announcementId: string,
    @Body() body: unknown,
  ): Promise<AnnouncementUpdateResult> {
    if (!request.actor) throw new UnauthorizedException();
    return this.service.update(
      {
        employeeId: request.actor.employeeId,
        agencyId: request.actor.agencyId,
        departmentId: request.actor.departmentId,
      },
      parseUuid(announcementId, "announcement ID"),
      parseUpdate(body),
    );
  }

  @Delete(":announcementId")
  @ModuleRoute("ANNOUNCEMENTS_WRITE")
  @RequirePermission("announcements.admin.delete", "GLOBAL")
  delete(
    @Req() request: SecurityRequest,
    @Param("announcementId") announcementId: string,
  ): Promise<AnnouncementDeleteResult> {
    if (!request.actor) throw new UnauthorizedException();
    return this.service.delete(
      {
        employeeId: request.actor.employeeId,
        agencyId: request.actor.agencyId,
        departmentId: request.actor.departmentId,
      },
      parseUuid(announcementId, "announcement ID"),
    );
  }

  @Post(":announcementId/attachments/:attachmentId/download")
  @ModuleRoute("ANNOUNCEMENTS_READ")
  @RequirePermission("announcements.read", "GLOBAL")
  downloadAttachment(
    @Req() request: SecurityRequest,
    @Param("announcementId") announcementId: string,
    @Param("attachmentId") attachmentId: string,
  ): Promise<AttachmentDownloadResult> {
    if (!request.actor) throw new UnauthorizedException();
    return this.service.downloadAttachment(
      {
        employeeId: request.actor.employeeId,
        agencyId: request.actor.agencyId,
        departmentId: request.actor.departmentId,
      },
      parseUuid(announcementId, "announcement ID"),
      parseUuid(attachmentId, "attachment ID"),
    );
  }
}
