import { createHash } from "node:crypto";

import {
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  S3Client,
  type CORSRule,
} from "@aws-sdk/client-s3";
import type { InternalActorContext } from "@ckace/auth";
import {
  getPrismaClient,
  PrismaAttachmentRepository,
  PrismaMedicalRepository,
} from "@ckace/database";
import {
  PrivateAttachmentStorageService,
  R2AwsRequestSigner,
  R2PrivateObjectStore,
} from "@ckace/storage";
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  ServiceUnavailableException,
} from "@nestjs/common";

import { AttachmentService } from "../attachments/attachment.service";
import { MedicalService } from "../medical/medical.service";

const OWNER_ID = "29000000-0000-4000-9000-000000000001";
const APPROVER_ID = "29000000-0000-4000-9000-000000000002";
const UNRELATED_ID = "29000000-0000-4000-9000-000000000003";
const MEDICAL_POLICY_ID = "32000000-0000-4000-8300-000000000001";
const MEDICAL_POLICY_STEP_ID = "32000000-0000-4000-8301-000000000001";
const AGENCY_ID = "31000000-0000-4000-8000-000000000001";
const SUPERUSER_ROLE_ID = "29000000-0000-4000-8000-000000000002";
const TASK32_API_ORIGIN =
  "https://task32-r2---ckace-hr-api-test-cjcyhgow2q-as.a.run.app";
const WD13_WEB_ORIGIN =
  "https://wd13-retry---ckace-hr-web-test-cjcyhgow2q-as.a.run.app";
const TASK32_CORS_ID = "task32-medical-private-browser";
export const TASK32_RECEIPT_TEXT =
  "%PDF-1.4\n% TASK32 private medical receipt 2026-10-08\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n";
const RECEIPT_BYTES = Buffer.from(TASK32_RECEIPT_TEXT, "utf8");
const RECEIPT_CHECKSUM = createHash("sha256")
  .update(RECEIPT_BYTES)
  .digest("hex");

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error("TASK32_RUNTIME_CONFIG_MISSING");
  return value;
}

export function assertTask32Runtime(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const revision = env.K_REVISION?.trim() ?? "";
  if (
    env.CKACE_RUNTIME_STAGE?.trim().toLowerCase() !== "test" ||
    env.K_SERVICE?.trim() !== "ckace-hr-api-test" ||
    !revision.startsWith("ckace-hr-api-test-task32r2-")
  ) {
    throw new NotFoundException();
  }
}

function actor(
  kind: "owner" | "approver" | "unrelated",
): InternalActorContext {
  const employeeId =
    kind === "owner"
      ? OWNER_ID
      : kind === "approver"
        ? APPROVER_ID
        : UNRELATED_ID;
  const permissions =
    kind === "owner"
      ? [
          "medical.self.read",
          "medical.self.write",
          "medical.attachment.self.read",
          "medical.attachment.self.write",
          "medical.attachment.self.delete",
        ]
      : kind === "approver"
        ? [
            "medical.approve",
            "medical.attachment.global.read",
          ]
        : ["medical.attachment.global.read"];

  return {
    employeeId,
    legacyUid: null,
    roles: [
      kind === "owner"
        ? "EMPLOYEE"
        : kind === "approver"
          ? "SUPERUSER"
          : "ADMIN",
    ],
    permissions,
    agencyId: AGENCY_ID,
    departmentId: "31000000-0000-4000-8000-000000000002",
    authenticatedBy: "PROJECT_B_WEB",
    correlationId: "task32-r2-uat",
  };
}

function r2Client(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint:
      `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    },
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
}

function task32CorsRule(): CORSRule {
  return {
    ID: TASK32_CORS_ID,
    AllowedOrigins: [
      TASK32_API_ORIGIN,
      WD13_WEB_ORIGIN,
    ],
    AllowedMethods: ["PUT", "GET", "HEAD"],
    AllowedHeaders: ["content-type"],
    ExposeHeaders: ["ETag"],
    MaxAgeSeconds: 3600,
  };
}

export function mergeTask32CorsRules(
  existing: readonly CORSRule[],
): CORSRule[] {
  return [
    ...existing.filter((rule) => rule.ID !== TASK32_CORS_ID),
    task32CorsRule(),
  ];
}

function services() {
  const prisma = getPrismaClient();
  const attachment = new AttachmentService(
    new PrismaAttachmentRepository(prisma),
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
  );
  const medical = new MedicalService(
    new PrismaMedicalRepository(prisma),
  );
  return { attachment, medical, prisma };
}

function objectBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new BadRequestException("Invalid TASK32 body");
  }
  return body as Record<string, unknown>;
}

function stringField(body: unknown, key: string): string {
  const value = objectBody(body)[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new BadRequestException("Invalid TASK32 field");
  }
  return value.trim();
}

@Controller("test/task32-r2")
export class Task32R2Controller {
  @Get("cors")
  async cors() {
    assertTask32Runtime();
    const response = await r2Client().send(
      new GetBucketCorsCommand({
        Bucket: required("R2_BUCKET_NAME"),
      }),
    );
    const rules = response.CORSRules ?? [];
    return {
      ruleCount: rules.length,
      hasTask32Rule: rules.some(
        (rule) => rule.ID === TASK32_CORS_ID,
      ),
      task32Rule: rules.find(
        (rule) => rule.ID === TASK32_CORS_ID,
      ) ?? null,
    };
  }

  @Post("ensure-cors")
  async ensureCors() {
    assertTask32Runtime();
    const client = r2Client();
    let existing: CORSRule[] = [];
    try {
      const response = await client.send(
        new GetBucketCorsCommand({
          Bucket: required("R2_BUCKET_NAME"),
        }),
      );
      existing = response.CORSRules ?? [];
    } catch (error) {
      const name =
        error && typeof error === "object" && "name" in error
          ? String((error as { name?: unknown }).name ?? "")
          : "";
      if (
        name !== "NoSuchCORSConfiguration" &&
        name !== "NoSuchCORSConfig"
      ) {
        throw error;
      }
    }

    const merged = mergeTask32CorsRules(existing);
    await client.send(
      new PutBucketCorsCommand({
        Bucket: required("R2_BUCKET_NAME"),
        CORSConfiguration: {
          CORSRules: merged,
        },
      }),
    );
    return {
      configured: true,
      ruleCount: merged.length,
      task32Rule: merged.find(
        (rule) => rule.ID === TASK32_CORS_ID,
      ),
    };
  }

  @Post("ensure-fixture")
  async ensureFixture() {
    assertTask32Runtime();
    const { prisma } = services();
    await prisma.approvalPolicy.upsert({
      where: { id: MEDICAL_POLICY_ID },
      create: {
        id: MEDICAL_POLICY_ID,
        agencyId: AGENCY_ID,
        requestKind: "MEDICAL",
        name: "TASK32 Medical Approval",
        active: true,
      },
      update: {
        agencyId: AGENCY_ID,
        requestKind: "MEDICAL",
        name: "TASK32 Medical Approval",
        active: true,
      },
    });
    await prisma.approvalPolicyStep.upsert({
      where: { id: MEDICAL_POLICY_STEP_ID },
      create: {
        id: MEDICAL_POLICY_STEP_ID,
        policyId: MEDICAL_POLICY_ID,
        stepOrder: 1,
        requiredRoleId: SUPERUSER_ROLE_ID,
        scope: "SAME_AGENCY",
      },
      update: {
        policyId: MEDICAL_POLICY_ID,
        stepOrder: 1,
        requiredRoleId: SUPERUSER_ROLE_ID,
        scope: "SAME_AGENCY",
      },
    });
    return {
      ready: true,
      policyId: MEDICAL_POLICY_ID,
      stepId: MEDICAL_POLICY_STEP_ID,
    };
  }

  @Get("receipt")
  receipt() {
    assertTask32Runtime();
    return {
      text: TASK32_RECEIPT_TEXT,
      mimeType: "application/pdf",
      sizeBytes: RECEIPT_BYTES.byteLength,
      checksumSha256: RECEIPT_CHECKSUM,
    };
  }

  @Post("upload-intent")
  async uploadIntent() {
    assertTask32Runtime();
    return services().attachment.createUploadIntent(actor("owner"), {
      privacyClass: "MEDICAL_PRIVATE",
      originalFilename: "task32-medical-receipt.pdf",
      mimeType: "application/pdf",
      sizeBytes: RECEIPT_BYTES.byteLength,
      checksumSha256: RECEIPT_CHECKSUM,
    });
  }

  @Post("finalize/:attachmentId")
  async finalize(@Param("attachmentId") attachmentId: string) {
    assertTask32Runtime();
    return services().attachment.finalize(actor("owner"), attachmentId);
  }

  @Post("ambiguous-finalize/:attachmentId")
  async ambiguousFinalize(@Param("attachmentId") attachmentId: string) {
    assertTask32Runtime();
    await services().attachment.finalize(actor("owner"), attachmentId);
    throw new ServiceUnavailableException({
      ok: false,
      uat: "FINALIZE_RESULT_UNCERTAIN",
      attachmentId,
    });
  }

  @Post("claims")
  async createClaim(@Body() body: unknown) {
    assertTask32Runtime();
    const attachmentId = stringField(body, "attachmentId");
    const clientKey = stringField(body, "clientKey");
    return services().medical.createSelfMedical({
      employeeId: OWNER_ID,
      correlationId: "task32-medical-create",
      body: {
        sicknessDate: "2026-10-08",
        amount: 100,
        description: "TASK32 private R2 medical claim",
        attachmentIds: [attachmentId],
        leaveRequestId: null,
        clientKey,
      },
    });
  }

  @Get("assigned")
  async assigned() {
    assertTask32Runtime();
    return services().medical.getAssignedApprovals(APPROVER_ID);
  }

  @Post("claims/:claimId/approve")
  async approve(@Param("claimId") claimId: string) {
    assertTask32Runtime();
    return services().medical.decideAssignedMedical({
      approverEmployeeId: APPROVER_ID,
      correlationId: "task32-medical-approve",
      claimId,
      body: {
        decision: "APPROVED",
        comment: "TASK32 approved",
      },
    });
  }

  @Get("download/:actorKind/:attachmentId")
  async download(
    @Param("actorKind") actorKind: string,
    @Param("attachmentId") attachmentId: string,
  ) {
    assertTask32Runtime();
    if (
      actorKind !== "owner" &&
      actorKind !== "approver" &&
      actorKind !== "unrelated"
    ) {
      throw new BadRequestException("Invalid TASK32 actor");
    }
    return services().attachment.createDownload(
      actor(actorKind),
      attachmentId,
    );
  }
}
