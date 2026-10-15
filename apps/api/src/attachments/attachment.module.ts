import {
  getPrismaClient,
  PrismaAttachmentRepository,
} from "@ckace/database";
import {
  PrivateAttachmentStorageService,
  R2AwsRequestSigner,
  R2PrivateObjectStore,
} from "@ckace/storage";
import { Module } from "@nestjs/common";

import { AttachmentController } from "./attachment.controller";
import {
  ATTACHMENT_REPOSITORY,
  AttachmentService,
  PRIVATE_ATTACHMENT_STORAGE,
} from "./attachment.service";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

@Module({
  controllers: [AttachmentController],
  providers: [
    AttachmentService,
    {
      provide: ATTACHMENT_REPOSITORY,
      useFactory: () => new PrismaAttachmentRepository(getPrismaClient()),
    },
    {
      provide: PRIVATE_ATTACHMENT_STORAGE,
      useFactory: () =>
        new PrivateAttachmentStorageService(
          new R2PrivateObjectStore(
            {
              accountId: required("R2_ACCOUNT_ID"),
              bucketName: required("R2_BUCKET_NAME"),
            },
            new R2AwsRequestSigner({
              accessKeyId: required("R2_ACCESS_KEY_ID"),
              secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
            }),
          ),
        ),
    },
  ],
  exports: [PRIVATE_ATTACHMENT_STORAGE],
})
export class AttachmentModule {}
