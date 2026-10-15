import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import type {
  PasswordRecoveryIssueResult,
  PasswordRecoveryResetResult,
} from "@ckace/contracts";
import type {
  PasswordRecoveryAccount,
  PasswordRecoveryRepository,
} from "@ckace/database";
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";

import { hashProjectPassword } from "../onboarding/onboarding-auth";

export const PASSWORD_RECOVERY_REPOSITORY =
  "CKACE_PASSWORD_RECOVERY_REPOSITORY";
export const PASSWORD_RECOVERY_SECRET =
  "CKACE_PASSWORD_RECOVERY_SECRET_VALUE";

interface RecoveryTokenPayload {
  readonly v: 1;
  readonly uid: string;
  readonly eid: string;
  readonly exp: number;
  readonly cv: string;
}

function credentialVersion(account: PasswordRecoveryAccount): string {
  return createHash("sha256")
    .update(
      [
        account.id,
        account.employeeId,
        account.updatedAt.toISOString(),
        account.passwordHash ?? "",
        account.legacyPasswordHash ?? "",
      ].join("|"),
      "utf8",
    )
    .digest("base64url");
}

function safeSignatureEqual(left: string, right: string): boolean {
  try {
    const a = Buffer.from(left, "base64url");
    const b = Buffer.from(right, "base64url");
    return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

@Injectable()
export class PasswordRecoveryService {
  constructor(
    @Inject(PASSWORD_RECOVERY_REPOSITORY)
    private readonly repository: PasswordRecoveryRepository,
    @Inject(PASSWORD_RECOVERY_SECRET)
    private readonly secret: string,
  ) {}

  private assertSecret(): void {
    if (Buffer.byteLength(this.secret, "utf8") < 32) {
      throw new ServiceUnavailableException(
        "Password recovery is not configured",
      );
    }
  }

  private sign(encodedPayload: string): string {
    return createHmac("sha256", this.secret)
      .update(encodedPayload, "utf8")
      .digest("base64url");
  }

  async issue(
    employeeId: string,
  ): Promise<PasswordRecoveryIssueResult> {
    this.assertSecret();
    const account =
      await this.repository.findByEmployeeId(employeeId);
    if (!account || account.state !== "ACTIVE") {
      throw new BadRequestException(
        "Only active employee accounts can receive a recovery link",
      );
    }
    const expiresAtMs = Date.now() + 15 * 60 * 1000;
    const payload: RecoveryTokenPayload = {
      v: 1,
      uid: account.id,
      eid: account.employeeId,
      exp: expiresAtMs,
      cv: credentialVersion(account),
    };
    const encodedPayload = Buffer.from(
      JSON.stringify(payload),
      "utf8",
    ).toString("base64url");
    const token = encodedPayload + "." + this.sign(encodedPayload);
    return {
      employeeId: account.employeeId,
      resetPath:
        "/reset-password?token=" + encodeURIComponent(token),
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
  }

  async reset(
    token: string,
    password: string,
  ): Promise<PasswordRecoveryResetResult> {
    this.assertSecret();
    const [encodedPayload, signature, extra] = token.trim().split(".");
    if (!encodedPayload || !signature || extra) {
      throw new ForbiddenException("Invalid or expired recovery link");
    }
    if (!safeSignatureEqual(signature, this.sign(encodedPayload))) {
      throw new ForbiddenException("Invalid or expired recovery link");
    }

    let payload: RecoveryTokenPayload;
    try {
      payload = JSON.parse(
        Buffer.from(encodedPayload, "base64url").toString("utf8"),
      ) as RecoveryTokenPayload;
    } catch {
      throw new ForbiddenException("Invalid or expired recovery link");
    }
    if (
      payload.v !== 1 ||
      typeof payload.uid !== "string" ||
      typeof payload.eid !== "string" ||
      typeof payload.exp !== "number" ||
      typeof payload.cv !== "string" ||
      payload.exp <= Date.now() ||
      payload.exp > Date.now() + 16 * 60 * 1000
    ) {
      throw new ForbiddenException("Invalid or expired recovery link");
    }

    const account =
      await this.repository.findByAccountId(payload.uid);
    if (
      !account ||
      account.employeeId !== payload.eid ||
      account.state !== "ACTIVE" ||
      credentialVersion(account) !== payload.cv
    ) {
      throw new ForbiddenException("Invalid or expired recovery link");
    }

    let passwordHash: string;
    try {
      passwordHash = hashProjectPassword(password);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : "Password is invalid",
      );
    }

    try {
      const result = await this.repository.resetPassword(
        account.id,
        account.updatedAt,
        passwordHash,
      );
      return {
        employeeId: result.employeeId,
        reset: true,
      };
    } catch {
      throw new ForbiddenException("Invalid or expired recovery link");
    }
  }
}
