export type AttachmentPrivacyClass =
  | "INTERNAL"
  | "EMPLOYEE_PRIVATE"
  | "MEDICAL_PRIVATE"
  | "ADMIN_PRIVATE";

export type AttachmentAccessOperation =
  | "READ"
  | "WRITE"
  | "DELETE";

export interface PrivateAttachmentDescriptor {
  readonly id: string;
  readonly ownerEmployeeId: string | null;
  readonly privacyClass: AttachmentPrivacyClass;
  readonly storageProvider: "R2";
  readonly storageKey: string;
  readonly originalFilename: string | null;
  readonly mimeType: string | null;
  readonly sizeBytes: bigint | null;
  readonly checksumSha256: string | null;
}

export interface UploadIntentInput {
  readonly attachmentId: string;
  readonly ownerEmployeeId: string | null;
  readonly privacyClass: AttachmentPrivacyClass;
  readonly originalFilename: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
}

export interface SignedObjectGrant {
  readonly url: string;
  readonly method: "GET" | "PUT";
  readonly expiresAt: Date;
  readonly requiredHeaders: Readonly<Record<string, string>>;
}

export interface UploadIntent {
  readonly storageProvider: "R2";
  readonly storageKey: string;
  readonly grant: SignedObjectGrant;
}

export interface UploadGrantRequest {
  readonly storageKey: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
  readonly expiresInSeconds: number;
}

export interface DownloadGrantRequest {
  readonly storageKey: string;
  readonly downloadFilename: string | null;
  readonly expiresInSeconds: number;
}

export interface StoredObjectInspection {
  readonly sizeBytes: number;
  readonly mimeType: string | null;
  readonly checksumSha256: string;
}

export interface PrivateObjectStore {
  createUploadGrant(
    request: UploadGrantRequest,
  ): Promise<SignedObjectGrant>;

  createDownloadGrant(
    request: DownloadGrantRequest,
  ): Promise<SignedObjectGrant>;

  inspectObject(
    storageKey: string,
  ): Promise<StoredObjectInspection>;

  deleteObject(storageKey: string): Promise<void>;
}
