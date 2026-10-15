import type {
  AttachmentPrivacyClass,
  AttachmentUploadIntentInput,
} from "@ckace/contracts";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Inject,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import { ModuleRoute } from "../routing/module-route.decorator";
import type { SecurityRequest } from "../security/security-request";
import { AttachmentService } from "./attachment.service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseId(value: string): string {
  if (!UUID.test(value)) throw new BadRequestException("Invalid attachment ID");
  return value;
}

function parseUpload(body: unknown): AttachmentUploadIntentInput {
  if (!body || typeof body !== "object") throw new BadRequestException("Body is required");
  const value = body as Record<string, unknown>;
  const privacyClass = value.privacyClass;
  if (
    privacyClass !== "INTERNAL" &&
    privacyClass !== "EMPLOYEE_PRIVATE" &&
    privacyClass !== "MEDICAL_PRIVATE" &&
    privacyClass !== "ADMIN_PRIVATE"
  ) throw new BadRequestException("Invalid privacyClass");
  if (
    typeof value.originalFilename !== "string" ||
    typeof value.mimeType !== "string" ||
    typeof value.sizeBytes !== "number" ||
    typeof value.checksumSha256 !== "string"
  ) throw new BadRequestException("Invalid attachment metadata");
  return {
    privacyClass: privacyClass as AttachmentPrivacyClass,
    originalFilename: value.originalFilename,
    mimeType: value.mimeType,
    sizeBytes: value.sizeBytes,
    checksumSha256: value.checksumSha256,
  };
}

@Controller("attachments")
export class AttachmentController {
  constructor(@Inject(AttachmentService) private readonly service: AttachmentService) {}

  @Post("upload-intent")
  @ModuleRoute("ATTACHMENTS_WRITE")
  createUpload(@Req() request: SecurityRequest, @Body() body: unknown) {
    if (!request.actor) throw new UnauthorizedException();
    return this.service.createUploadIntent(request.actor, parseUpload(body));
  }

  @Post(":id/finalize")
  @ModuleRoute("ATTACHMENTS_WRITE")
  finalize(@Req() request: SecurityRequest, @Param("id") id: string) {
    if (!request.actor) throw new UnauthorizedException();
    return this.service.finalize(request.actor, parseId(id));
  }

  @Post(":id/download")
  @ModuleRoute("ATTACHMENTS_READ")
  download(@Req() request: SecurityRequest, @Param("id") id: string) {
    if (!request.actor) throw new UnauthorizedException();
    return this.service.createDownload(request.actor, parseId(id));
  }

  @Delete(":id")
  @ModuleRoute("ATTACHMENTS_WRITE")
  delete(@Req() request: SecurityRequest, @Param("id") id: string) {
    if (!request.actor) throw new UnauthorizedException();
    return this.service.delete(request.actor, parseId(id));
  }
}
