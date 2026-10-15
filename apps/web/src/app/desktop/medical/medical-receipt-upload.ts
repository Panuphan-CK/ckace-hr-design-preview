import type { AttachmentUploadIntentResult } from "@ckace/contracts";

export function errorMessage(status: number): string {
  if (status === 401) {
    return "หมดเวลาการเข้าใช้งาน กรุณาเข้าสู่ระบบใหม่";
  }
  if (status === 403) {
    return "บัญชีนี้ไม่มีสิทธิ์ใช้งานค่ารักษาพยาบาล";
  }
  if (status === 409) {
    return "วงเงินหรือสถานะรายการเปลี่ยนแล้ว กรุณารีเฟรชข้อมูล";
  }
  if (status === 503) {
    return "โมดูลค่ารักษาพยาบาลยังไม่เปิดใช้งานใน environment นี้";
  }
  return "ไม่สามารถดำเนินการค่ารักษาพยาบาลได้ กรุณาลองใหม่อีกครั้ง";
}

/** The uploaded object may already be finalized after a lost/failed response.
 * Never delete a private receipt when its finalize result is uncertain.
 */
async function checksumSha256(file: File): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function uploadMedicalReceipt(
  file: File,
  fetcher: typeof fetch = fetch,
  hashFile: (file: File) => Promise<string> = checksumSha256,
): Promise<string> {
  const checksum = await hashFile(file);
  const intentResponse = await fetcher("/api/attachments/upload-intent", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      privacyClass: "MEDICAL_PRIVATE",
      originalFilename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      checksumSha256: checksum,
    }),
  });
  if (!intentResponse.ok) {
    throw new Error(errorMessage(intentResponse.status));
  }

  const intent = (await intentResponse.json()) as AttachmentUploadIntentResult;
  const upload = await fetcher(intent.upload.url, {
    method: intent.upload.method,
    headers: intent.upload.requiredHeaders,
    body: file,
  });
  if (!upload.ok) {
    // No claim can reference this receipt yet. Best-effort cleanup of failed upload.
    await fetcher(
      `/api/attachments/${encodeURIComponent(intent.attachmentId)}`,
      { method: "DELETE", credentials: "same-origin" },
    ).catch(() => undefined);
    throw new Error("อัปโหลดใบเสร็จไม่สำเร็จ");
  }

  // A lost finalize response might follow a successful server commit.
  // Retain the attachment ID so a same-intent retry can finalize the SAME object.
  await finalizeMedicalReceipt(intent.attachmentId, fetcher);
  return intent.attachmentId;
}

export class MedicalReceiptFinalizeUncertainError extends Error {
  constructor(readonly attachmentId: string) {
    super("ยังยืนยันไฟล์ใบเสร็จไม่ได้ กรุณาลองส่งคำขอเดิมอีกครั้ง");
    this.name = "MedicalReceiptFinalizeUncertainError";
  }
}

export async function finalizeMedicalReceipt(
  attachmentId: string,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  try {
    const response = await fetcher(
      `/api/attachments/${encodeURIComponent(attachmentId)}/finalize`,
      { method: "POST", credentials: "same-origin" },
    );
    if (!response.ok) {
      throw new MedicalReceiptFinalizeUncertainError(attachmentId);
    }
  } catch {
    // Neither a network exception nor HTTP failure proves the finalize rolled back.
    throw new MedicalReceiptFinalizeUncertainError(attachmentId);
  }
}

export interface MedicalReceiptProgress {
  readonly signature: string;
  readonly receipts: Array<{ readonly id: string; finalized: boolean }>;
}

/** Keep completed uploads and uncertain finalize IDs in memory for same-intent retry.
 * No automatic retry is performed. The next explicit user submission resumes.
 */
export async function completeMedicalReceiptUploads(
  files: readonly File[],
  progress: MedicalReceiptProgress,
  upload: (file: File) => Promise<string> = uploadMedicalReceipt,
  finalize: (id: string) => Promise<void> = finalizeMedicalReceipt,
): Promise<string[]> {
  for (let index = 0; index < files.length; index += 1) {
    const previous = progress.receipts[index];
    if (previous) {
      if (!previous.finalized) {
        await finalize(previous.id);
        previous.finalized = true;
      }
      continue;
    }

    try {
      const id = await upload(files[index]!);
      progress.receipts.push({ id, finalized: true });
    } catch (error) {
      if (error instanceof MedicalReceiptFinalizeUncertainError) {
        // A successful raw upload exists. Never create a second object on retry.
        progress.receipts.push({ id: error.attachmentId, finalized: false });
      }
      throw error;
    }
  }
  return progress.receipts.map((receipt) => receipt.id);
}
