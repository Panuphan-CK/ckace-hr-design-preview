export interface PasswordRecoveryIssueResult {
  readonly employeeId: string;
  readonly resetPath: string;
  readonly expiresAt: string;
}

export interface PasswordRecoveryResetInput {
  readonly token: string;
  readonly password: string;
}

export interface PasswordRecoveryResetResult {
  readonly employeeId: string;
  readonly reset: true;
}
