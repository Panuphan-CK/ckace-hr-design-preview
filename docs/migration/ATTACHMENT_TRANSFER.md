# Local attachment copy rehearsal tool

`scripts/migration/copy-local-attachments-to-r2.mjs` reads files downloaded by the Owner into a local folder. It does not use Google APIs. Default mode is dry-run: it verifies source-file paths and SHA-256 values and produces a manifest summary without creating an R2 client, reading credentials, or making network calls.

## External manifest

Keep the manifest and downloaded files outside Git. Each file entry must provide:

- `sourceAttachmentId`: stable legacy file ID;
- `relativePath`: POSIX-style path inside the download folder;
- `targetAttachmentId`: target attachment UUID;
- `storageKey`: private `attachments/v1/<targetAttachmentId>/<versionUUID>` key;
- `privacyClass`: `INTERNAL`, `EMPLOYEE_PRIVATE`, `MEDICAL_PRIVATE`, or `ADMIN_PRIVATE`;
- `mimeType` and `expectedSha256` from a trusted export/checksum process.

The tool rejects path traversal, symlinks, files resolving outside the selected folder, duplicate source/target IDs or storage keys, public/non-private keys, and checksum mismatches. It prints source IDs, storage keys, byte counts, hashes, and status; it does not print local filenames or directory paths.

## Dry-run (used for this task)

```powershell
node scripts/migration/copy-local-attachments-to-r2.mjs `
  --source-dir "$env:TEMP\ckace-drive-download" `
  --manifest "$env:TEMP\ckace-attachment-manifest.json"
```

The output must say `DRY_RUN_NO_UPLOAD`, with `filesUploaded = 0` and `filesVerified = 0`. This task does not run the upload mode.

## Guarded TEST upload mode (not run in this task)

The separate `--apply` path requires all of the following: `CKACE_ATTACHMENT_COPY_APPLY=YES`, `CKACE_RUNTIME_STAGE=dev`, `CKACE_SYSTEM_WRITE_MODE=READ_ONLY`, `CKACE_MIGRATION_JOB=YES`, and `R2_BUCKET_NAME=ckace-hr-test-private`, plus locally supplied TEST R2 credentials. It uploads using a private signed URL and downloads each object for byte-count and SHA-256 verification. Production bucket names are rejected. A mismatch stops the run; the script never deletes uploaded objects automatically.

The script copies object bytes only. Database attachment metadata/ownership/request links must be imported and reconciled separately before users can access these files. No file bytes or manifest with personal details belong in Git or migration evidence.
