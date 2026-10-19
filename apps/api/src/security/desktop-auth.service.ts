import {
  IdentityInactiveError,
  IdentityService,
  IdentityUnavailableError,
  type IdentityRepository,
  type InternalActorContext,
} from "@ckace/auth";
import type {
  OnboardingRepository,
} from "@ckace/database";
import {
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";

import {
  LineVerifyApiTokenVerifier,
  verifyLegacyGasPassword,
  verifyProjectPassword,
} from "../onboarding/onboarding-auth";
import {
  issueDesktopSessionToken,
  verifyDesktopSessionToken,
} from "./desktop-session";

export const DESKTOP_AUTH_REPOSITORY =
  "CKACE_DESKTOP_AUTH_REPOSITORY";
export const DESKTOP_IDENTITY_REPOSITORY =
  "CKACE_DESKTOP_IDENTITY_REPOSITORY";

export interface DesktopLoginResult {
  readonly token: string;
  readonly actor: InternalActorContext;
}

function sessionSecret(): string {
  const value =
    process.env.CKACE_DESKTOP_SESSION_SECRET?.trim() ?? "";
  if (Buffer.byteLength(value, "utf8") < 32) {
    throw new ServiceUnavailableException(
      "Desktop authentication is unavailable",
    );
  }
  return value;
}

@Injectable()
export class DesktopAuthService {
  private readonly identity: IdentityService;

  constructor(
    @Inject(DESKTOP_AUTH_REPOSITORY)
    private readonly repository: OnboardingRepository,
    @Inject(DESKTOP_IDENTITY_REPOSITORY)
    identityRepository: IdentityRepository,
  ) {
    this.identity = new IdentityService(identityRepository);
  }

  async login(input: {
    readonly username: unknown;
    readonly password: unknown;
    readonly correlationId?: string | null;
  }): Promise<DesktopLoginResult> {
    if (
      typeof input.username !== "string" ||
      typeof input.password !== "string"
    ) {
      throw new UnauthorizedException("Invalid credentials");
    }
    const username = input.username.trim().toLowerCase();
    const password = input.password;
    if (
      username.length < 3 ||
      username.length > 120 ||
      password.length < 1 ||
      password.length > 200
    ) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const credentials =
      await this.repository.findCredentials(username);
    if (!credentials || credentials.accountState !== "ACTIVE") {
      throw new UnauthorizedException("Invalid credentials");
    }

    const projectOk = credentials.passwordHash
      ? verifyProjectPassword(
          password,
          credentials.passwordHash,
        )
      : false;
    const legacySalt =
      process.env.CKACE_LEGACY_PASSWORD_SALT?.trim() ?? "";
    const legacyOk =
      !projectOk && credentials.legacyPasswordHash
        ? verifyLegacyGasPassword(
            password,
            credentials.legacyPasswordHash,
            legacySalt,
          )
        : false;

    if (!projectOk && !legacyOk) {
      throw new UnauthorizedException("Invalid credentials");
    }

    try {
      const actor = await this.identity.resolveEmployeeActor({
        employeeId: credentials.employeeId,
        authenticatedBy: "PROJECT_B_WEB",
        ...(input.correlationId
          ? { correlationId: input.correlationId }
          : {}),
      });
      const { token } = issueDesktopSessionToken({
        employeeId: actor.employeeId,
        secret: sessionSecret(),
      });
      return { token, actor };
    } catch (error) {
      if (
        error instanceof IdentityInactiveError ||
        error instanceof IdentityUnavailableError
      ) {
        throw new ForbiddenException(
          "Desktop account is unavailable",
        );
      }
      throw error;
    }
  }

  async loginWithLine(input: {
    readonly idToken: unknown;
    readonly correlationId?: string | null;
  }): Promise<DesktopLoginResult> {
    if (
      typeof input.idToken !== "string" ||
      input.idToken.length < 20 ||
      input.idToken.length > 8000
    ) {
      throw new UnauthorizedException("Invalid LINE identity");
    }
    let lineUserId: string;
    try {
      lineUserId = await new LineVerifyApiTokenVerifier(
        process.env.LINE_LOGIN_CHANNEL_ID?.trim() ?? "",
      ).verify(input.idToken);
    } catch {
      throw new UnauthorizedException("Invalid LINE identity");
    }
    const employeeId =
      await this.repository.findActiveEmployeeIdByLineUserId(lineUserId);
    if (!employeeId) {
      // Lets an admin find the LINE user id to bind to an employee (read from the server log).
      console.warn(`line-login: LINE account is not linked (lineUserId=${lineUserId})`);
      throw new UnauthorizedException("LINE account is not linked");
    }
    try {
      const actor = await this.identity.resolveEmployeeActor({
        employeeId,
        authenticatedBy: "PROJECT_B_WEB",
        ...(input.correlationId
          ? { correlationId: input.correlationId }
          : {}),
      });
      const { token } = issueDesktopSessionToken({
        employeeId: actor.employeeId,
        secret: sessionSecret(),
      });
      return { token, actor };
    } catch (error) {
      if (
        error instanceof IdentityInactiveError ||
        error instanceof IdentityUnavailableError
      ) {
        throw new ForbiddenException("Account is unavailable");
      }
      throw error;
    }
  }

  async resolveSession(input: {
    readonly token: string;
    readonly correlationId?: string | null;
  }): Promise<InternalActorContext> {
    const claims = verifyDesktopSessionToken({
      token: input.token,
      secret: sessionSecret(),
    });
    return this.identity.resolveEmployeeActor({
      employeeId: claims.employeeId,
      authenticatedBy: "PROJECT_B_WEB",
      ...(input.correlationId
        ? { correlationId: input.correlationId }
        : {}),
    });
  }
}
