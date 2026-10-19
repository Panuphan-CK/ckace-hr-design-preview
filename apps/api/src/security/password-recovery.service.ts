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

export interface RecoverySender {
  readonly channel: "LINE" | "EMAIL";
  send(input: { to: string; title: string; body: string }): Promise<string | null>;
}

/** Senders and the public site address come from the runtime configuration; missing ones just skip that channel. */
export const PASSWORD_RECOVERY_DELIVERY = "CKACE_PASSWORD_RECOVERY_DELIVERY";
export interface PasswordRecoveryDelivery {
  readonly baseUrl: string;
  readonly senders: readonly RecoverySender[];
}

const REQUEST_COOLDOWN_MS = 60 * 1000;
const MAX_REQUESTS_PER_HOUR = 3;
const HOUR_MS = 60 * 60 * 1000;

@Injectable()
export class PasswordRecoveryService {
  private readonly lastRequestAt = new Map<string, number>();
  private readonly requestLog = new Map<string, number[]>();

  constructor(
    @Inject(PASSWORD_RECOVERY_REPOSITORY)
    private readonly repository: PasswordRecoveryRepository,
    @Inject(PASSWORD_RECOVERY_SECRET)
    private readonly secret: string,
    @Inject(PASSWORD_RECOVERY_DELIVERY)
    private readonly delivery: PasswordRecoveryDelivery = { baseUrl: "", senders: [] },
  ) {}

  /**
   * Self-service "forgot password": always succeeds from the caller's view (never reveals whether the
   * login exists); when it does, a 15-minute link goes to the login e-mail and the linked LINE account.
   */
  async requestByLogin(identifier: unknown): Promise<{ readonly requested: true }> {
    this.assertSecret();
    const login = typeof identifier === "string" ? identifier.trim().toLowerCase() : "";
    if (login.length < 3 || login.length > 120) return { requested: true };
    const contact = await this.repository.findContactByLogin(login);
    if (!contact || contact.account.state !== "ACTIVE") return { requested: true };

    const now = Date.now();
    const previous = this.lastRequestAt.get(contact.account.id) ?? 0;
    if (now - previous < REQUEST_COOLDOWN_MS) return { requested: true };
    const recent = (this.requestLog.get(contact.account.id) ?? []).filter((at) => now - at < HOUR_MS);
    if (recent.length >= MAX_REQUESTS_PER_HOUR) return { requested: true };
    this.requestLog.set(contact.account.id, [...recent, now]);
    this.lastRequestAt.set(contact.account.id, now);

    const { resetPath } = await this.issue(contact.account.employeeId);
    const link = this.delivery.baseUrl.replace(/\/+$/, "") + resetPath;
    const title = "ตั้งรหัสผ่านใหม่ CKACE HR";
    const body =
      "มีการขอตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ กดลิงก์นี้ภายใน 15 นาที:\n" +
      link +
      "\nถ้าคุณไม่ได้เป็นคนขอ ไม่ต้องทำอะไร";
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.loginName);
    await Promise.all(
      this.delivery.senders.map(async (sender) => {
        const to =
          sender.channel === "EMAIL" ? (emailOk ? contact.loginName : null) : contact.lineUserId;
        if (!to) return;
        try {
          await sender.send({ to, title, body });
        } catch (error) {
          console.warn(
            "password recovery delivery failed",
            sender.channel,
            error instanceof Error ? error.message : "unknown",
          );
        }
      }),
    );
    return { requested: true };
  }

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

  /** Checks a recovery token the same way for preview and reset; returns the account it belongs to. */
  private async verifyToken(token: string): Promise<PasswordRecoveryAccount> {
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
    return account;
  }

  /** Shows which account a valid link belongs to, so the user knows who they are resetting. Only holders of a valid link see it. */
  async preview(token: string): Promise<{ readonly account: string }> {
    this.assertSecret();
    const account = await this.verifyToken(token);
    const login = (await this.repository.findLoginName(account.id)) ?? "";
    return { account: login };
  }

  async reset(
    token: string,
    password: string,
  ): Promise<PasswordRecoveryResetResult> {
    this.assertSecret();
    const account = await this.verifyToken(token);

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
