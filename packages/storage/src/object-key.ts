import { randomUUID } from "node:crypto";

const UUID_PATTERN =
  "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const STORAGE_KEY_PATTERN = new RegExp(
  `^attachments/v1/(${UUID_PATTERN})/(${UUID_PATTERN})$`,
  "i",
);

export function createPrivateAttachmentStorageKey(
  attachmentId: string,
): string {
  if (!new RegExp(`^${UUID_PATTERN}$`, "i").test(attachmentId)) {
    throw new Error("attachmentId must be a UUID");
  }

  return `attachments/v1/${attachmentId}/${randomUUID()}`;
}

export function assertPrivateAttachmentStorageKey(
  storageKey: string,
): void {
  if (!STORAGE_KEY_PATTERN.test(storageKey)) {
    throw new Error("Invalid private attachment storage key");
  }
}
