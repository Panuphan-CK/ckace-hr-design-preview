# Local attachment transfer from an Owner-downloaded Drive snapshot

The simplest source capture is for the Owner to open the relevant Drive folder, use **Download** to get one ZIP, and extract it to a staging folder outside the repository. Keep the extracted folder hierarchy. This is a manual Owner action; the copier does not use Google APIs, Drive credentials, or Project A.

`scripts/migration/copy-local-attachments-to-r2.mjs` reads that local folder. Default mode is dry-run: it resolves each source attachment, computes SHA-256, checks any supplied checksum and produces a count/verification summary without creating an R2 client, reading credentials, or making network calls.

## Mapping rules

Keep the manifest and downloaded files outside Git. Each file entry must provide:

- `sourceAttachmentId`: stable legacy file ID;
- `targetAttachmentId`: target attachment UUID;
- `storageKey`: private `attachments/v1/<targetAttachmentId>/<versionUUID>` key;
- `privacyClass`: `INTERNAL`, `EMPLOYEE_PRIVATE`, `MEDICAL_PRIVATE`, or `ADMIN_PRIVATE`;
- `mimeType`;
- optionally `originalFilename` and/or `expectedSha256`;
- optionally `relativePath` when metadata cannot safely identify one unique file.

If `originalFilename` is present (as on `MedicalAttachments`), the copier first searches for an exact basename match, case-insensitively. If there is no exact name match, it searches for a file whose basename without extension equals `FileID`. `Attachments` has a `FileID` column but no filename column in the current snapshot, so it can auto-match only when the downloaded file is named with that ID; otherwise the Owner/reviewer must provide an explicit relative path in the external manifest. Missing or multiple matches fail closed; the copier never picks a file by folder order or fuzzy name.

The copier computes SHA-256 from each local file. A supplied `expectedSha256` is checked against that computed value. In the guarded upload path, the source is re-hashed before upload, then the object is downloaded from R2 and both byte length and SHA-256 are compared. Final reconciliation must show every source attachment mapped once, with zero missing, duplicate, ambiguous, or checksum-mismatched files.

## External manifest example

Example shape (store this JSON outside the repository and replace placeholders with the real export mapping):

```json
{
  "schemaVersion": 1,
  "files": [
    {
      "sourceAttachmentId": "FILE-ID-FROM-SHEET",
      "originalFilename": "receipt.pdf",
      "targetAttachmentId": "11111111-1111-4111-8111-111111111111",
      "storageKey": "attachments/v1/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222",
      "privacyClass": "MEDICAL_PRIVATE",
      "mimeType": "application/pdf"
    }
  ]
}
```

For `Attachments` rows without a filename field, use `relativePath` if a file does not have a unique basename equal to its `FileID`.

The tool rejects path traversal, symlinks, files resolving outside the selected folder, duplicate source/target IDs or storage keys, public/non-private keys, and checksum mismatches. It prints source IDs, storage keys, byte counts, hashes, and status; it does not print local filenames or directory paths.

## Dry-run (used for this task)

```powershell
node scripts/migration/copy-local-attachments-to-r2.mjs `
  --source-dir "$env:TEMP\ckace-drive-download" `
  --manifest "$env:TEMP\ckace-attachment-manifest.json"
```

The output must say `DRY_RUN_NO_UPLOAD`, with `filesUploaded = 0` and `filesVerified = 0`. Tests cover exact filename and `FileID` matches, missing/ambiguous matches, checksum checks, symlink/path protection, and dry-run with no object-store requests. This task does not run the upload mode.

## Guarded TEST upload mode (not run in this task)

The separate `--apply` path requires all of the following: `CKACE_ATTACHMENT_COPY_APPLY=YES`, `CKACE_RUNTIME_STAGE=dev`, `CKACE_SYSTEM_WRITE_MODE=READ_ONLY`, `CKACE_MIGRATION_JOB=YES`, and `R2_BUCKET_NAME=ckace-hr-test-private`, plus locally supplied TEST R2 credentials. It uploads using a private signed URL and downloads each object for byte-count and SHA-256 verification. Production bucket names are rejected. A mismatch stops the run; the script never deletes uploaded objects automatically.

The script copies object bytes only. Database attachment metadata/ownership/request links must be imported and reconciled separately before users can access these files. No file bytes or manifest with personal details belong in Git or migration evidence.
