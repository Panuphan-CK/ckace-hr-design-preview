export type AttachmentPrivacyClass = "INTERNAL" | "EMPLOYEE_PRIVATE" | "MEDICAL_PRIVATE" | "ADMIN_PRIVATE";
export interface AttachmentUploadIntentInput {
  readonly privacyClass: AttachmentPrivacyClass; readonly originalFilename: string;
  readonly mimeType: string; readonly sizeBytes: number; readonly checksumSha256: string;
}
export interface AttachmentSignedGrantView {
  readonly url: string; readonly method: "GET" | "PUT"; readonly expiresAt: string;
  readonly requiredHeaders: Readonly<Record<string, string>>;
}
export interface AttachmentUploadIntentResult { readonly attachmentId: string; readonly upload: AttachmentSignedGrantView; }
export interface AttachmentFinalizeResult { readonly attachmentId: string; readonly finalized: true; }
export interface AttachmentDownloadResult { readonly attachmentId: string; readonly download: AttachmentSignedGrantView; }
export interface AttachmentDeleteResult { readonly attachmentId: string; readonly deleted: true; }
