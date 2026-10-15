import { describe, expect, it } from "vitest";

import {
  desktopWriteFailureKind,
  resolveSubmissionIntent,
  shouldDiscardSubmissionIntent,
} from "./submission-intent";

describe("Desktop write submission intent", () => {
  it("reuses the same idempotency key after an ambiguous response", () => {
    const first = resolveSubmissionIntent(null, { day: "2026-10-01", reason: "medical" }, () => "id-a");
    const retry = resolveSubmissionIntent(first, { day: "2026-10-01", reason: "medical" }, () => "id-b");
    expect(retry).toBe(first);
    expect(retry.clientKey).toBe("id-a");
  });

  it("rotates the key if the payload changes, or after explicit success reset", () => {
    const first = resolveSubmissionIntent(null, { amount: 100 }, () => "id-a");
    expect(resolveSubmissionIntent(first, { amount: 200 }, () => "id-b").clientKey).toBe("id-b");
    expect(resolveSubmissionIntent(null, { amount: 100 }, () => "id-c").clientKey).toBe("id-c");
  });

  it.each([
    [401, "SESSION_EXPIRED"],
    [403, "PERMISSION_DENIED"],
    [409, "CONFLICT"],
  ] as const)("treats HTTP %i as a definite write failure", (status, kind) => {
    expect(desktopWriteFailureKind(status)).toBe(kind);
    expect(shouldDiscardSubmissionIntent(status)).toBe(true);
  });

  it("keeps the key for an ambiguous 503 and for a network loss", () => {
    expect(desktopWriteFailureKind(503)).toBe("AMBIGUOUS");
    expect(shouldDiscardSubmissionIntent(503)).toBe(false);

    const first = resolveSubmissionIntent(null, { amount: 100 }, () => "id-a");
    const afterNetworkLoss = resolveSubmissionIntent(first, { amount: 100 }, () => "id-b");
    expect(afterNetworkLoss.clientKey).toBe("id-a");

    const afterDefiniteFailure = resolveSubmissionIntent(
      shouldDiscardSubmissionIntent(409) ? null : first,
      { amount: 100 },
      () => "id-c",
    );
    expect(afterDefiniteFailure.clientKey).toBe("id-c");
  });
});
