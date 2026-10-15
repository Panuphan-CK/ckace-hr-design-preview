/** Reuse one idempotency key for an unchanged user submission after an uncertain response.
 * No automatic business-write retries are performed by this helper. */
export interface SubmissionIntent {
  readonly signature: string;
  readonly clientKey: string;
}

export type DesktopWriteFailureKind =
  | "SESSION_EXPIRED"
  | "PERMISSION_DENIED"
  | "CONFLICT"
  | "DEFINITE_FAILURE"
  | "AMBIGUOUS";

/**
 * Classify a failed business-write response without guessing about a commit.
 * Network failures have no HTTP status and must be treated as ambiguous by
 * callers, which is why this helper only accepts a response status.
 */
export function desktopWriteFailureKind(
  status: number,
): DesktopWriteFailureKind {
  if (status === 401) return "SESSION_EXPIRED";
  if (status === 403) return "PERMISSION_DENIED";
  if (status === 409) return "CONFLICT";
  if (status >= 500) return "AMBIGUOUS";
  return "DEFINITE_FAILURE";
}

/** Keep the intent only when the response may follow a committed write. */
export function shouldDiscardSubmissionIntent(status: number): boolean {
  return desktopWriteFailureKind(status) !== "AMBIGUOUS";
}

export function resolveSubmissionIntent(
  previous: SubmissionIntent | null,
  payload: unknown,
  generateKey: () => string = () =>
    globalThis.crypto.randomUUID(),
): SubmissionIntent {
  const signature = JSON.stringify(payload);
  if (previous?.signature === signature) return previous;
  return { signature, clientKey: generateKey() };
}
