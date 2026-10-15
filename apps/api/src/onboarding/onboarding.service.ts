import type {
  EmployeeRegistrationInput,
  EmployeeRegistrationResult,
  ImportedDesktopActivationInput,
  ImportedDesktopActivationResult,
  OnboardingApprovalOptions,
  PendingEmployeeAdminItem,
  PendingEmployeeApprovalInput,
  PendingEmployeeApprovalResult,
  PendingLineBindingInput,
  PendingLineBindingResult,
} from "@ckace/contracts";
import type { OnboardingRepository } from "@ckace/database";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from "@nestjs/common";

import {
  hashProjectPassword,
  type LineIdTokenVerifier,
  verifyLegacyGasPassword,
  verifyProjectPassword,
} from "./onboarding-auth";

export const ONBOARDING_REPOSITORY = "CKACE_ONBOARDING_REPOSITORY";
export const LINE_ID_TOKEN_VERIFIER = "CKACE_LINE_ID_TOKEN_VERIFIER";

function strictDate(raw: string, label: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new BadRequestException(`${label} must be YYYY-MM-DD`);
  }
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw) {
    throw new BadRequestException(`Invalid ${label}`);
  }
  return date;
}

function mapError(error: unknown): never {
  const message = error instanceof Error ? error.message : "Onboarding operation failed";
  if (/already registered|already linked|different LINE|already activated/i.test(message)) {
    throw new ConflictException(message);
  }
  if (/credentials|eligible|Only pending/i.test(message)) {
    throw new ForbiddenException("Onboarding operation is not allowed");
  }
  throw new BadRequestException(message);
}

@Injectable()
export class OnboardingService {
  constructor(
    @Inject(ONBOARDING_REPOSITORY)
    private readonly repository: OnboardingRepository,
    @Inject(LINE_ID_TOKEN_VERIFIER)
    private readonly lineVerifier: LineIdTokenVerifier,
  ) {}

  async register(input: EmployeeRegistrationInput): Promise<EmployeeRegistrationResult> {
    const username = input.username.trim();
    const fullName = input.fullName.trim();
    if (username.length < 3 || username.length > 120) {
      throw new BadRequestException("Username must be 3-120 characters");
    }
    if (!fullName || fullName.length > 250) {
      throw new BadRequestException("Full name is required");
    }
    try {
      return await this.repository.register({
        username,
        passwordHash: hashProjectPassword(input.password),
        fullName,
        nickname: input.nickname?.trim() || null,
        dateOfBirth: strictDate(input.dateOfBirth, "dateOfBirth"),
        employmentStart: strictDate(input.employmentStart, "employmentStart"),
      });
    } catch (error) {
      return mapError(error);
    }
  }

  async bindLine(input: PendingLineBindingInput): Promise<PendingLineBindingResult> {
    const credentials = await this.repository.findCredentials(
      input.username.trim().toLowerCase(),
    );
    if (!credentials) throw new ForbiddenException("Invalid credentials");
    const projectOk = credentials.passwordHash
      ? verifyProjectPassword(input.password, credentials.passwordHash)
      : false;
    const legacySalt = process.env.CKACE_LEGACY_PASSWORD_SALT?.trim() ?? "";
    const legacyOk =
      !projectOk && credentials.legacyPasswordHash
        ? verifyLegacyGasPassword(input.password, credentials.legacyPasswordHash, legacySalt)
        : false;
    if (!projectOk && !legacyOk) throw new ForbiddenException("Invalid credentials");
    if (
      credentials.accountState !== "PENDING" &&
      credentials.accountState !== "ACTIVE"
    ) {
      throw new ForbiddenException("Account is not eligible for LINE binding");
    }

    const lineUserId = await this.lineVerifier.verify(input.lineIdToken);
    try {
      return await this.repository.bindLine(credentials.employeeId, lineUserId);
    } catch (error) {
      return mapError(error);
    }
  }

  async activateImportedDesktop(
    input: ImportedDesktopActivationInput,
  ): Promise<ImportedDesktopActivationResult> {
    let passwordHash: string;
    try {
      passwordHash = hashProjectPassword(input.password);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : "Password is invalid",
      );
    }

    let lineUserId: string;
    try {
      lineUserId = await this.lineVerifier.verify(
        input.lineIdToken,
      );
    } catch {
      throw new ForbiddenException(
        "Verified LINE identity is required",
      );
    }

    try {
      return await this.repository.activateImportedDesktopCredential(
        lineUserId,
        passwordHash,
      );
    } catch (error) {
      return mapError(error);
    }
  }

  listPending(): Promise<readonly PendingEmployeeAdminItem[]> {
    return this.repository.listPending();
  }

  getApprovalOptions(): Promise<OnboardingApprovalOptions> {
    return this.repository.getApprovalOptions();
  }

  async approve(
    employeeId: string,
    input: PendingEmployeeApprovalInput,
    actorEmployeeId: string,
  ): Promise<PendingEmployeeApprovalResult> {
    try {
      return await this.repository.approve(
        employeeId,
        input.agencyId,
        input.departmentId,
        actorEmployeeId,
      );
    } catch (error) {
      return mapError(error);
    }
  }
}
