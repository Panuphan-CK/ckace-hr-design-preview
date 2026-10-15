import {
  assertPrivateAttachmentStorageKey,
} from "./object-key";
import type {
  DownloadGrantRequest,
  PrivateObjectStore,
  SignedObjectGrant,
  StoredObjectInspection,
  UploadGrantRequest,
} from "./types";
import { validateGrantTtlSeconds } from "./validation";

export interface R2PrivateStorageConfig {
  readonly accountId: string;
  readonly bucketName: string;
}

export interface R2RequestSigner {
  signUpload(
    config: R2PrivateStorageConfig,
    request: UploadGrantRequest,
  ): Promise<SignedObjectGrant>;

  signDownload(
    config: R2PrivateStorageConfig,
    request: DownloadGrantRequest,
  ): Promise<SignedObjectGrant>;

  inspectObject(
    config: R2PrivateStorageConfig,
    storageKey: string,
  ): Promise<StoredObjectInspection>;

  deleteObject(
    config: R2PrivateStorageConfig,
    storageKey: string,
  ): Promise<void>;
}

const ACCOUNT_ID = /^[a-f0-9]{32}$/i;
const BUCKET_NAME = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

export function validateR2PrivateStorageConfig(
  config: R2PrivateStorageConfig,
): void {
  if (!ACCOUNT_ID.test(config.accountId)) {
    throw new Error("Invalid R2 account ID");
  }

  if (!BUCKET_NAME.test(config.bucketName)) {
    throw new Error("Invalid private R2 bucket name");
  }
}

export function r2S3Endpoint(
  config: R2PrivateStorageConfig,
): string {
  validateR2PrivateStorageConfig(config);
  return `https://${config.accountId}.r2.cloudflarestorage.com`;
}

export class R2PrivateObjectStore
  implements PrivateObjectStore
{
  constructor(
    private readonly config: R2PrivateStorageConfig,
    private readonly signer: R2RequestSigner,
  ) {
    validateR2PrivateStorageConfig(config);
  }

  async createUploadGrant(
    request: UploadGrantRequest,
  ): Promise<SignedObjectGrant> {
    assertPrivateAttachmentStorageKey(request.storageKey);
    validateGrantTtlSeconds(request.expiresInSeconds);
    return this.signer.signUpload(this.config, request);
  }

  async createDownloadGrant(
    request: DownloadGrantRequest,
  ): Promise<SignedObjectGrant> {
    assertPrivateAttachmentStorageKey(request.storageKey);
    validateGrantTtlSeconds(request.expiresInSeconds);
    return this.signer.signDownload(this.config, request);
  }

  async inspectObject(
    storageKey: string,
  ): Promise<StoredObjectInspection> {
    assertPrivateAttachmentStorageKey(storageKey);
    return this.signer.inspectObject(this.config, storageKey);
  }

  async deleteObject(storageKey: string): Promise<void> {
    assertPrivateAttachmentStorageKey(storageKey);
    await this.signer.deleteObject(this.config, storageKey);
  }
}
