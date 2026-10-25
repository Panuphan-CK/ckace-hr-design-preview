import {
  getPrismaClient,
  PrismaIdentityRepository,
  PrismaOnboardingRepository,
  PrismaPasswordRecoveryRepository,
} from "@ckace/database";
import { Module } from "@nestjs/common";

import { AuthorizationGuard } from "./authorization.guard";
import { DesktopAuthController } from "./desktop-auth.controller";
import {
  DESKTOP_AUTH_REPOSITORY,
  DESKTOP_IDENTITY_REPOSITORY,
  DesktopAuthService,
} from "./desktop-auth.service";
import { SecurityController } from "./security.controller";
import { PasswordRecoveryController } from "./password-recovery.controller";
import { SmtpEmailSender } from "../notifications/email-sender";
import { LinePushSender } from "../notifications/line-sender";
import {
  PASSWORD_RECOVERY_DELIVERY,
  PASSWORD_RECOVERY_REPOSITORY,
  PASSWORD_RECOVERY_SECRET,
  PasswordRecoveryService,
  type PasswordRecoveryDelivery,
  type RecoverySender,
} from "./password-recovery.service";

@Module({
  controllers: [
    SecurityController,
    DesktopAuthController,
    PasswordRecoveryController,
  ],
  providers: [
    AuthorizationGuard,
    DesktopAuthService,
    PasswordRecoveryService,
    {
      provide: PASSWORD_RECOVERY_REPOSITORY,
      useFactory: () =>
        new PrismaPasswordRecoveryRepository(getPrismaClient()),
    },
    {
      provide: PASSWORD_RECOVERY_DELIVERY,
      useFactory: (): PasswordRecoveryDelivery => {
        const senders: RecoverySender[] = [];
        const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim();
        const smtpUser = process.env.CKACE_SMTP_USER?.trim();
        const smtpPassword = process.env.CKACE_SMTP_PASSWORD?.trim();
        if (lineToken) senders.push(new LinePushSender(lineToken));
        if (smtpUser && smtpPassword) senders.push(SmtpEmailSender.gmail(smtpUser, smtpPassword));
        return { baseUrl: process.env.CKACE_PUBLIC_BASE_URL?.trim() ?? "", senders };
      },
    },
    {
      provide: PASSWORD_RECOVERY_SECRET,
      useFactory: () =>
        process.env.CKACE_PASSWORD_RESET_SECRET?.trim() ?? "",
    },
    {
      provide: DESKTOP_AUTH_REPOSITORY,
      useFactory: () =>
        new PrismaOnboardingRepository(getPrismaClient()),
    },
    {
      provide: DESKTOP_IDENTITY_REPOSITORY,
      useFactory: () =>
        new PrismaIdentityRepository(getPrismaClient()),
    },
  ],
  exports: [
    AuthorizationGuard,
    DesktopAuthService,
  ],
})
export class SecurityModule {}
