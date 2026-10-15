import { createHash } from "node:crypto";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  r2S3Endpoint,
  type R2PrivateStorageConfig,
  type R2RequestSigner,
} from "./r2-private-object-store";
import type {
  DownloadGrantRequest,
  SignedObjectGrant,
  StoredObjectInspection,
  UploadGrantRequest,
} from "./types";

export interface R2AwsCredentials {
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
}

function validateCredentials(
  credentials: R2AwsCredentials,
): void {
  if (
    credentials.accessKeyId.trim().length < 8 ||
    credentials.secretAccessKey.trim().length < 16
  ) {
    throw new Error("Invalid R2 S3 credentials");
  }
}

export class R2AwsRequestSigner implements R2RequestSigner {
  private readonly credentials: R2AwsCredentials;

  constructor(credentials: R2AwsCredentials) {
    validateCredentials(credentials);
    this.credentials = {
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey,
    };
  }

  async signUpload(
    config: R2PrivateStorageConfig,
    request: UploadGrantRequest,
  ): Promise<SignedObjectGrant> {
    const client = this.clientFor(config);
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: request.storageKey,
      ContentType: request.mimeType,
    });
    const url = await getSignedUrl(client, command, {
      expiresIn: request.expiresInSeconds,
    });

    return {
      url,
      method: "PUT",
      expiresAt: new Date(
        Date.now() + request.expiresInSeconds * 1000,
      ),
      requiredHeaders: {
        "content-type": request.mimeType,
      },
    };
  }

  async signDownload(
    config: R2PrivateStorageConfig,
    request: DownloadGrantRequest,
  ): Promise<SignedObjectGrant> {
    const command = new GetObjectCommand({
      Bucket: config.bucketName,
      Key: request.storageKey,
      ...(request.downloadFilename
        ? {
            ResponseContentDisposition:
              `attachment; filename*=UTF-8''${encodeURIComponent(
                request.downloadFilename,
              )}`,
          }
        : {}),
    });
    const url = await getSignedUrl(
      this.clientFor(config),
      command,
      {
        expiresIn: request.expiresInSeconds,
      },
    );

    return {
      url,
      method: "GET",
      expiresAt: new Date(
        Date.now() + request.expiresInSeconds * 1000,
      ),
      requiredHeaders: {},
    };
  }

  async inspectObject(
    config: R2PrivateStorageConfig,
    storageKey: string,
  ): Promise<StoredObjectInspection> {
    const response = await this.clientFor(config).send(
      new GetObjectCommand({
        Bucket: config.bucketName,
        Key: storageKey,
      }),
    );

    if (!response.Body) {
      throw new Error("R2 object body is unavailable");
    }

    const bytes = await response.Body.transformToByteArray();
    const sizeBytes = bytes.byteLength;

    if (
      response.ContentLength !== undefined &&
      response.ContentLength !== sizeBytes
    ) {
      throw new Error("R2 object content length mismatch");
    }

    return {
      sizeBytes,
      mimeType: response.ContentType ?? null,
      checksumSha256: createHash("sha256")
        .update(bytes)
        .digest("hex"),
    };
  }

  async deleteObject(
    config: R2PrivateStorageConfig,
    storageKey: string,
  ): Promise<void> {
    await this.clientFor(config).send(
      new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: storageKey,
      }),
    );
  }

  private clientFor(
    config: R2PrivateStorageConfig,
  ): S3Client {
    return new S3Client({
      region: "auto",
      endpoint: r2S3Endpoint(config),
      credentials: {
        accessKeyId: this.credentials.accessKeyId,
        secretAccessKey: this.credentials.secretAccessKey,
      },
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
}
