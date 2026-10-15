import {
  getPrismaClient,
  PrismaSelfProfileRepository,
} from "@ckace/database";
import { Module } from "@nestjs/common";

import { SecurityModule } from "../security/security.module";
import { ProfileController } from "./profile.controller";
import {
  ProfileService,
  SELF_PROFILE_REPOSITORY,
} from "./profile.service";

@Module({
  imports: [SecurityModule],
  controllers: [ProfileController],
  providers: [
    ProfileService,
    {
      provide: SELF_PROFILE_REPOSITORY,
      useFactory: () =>
        new PrismaSelfProfileRepository(getPrismaClient()),
    },
  ],
})
export class ProfileModule {}
