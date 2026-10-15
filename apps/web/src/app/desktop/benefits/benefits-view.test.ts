import { describe, expect, it } from "vitest";

import type {
  BenefitsSelfOverview,
} from "@ckace/contracts";

import {
  benefitSourceHref,
  benefitStatusLabel,
  benefitValueLabel,
  benefitsMetrics,
  filterBenefitsRequests,
} from "./benefits-view";

const overview: BenefitsSelfOverview = {
  medicalEntitlement: {
    annualLimit: 10_000,
    approved: 1_200,
    committed: 1_700,
    remaining: 8_300,
  },
  requests: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      kind: "OVERTIME",
      date: "2026-10-05",
      startTime: "18:00",
      endTime: "20:00",
      value: 2,
      reason: "ปิดงบ",
      status: "APPROVED",
      comment: null,
      submittedAt: "2026-10-05T10:00:00.000Z",
      attachments: [],
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      kind: "MEDICAL",
      date: "2026-10-04",
      startTime: null,
      endTime: null,
      value: 500,
      reason: "คลินิก",
      status: "PENDING",
      comment: null,
      submittedAt: "2026-10-04T10:00:00.000Z",
      attachments: [
        {
          attachmentId:
            "00000000-0000-4000-8000-000000000003",
          label: "receipt.pdf",
        },
      ],
    },
  ],
};

describe("Desktop Benefits helpers", () => {
  it("derives request metrics without mixing OT hours and medical baht", () => {
    expect(benefitsMetrics(overview)).toEqual({
      totalRequests: 2,
      overtimeRequests: 1,
      medicalRequests: 1,
      pendingRequests: 1,
      approvedRequests: 1,
    });
  });

  it("filters by request kind and status", () => {
    expect(
      filterBenefitsRequests(
        overview.requests,
        "MEDICAL",
        "PENDING",
      ),
    ).toHaveLength(1);
    expect(
      filterBenefitsRequests(
        overview.requests,
        "OVERTIME",
        "ALL",
      ),
    ).toHaveLength(1);
  });

  it("formats value and source links by canonical request kind", () => {
    expect(
      benefitValueLabel(overview.requests[0]!),
    ).toBe("2 ชม.");
    expect(
      benefitValueLabel(overview.requests[1]!),
    ).toContain("500");
    expect(benefitSourceHref("OVERTIME")).toBe(
      "/desktop/overtime",
    );
    expect(benefitSourceHref("MEDICAL")).toBe(
      "/desktop/medical",
    );
    expect(benefitStatusLabel("APPROVED")).toBe(
      "อนุมัติแล้ว",
    );
  });
});
