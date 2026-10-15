import {
  getPrismaClient,
  PrismaOnboardingRepository,
} from "@ckace/database";
import { Module } from "@nestjs/common";

import { SecurityModule } from "../security/security.module";
import {
  LineVerifyApiTokenVerifier,
} from "./onboarding-auth";
import { OnboardingController } from "./onboarding.controller";
import {
  LINE_ID_TOKEN_VERIFIER,
  ONBOARDING_REPOSITORY,
  OnboardingService,
} from "./onboarding.service";

function lineChannelId(): string {
  return process.env.LINE_LOGIN_CHANNEL_ID?.trim() ?? "";
}

@Module({
  imports: [SecurityModule],
  controllers: [OnboardingController],
  providers: [
    OnboardingService,
    {
      provide: ONBOARDING_REPOSITORY,
      useFactory: () => new PrismaOnboardingRepository(getPrismaClient()),
    },
    {
      provide: LINE_ID_TOKEN_VERIFIER,
      useFactory: () => new LineVerifyApiTokenVerifier(lineChannelId()),
    },
  ],
})
export class OnboardingModule {}
