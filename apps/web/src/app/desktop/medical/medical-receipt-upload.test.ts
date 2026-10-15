import { describe, expect, it, vi } from "vitest";

import {
  completeMedicalReceiptUploads,
  errorMessage,
  MedicalReceiptFinalizeUncertainError,
  uploadMedicalReceipt,
} from "./medical-receipt-upload";

/** No R2/DB/network. Controlled Fetch responses verify actual Desktop upload path. */
const file = {
  name: "wd13-receipt.pdf", type: "application/pdf", size: 512,
} as File;
const hash = async () => "a".repeat(64);
const id = "00000000-0000-4000-8000-000000000015";
const intent = {
  attachmentId: id,
  upload: {
    url: "https://test-only-upload.invalid/object",
    method: "PUT",
    requiredHeaders: { "content-type": "application/pdf" },
  },
};
const ok = () => ({ ok: true, status: 200 }) as Response;
const bad = (status: number) => ({ ok: false, status }) as Response;
const withIntent = () => ({ ok: true, status: 200, json: async () => intent }) as unknown as Response;


describe("WD-13 explicit retry of ambiguous private receipt finalize", () => {
  const receipt2 = "00000000-0000-4000-8000-000000000016";
  const receipt3 = "00000000-0000-4000-8000-000000000017";
  const files = [file, { ...file, name: "second.pdf" } as File, { ...file, name: "third.pdf" } as File];

  it("resumes the SAME uncertain attachment ID on an explicit retry; never uploads it twice", async () => {
    const progress = { signature: "same-intent", receipts: [] as Array<{ id: string; finalized: boolean }> };
    const upload = vi.fn().mockResolvedValueOnce(id)
      .mockRejectedValueOnce(new MedicalReceiptFinalizeUncertainError(receipt2))
      .mockResolvedValueOnce(receipt3);
    const finalize = vi.fn().mockResolvedValue(undefined);

    await expect(completeMedicalReceiptUploads(files, progress, upload, finalize))
      .rejects.toBeInstanceOf(MedicalReceiptFinalizeUncertainError);
    expect(progress.receipts).toEqual([
      { id, finalized: true },
      { id: receipt2, finalized: false },
    ]);
    expect(upload).toHaveBeenCalledTimes(2);
    expect(finalize).not.toHaveBeenCalled(); // no automatic business-write retry

    await expect(completeMedicalReceiptUploads(files, progress, upload, finalize))
      .resolves.toEqual([id, receipt2, receipt3]);
    expect(finalize).toHaveBeenCalledOnce();
    expect(finalize).toHaveBeenCalledWith(receipt2);
    expect(upload).toHaveBeenCalledTimes(3); // only third receipt is new
    expect(progress.receipts.every((receipt) => receipt.finalized)).toBe(true);

    await expect(completeMedicalReceiptUploads(files, progress, upload, finalize))
      .resolves.toEqual([id, receipt2, receipt3]);
    expect(upload).toHaveBeenCalledTimes(3); // no duplicate on further same-intent submission
    expect(finalize).toHaveBeenCalledTimes(1);
  });

  it("keeps unknown finalize pending across repeated failures and never creates a new upload", async () => {
    const progress = {
      signature: "same-intent", receipts: [{ id: receipt2, finalized: false }],
    };
    const upload = vi.fn();
    const finalize = vi.fn().mockRejectedValueOnce(new MedicalReceiptFinalizeUncertainError(receipt2))
      .mockResolvedValueOnce(undefined);

    await expect(completeMedicalReceiptUploads([file], progress, upload, finalize))
      .rejects.toBeInstanceOf(MedicalReceiptFinalizeUncertainError);
    expect(progress.receipts[0]?.finalized).toBe(false);
    expect(upload).not.toHaveBeenCalled();

    await expect(completeMedicalReceiptUploads([file], progress, upload, finalize))
      .resolves.toEqual([receipt2]);
    expect(progress.receipts[0]?.finalized).toBe(true);
    expect(upload).not.toHaveBeenCalled();
  });

  it("preserves successful first upload while a later file fails before finalize", async () => {
    const progress = { signature: "same-intent", receipts: [] as Array<{ id: string; finalized: boolean }> };
    const upload = vi.fn().mockResolvedValueOnce(id).mockRejectedValueOnce(new Error("upload failed"));
    await expect(completeMedicalReceiptUploads(files, progress, upload, vi.fn()))
      .rejects.toThrow("upload failed");
    expect(progress.receipts).toEqual([{ id, finalized: true }]);
  });
});

describe("WD-13 Medical private receipt finalize failure safety", () => {
  it("completes intent, upload and finalize once without deleting valid private receipt", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(withIntent()).mockResolvedValueOnce(ok()).mockResolvedValueOnce(ok());
    await expect(uploadMedicalReceipt(file, fetcher, hash)).resolves.toBe(id);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[0]?.[0]).toBe("/api/attachments/upload-intent");
    expect(fetcher.mock.calls[1]?.[0]).toBe(intent.upload.url);
    expect(fetcher.mock.calls[2]?.[0]).toBe(`/api/attachments/${id}/finalize`);
    expect(fetcher.mock.calls.every(([url]) => !String(url).includes("/medical/claims"))).toBe(true);
  });

  it("attempts best-effort deletion only after a definite non-2xx upload response, before finalize", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(withIntent()).mockResolvedValueOnce(bad(400)).mockResolvedValueOnce(ok());
    await expect(uploadMedicalReceipt(file, fetcher, hash)).rejects.toThrow(/อัปโหลดใบเสร็จไม่สำเร็จ/);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[2]?.[0]).toBe(`/api/attachments/${id}`);
    expect(fetcher.mock.calls[2]?.[1]).toMatchObject({ method: "DELETE", credentials: "same-origin" });
  });

  it.each([400, 409, 500, 503])("preserves R2 receipt after ambiguous finalize HTTP %s (no DELETE)", async status => {
    const fetcher = vi.fn().mockResolvedValueOnce(withIntent()).mockResolvedValueOnce(ok()).mockResolvedValueOnce(bad(status));
    await expect(uploadMedicalReceipt(file, fetcher, hash)).rejects.toMatchObject({
      name: "MedicalReceiptFinalizeUncertainError", attachmentId: id,
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls.some(([, opts]) => (opts as RequestInit | undefined)?.method === "DELETE")).toBe(false);
  });

  it("preserves R2 receipt when finalize network connection is lost", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(withIntent()).mockResolvedValueOnce(ok()).mockRejectedValueOnce(new Error("connection lost"));
    await expect(uploadMedicalReceipt(file, fetcher, hash)).rejects.toMatchObject({
      name: "MedicalReceiptFinalizeUncertainError", attachmentId: id,
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls.some(([, opts]) => (opts as RequestInit | undefined)?.method === "DELETE")).toBe(false);
  });

  it("retains Thai session error wording for failed upload intent and creates no attachment", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(bad(401));
    await expect(uploadMedicalReceipt(file, fetcher, hash)).rejects.toThrow(errorMessage(401));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
