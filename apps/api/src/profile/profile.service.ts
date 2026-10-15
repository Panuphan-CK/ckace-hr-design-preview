import type { SelfProfileResponse } from "@ckace/contracts";
import type {
  DatabaseSelfProfile,
  SelfProfileRepository,
} from "@ckace/database";
import {
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

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
}
