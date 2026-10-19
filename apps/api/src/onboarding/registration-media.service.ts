import { createHmac, timingSafeEqual } from "node:crypto";

import type {
  AttachmentUploadIntentResult,
} from "@ckace/contracts";
import type {
  RegistrationMediaKind,
  RegistrationMediaRepository,
} from "@ckace/database";
import type { PrivateAttachmentStorageService } from "@ckace/storage";
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";

import { PRIVATE_ATTACHMENT_STORAGE } from "../attachments/attachment.service";

export const REGISTRATION_MEDIA_REPOSITORY = "CKACE_REGISTRATION_MEDIA_REPOSITORY";
export const REGISTRATION_MEDIA_SECRET = "CKACE_REGISTRATION_MEDIA_SECRET";

const TOKEN_TTL_MS = 20 * 60 * 1000;
const MAX_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const KINDS = new Set<RegistrationMediaKind>(["PROFILE", "SIGNATURE"]);

export interface RegistrationMediaUploadInput {
  readonly kind: RegistrationMediaKind;
  readonly originalFilename: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
}

function safeEqual(left: string, right: string): boolean {
  try {
    const a = Buffer.from(left, "base64url");
    const b = Buffer.from(right, "base64url");
    return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Lets a just-registered (still pending) applicant upload a profile photo and signature.
 * The only credential is a 20-minute signed token handed out by the registration response.
 */
@Injectable()
export class RegistrationMediaService {
  constructor(
    @Inject(REGISTRATION_MEDIA_REPOSITORY)
    private readonly repository: RegistrationMediaRepository,
    @Inject(PRIVATE_ATTACHMENT_STORAGE)
    private readonly storage: PrivateAttachmentStorageService,
    @Inject(REGISTRATION_MEDIA_SECRET)
    private readonly secret: string,
  ) {}

  private assertSecret(): void {
    if (Buffer.byteLength(this.secret, "utf8") < 32) {
      throw new ServiceUnavailableException("Registration upload is not configured");
    }
  }

  private sign(payload: string): string {
    return createHmac("sha256", this.secret).update("registration-media|" + payload, "utf8").digest("base64url");
  }

  /** Returns null when uploads are not configured, so registration itself still works. */
  issueToken(employeeId: string): string | null {
    if (Buffer.byteLength(this.secret, "utf8") < 32) return null;
    const payload = Buffer.from(
      JSON.stringify({ v: 1, eid: employeeId, exp: Date.now() + TOKEN_TTL_MS }),
      "utf8",
    ).toString("base64url");
    return payload + "." + this.sign(payload);
  }

  private employeeFromToken(token: string): string {
    this.assertSecret();
    const [payload, signature, extra] = token.trim().split(".");
    if (!payload || !signature || extra || !safeEqual(signature, this.sign(payload))) {
      throw new ForbiddenException("Upload link is invalid or expired");
    }
    try {
      const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
        v?: unknown;
        eid?: unknown;
        exp?: unknown;
      };
      if (
        parsed.v !== 1 ||
        typeof parsed.eid !== "string" ||
        typeof parsed.exp !== "number" ||
        parsed.exp <= Date.now() ||
        parsed.exp > Date.now() + TOKEN_TTL_MS + 60_000
      ) {
        throw new Error("expired");
      }
      return parsed.eid;
    } catch {
      throw new ForbiddenException("Upload link is invalid or expired");
    }
  }

  private actor(employeeId: string) {
    return {
      employeeId,
      legacyUid: null,
      roles: [],
      permissions: ["storage.attachment.self.write"],
      agencyId: null,
      departmentId: null,
      authenticatedBy: "PROJECT_B_WEB" as const,
      correlationId: "registration-media",
    };
  }

  async createUploadIntent(
    token: string,
    input: RegistrationMediaUploadInput,
  ): Promise<AttachmentUploadIntentResult> {
    const employeeId = this.employeeFromToken(token);
    if (!KINDS.has(input.kind)) throw new BadRequestException("Invalid kind");
    if (!IMAGE_TYPES.has(input.mimeType)) {
      throw new BadRequestException("Only JPEG, PNG or WebP images are allowed");
    }
    if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > MAX_BYTES) {
      throw new BadRequestException("Image must be at most 2 MB");
    }
    let attachmentId: string | null = null;
    try {
      attachmentId = await this.repository.createPending(employeeId, input.kind, input);
      const intent = await this.storage.createUploadIntent(this.actor(employeeId), {
        attachmentId,
        ownerEmployeeId: employeeId,
        privacyClass: "EMPLOYEE_PRIVATE",
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        checksumSha256: input.checksumSha256,
      });
      await this.repository.assignStorageKey(attachmentId, employeeId, intent.storageKey);
      return {
        attachmentId,
        upload: {
          url: intent.grant.url,
          method: intent.grant.method,
          expiresAt: intent.grant.expiresAt.toISOString(),
          requiredHeaders: intent.grant.requiredHeaders,
        },
      };
    } catch (error) {
      if (attachmentId) await this.repository.deletePending(attachmentId, employeeId);
      throw new BadRequestException(
        error instanceof Error && /unavailable/i.test(error.message)
          ? "Registration upload is unavailable"
          : "Upload could not be prepared",
      );
    }
  }

  async finalize(
    token: string,
    attachmentId: string,
    kind: RegistrationMediaKind,
  ): Promise<{ readonly attachmentId: string; readonly finalized: true }> {
    const employeeId = this.employeeFromToken(token);
    if (!KINDS.has(kind)) throw new BadRequestException("Invalid kind");
    try {
      const descriptor = await this.repository.getDescriptor(attachmentId, employeeId);
      if (descriptor.finalizedAt) return { attachmentId, finalized: true };
      await this.storage.verifyUploadedObject(this.actor(employeeId), descriptor);
      await this.repository.finalizeAndLink(attachmentId, employeeId, kind);
      return { attachmentId, finalized: true };
    } catch {
      throw new BadRequestException("Upload could not be confirmed");
    }
  }

  /** Short-lived download link so an approver can look at an applicant's photo or signature. */
  async createAdminDownload(
    employeeId: string,
    kind: RegistrationMediaKind,
  ): Promise<{ readonly download: { readonly url: string; readonly method: string; readonly expiresAt: string; readonly requiredHeaders: Record<string, string> } }> {
    if (!KINDS.has(kind)) throw new BadRequestException("Invalid kind");
    const descriptor = await this.repository.findLinkedDescriptor(employeeId, kind);
    if (!descriptor) throw new NotFoundException("Image is unavailable");
    const grant = await this.storage.createDownloadGrant(
      { ...this.actor(employeeId), permissions: ["storage.attachment.global.read"] },
      descriptor,
    );
    return {
      download: {
        url: grant.url,
        method: grant.method,
        expiresAt: grant.expiresAt.toISOString(),
        requiredHeaders: grant.requiredHeaders,
      },
    };
  }
}
