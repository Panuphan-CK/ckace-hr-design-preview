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
import {
  PASSWORD_RECOVERY_REPOSITORY,
  PASSWORD_RECOVERY_SECRET,
  PasswordRecoveryService,
} from "./password-recovery.service";
import { Wd13TestUatController } from "./wd13-test-uat.controller";

@Module({
  controllers: [
    SecurityController,
    DesktopAuthController,
    PasswordRecoveryController,
    Wd13TestUatController,
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
