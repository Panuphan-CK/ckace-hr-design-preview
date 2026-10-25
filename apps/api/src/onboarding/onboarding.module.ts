import {
  getPrismaClient,
  PrismaOnboardingRepository,
  PrismaRegistrationMediaRepository,
} from "@ckace/database";
import { Module } from "@nestjs/common";

import { AttachmentModule } from "../attachments/attachment.module";
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
import {
  REGISTRATION_MEDIA_REPOSITORY,
  REGISTRATION_MEDIA_SECRET,
  RegistrationMediaService,
} from "./registration-media.service";

function lineChannelId(): string {
  return process.env.LINE_LOGIN_CHANNEL_ID?.trim() ?? "";
}

@Module({
  imports: [SecurityModule, AttachmentModule],
  controllers: [OnboardingController],
  providers: [
    OnboardingService,
    RegistrationMediaService,
    {
      provide: REGISTRATION_MEDIA_REPOSITORY,
      useFactory: () => new PrismaRegistrationMediaRepository(getPrismaClient()),
    },
    {
      provide: REGISTRATION_MEDIA_SECRET,
      useFactory: () => process.env.CKACE_PASSWORD_RESET_SECRET?.trim() ?? "",
    },
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
