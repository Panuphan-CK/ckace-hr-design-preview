export type ProfileAccountState =
  | "ACTIVE"
  | "PENDING"
  | "INACTIVE"
  | "RESIGNED";

export interface ProfileOrganizationRef {
  readonly id: string;
  readonly name: string;
}

export interface ProfileMediaRef {
  readonly attachmentId: string;
}

export interface SelfProfileResponse {
  readonly employeeId: string;
  readonly fullName: string;
  readonly nickname: string | null;
  readonly dateOfBirth: string | null;
  readonly employmentStart: string | null;
  readonly resignationDate: string | null;
  readonly accountState: ProfileAccountState;
  readonly loginName: string;
  readonly agency: ProfileOrganizationRef | null;
  readonly department: ProfileOrganizationRef | null;
  readonly roles: readonly string[];
  readonly lineLinked: boolean;
  readonly media: {
    readonly profile: ProfileMediaRef | null;
    readonly signature: ProfileMediaRef | null;
  };
}
