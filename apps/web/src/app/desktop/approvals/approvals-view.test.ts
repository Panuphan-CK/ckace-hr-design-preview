import { describe, expect, it } from "vitest";
import type { ApprovalHistoryItem, RequestStatusItem } from "@ckace/contracts";
import {
  countByKind,
  decisionEndpoint,
  decisionPayload,
  initials,
  kindFromHash,
  kindHash,
  matchesFilter,
  sortHistory,
  sortPending,
} from "./approvals-view";

function pending(overrides: Partial<RequestStatusItem> = {}): RequestStatusItem {
  return {
    id: "r 1",
    kind: "LEAVE",
    status: "PENDING",
    submittedAt: "2026-10-10T00:00:00.000Z",
    summary: "ลาพักร้อน 2 วัน",
    decisionReason: null,
    employeeId: "e1",
    employeeDisplayName: "สมชาย ทองดี",
    canDecide: true,
    approvalStepId: "step-1",
    stepOrder: 1,
    ...overrides,
  };
}

function history(overrides: Partial<ApprovalHistoryItem> = {}): ApprovalHistoryItem {
  return {
    id: "h1",
    requestId: "r1",
    kind: "OVERTIME",
    decision: "APPROVED",
    submittedAt: "2026-10-01T00:00:00.000Z",
    decidedAt: "2026-10-02T00:00:00.000Z",
    summary: "OT 2 ชม.",
    comment: null,
    employeeId: "e1",
    stepOrder: 1,
    ...overrides,
  };
}

describe("approvals view", () => {
  it("maps kinds to decision endpoints and escapes ids", () => {
    expect(decisionEndpoint(pending())).toBe("/api/leave/requests/r%201/decision");
    expect(decisionEndpoint(pending({ kind: "TIME_CORRECTION" }))).toContain("/api/attendance/time-corrections/");
    expect(decisionEndpoint(pending({ kind: "OVERTIME" }))).toContain("/api/overtime/requests/");
    expect(decisionEndpoint(pending({ kind: "MEDICAL" }))).toContain("/api/medical/claims/");
  });

  it("only leave decisions carry the approval step id", () => {
    expect(decisionPayload(pending(), "APPROVED", "")).toEqual({ approvalStepId: "step-1", decision: "APPROVED", comment: null });
    expect(decisionPayload(pending({ kind: "OVERTIME" }), "REJECTED", "ไม่ผ่าน")).toEqual({ decision: "REJECTED", comment: "ไม่ผ่าน" });
  });

  it("filters by kind and search text", () => {
    const row = pending();
    expect(matchesFilter(row, "ALL", "")).toBe(true);
    expect(matchesFilter(row, "OVERTIME", "")).toBe(false);
    expect(matchesFilter(row, "LEAVE", "สมชาย")).toBe(true);
    expect(matchesFilter(row, "LEAVE", "ไม่มีคำนี้")).toBe(false);
    expect(matchesFilter(history({ comment: "เอกสารไม่ครบ" }), "ALL", "เอกสาร")).toBe(true);
  });

  it("counts per kind and sorts", () => {
    const counts = countByKind([pending(), pending({ id: "2" }), pending({ id: "3", kind: "MEDICAL" })]);
    expect(counts.get("LEAVE")).toBe(2);
    expect(counts.get("MEDICAL")).toBe(1);
    expect(sortPending([pending({ id: "new", submittedAt: "2026-10-12T00:00:00.000Z" }), pending({ id: "old" })]).map((r) => r.id)).toEqual(["old", "new"]);
    expect(sortHistory([history({ id: "a" }), history({ id: "b", decidedAt: "2026-10-05T00:00:00.000Z" })]).map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("round-trips the url hash and builds initials", () => {
    expect(kindFromHash("#time-correction")).toBe("TIME_CORRECTION");
    expect(kindFromHash("#unknown")).toBe("ALL");
    expect(kindFromHash(kindHash("MEDICAL"))).toBe("MEDICAL");
    expect(initials("สมชาย ทองดี")).toBe("สท");
    expect(initials(undefined)).toBe("—");
  });
});
