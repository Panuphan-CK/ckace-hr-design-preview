const SHA256_HEX = /^[0-9a-f]{64}$/i;
const MIME_TYPE = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i;

export const MAX_PRIVATE_ATTACHMENT_BYTES =
  20 * 1024 * 1024;

export function validateUploadMetadata(input: {
  readonly originalFilename: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly checksumSha256: string;
}): void {
  const trimmedFilename = input.originalFilename.trim();

  if (
    trimmedFilename.length === 0 ||
    trimmedFilename.length > 255 ||
    trimmedFilename.includes("/") ||
    trimmedFilename.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(trimmedFilename)
  ) {
    throw new Error("Invalid original filename");
  }

  if (!MIME_TYPE.test(input.mimeType) || input.mimeType.length > 127) {
    throw new Error("Invalid MIME type");
  }

  if (
    !Number.isSafeInteger(input.sizeBytes) ||
    input.sizeBytes <= 0 ||
    input.sizeBytes > MAX_PRIVATE_ATTACHMENT_BYTES
  ) {
    throw new Error("Invalid attachment size");
  }

  if (!SHA256_HEX.test(input.checksumSha256)) {
    throw new Error("Invalid SHA-256 checksum");
  }
}

export function validateGrantTtlSeconds(
  expiresInSeconds: number,
): void {
  if (
    !Number.isSafeInteger(expiresInSeconds) ||
    expiresInSeconds < 30 ||
    expiresInSeconds > 900
  ) {
    throw new Error(
      "Private object grant TTL must be between 30 and 900 seconds",
    );
  }
}
