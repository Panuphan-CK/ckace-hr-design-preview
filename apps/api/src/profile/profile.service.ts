import type { SelfProfileResponse } from "@ckace/contracts";
import type {
  DatabaseSelfProfile,
  SelfProfileRepository,
} from "@ckace/database";
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  hashProjectPassword,
  verifyLegacyGasPassword,
  verifyProjectPassword,
} from "../onboarding/onboarding-auth";

export const SELF_PROFILE_REPOSITORY =
  "CKACE_SELF_PROFILE_REPOSITORY";

function toResponse(
  profile: DatabaseSelfProfile,
): SelfProfileResponse {
  return {
    employeeId: profile.employeeId,
    fullName: profile.fullName,
    nickname: profile.nickname,
    dateOfBirth: profile.dateOfBirth,
    employmentStart: profile.employmentStart,
    resignationDate: profile.resignationDate,
    accountState: profile.accountState,
    loginName: profile.loginName,
    agency: profile.agency,
    department: profile.department,
    roles: [...profile.roles],
    lineLinked: profile.lineLinked,
    media: {
      profile: profile.profileAttachmentId
        ? { attachmentId: profile.profileAttachmentId }
        : null,
      signature: profile.signatureAttachmentId
        ? { attachmentId: profile.signatureAttachmentId }
        : null,
    },
  };
}

@Injectable()
export class ProfileService {
  constructor(
    @Inject(SELF_PROFILE_REPOSITORY)
    private readonly repository: SelfProfileRepository,
  ) {}

  async getSelfProfile(
    employeeId: string,
  ): Promise<SelfProfileResponse> {
    const profile =
      await this.repository.findSelfProfile(employeeId);

    if (!profile) {
      throw new NotFoundException("Profile unavailable");
    }

    return toResponse(profile);
  }

  /** The employee changes their own password; the current password must be confirmed. */
  async changePassword(input: {
    readonly employeeId: string;
    readonly correlationId: string;
    readonly body: unknown;
  }): Promise<{ readonly changed: true }> {
    const source = input.body;

    if (!source || typeof source !== "object" || Array.isArray(source)) {
      throw new BadRequestException("Password change body is invalid");
    }

    const { currentPassword, newPassword } = source as Record<string, unknown>;

    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      throw new BadRequestException("currentPassword and newPassword are required");
    }

    if (newPassword === currentPassword) {
      throw new BadRequestException("The new password must differ from the current password");
    }

    let passwordHash: string;

    try {
      passwordHash = hashProjectPassword(newPassword);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Password is invalid",
      );
    }

    const credentials = await this.repository.readCredentials(input.employeeId);

    if (!credentials) {
      throw new ForbiddenException("Active employee account is required");
    }

    const projectOk = credentials.passwordHash
      ? verifyProjectPassword(currentPassword, credentials.passwordHash)
      : false;
    const legacySalt = process.env.CKACE_LEGACY_PASSWORD_SALT?.trim() ?? "";
    const legacyOk =
      !projectOk && credentials.legacyPasswordHash
        ? verifyLegacyGasPassword(currentPassword, credentials.legacyPasswordHash, legacySalt)
        : false;

    if (!projectOk && !legacyOk) {
      throw new ForbiddenException("Current password is incorrect");
    }

    await this.repository.setPassword({
      employeeId: input.employeeId,
      passwordHash,
      correlationId: input.correlationId,
    });

    return { changed: true };
  }
}
