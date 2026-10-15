export interface EmployeeRegistrationInput {
  readonly username: string; readonly password: string; readonly fullName: string;
  readonly nickname?: string | null; readonly dateOfBirth: string; readonly employmentStart: string;
}
export interface EmployeeRegistrationResult {
  readonly employeeId: string; readonly accountState: "PENDING"; readonly pendingApproval: true;
}
export interface PendingLineBindingInput {
  readonly username: string; readonly password: string; readonly lineIdToken: string;
}
export interface PendingLineBindingResult {
  readonly employeeId: string; readonly accountState: "PENDING" | "ACTIVE"; readonly linked: true;
  readonly unchanged: boolean; readonly pendingApproval: boolean;
}
export interface ImportedDesktopActivationInput {
  readonly password: string;
  readonly lineIdToken: string;
}
export interface ImportedDesktopActivationResult {
  readonly employeeId: string;
  readonly accountState: "ACTIVE";
  readonly activated: true;
}
export interface PendingEmployeeApprovalInput { readonly agencyId: string; readonly departmentId: string; }
export interface PendingEmployeeApprovalResult {
  readonly employeeId: string; readonly accountState: "ACTIVE"; readonly unchanged: boolean;
  readonly leaveEntitlementsProvisioned: readonly { readonly leaveTypeKey: string; readonly quota: number }[];
  readonly notificationQueued: boolean;
}

export interface PendingEmployeeAdminItem {
  readonly employeeId: string;
  readonly fullName: string;
  readonly nickname: string | null;
  readonly loginName: string;
  readonly dateOfBirth: string | null;
  readonly employmentStart: string | null;
  readonly lineLinked: boolean;
}

export interface OnboardingOrganizationOption {
  readonly id: string;
  readonly name: string;
}

export interface OnboardingApprovalOptions {
  readonly agencies: readonly OnboardingOrganizationOption[];
  readonly departments: readonly OnboardingOrganizationOption[];
}
