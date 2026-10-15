import { describe, expect, it } from "vitest";

import type {
  PendingEmployeeAdminItem,
} from "@ckace/contracts";

import {
  onboardingMetrics,
  onboardingSearch,
} from "./onboarding-view";

const rows: readonly PendingEmployeeAdminItem[] = [
  {
    employeeId: "00000000-0000-4000-8000-000000000001",
    fullName: "สมชาย ตัวอย่าง",
    nickname: "ชาย",
    loginName: "somchai",
    dateOfBirth: "1990-01-01",
    employmentStart: "2026-10-01",
    lineLinked: true,
  },
  {
    employeeId: "00000000-0000-4000-8000-000000000002",
    fullName: "Example Employee",
    nickname: null,
    loginName: "example",
    dateOfBirth: null,
    employmentStart: "2026-10-02",
    lineLinked: false,
  },
];

describe("Onboarding Desktop view", () => {
  it("derives pending and LINE-link metrics", () => {
    expect(onboardingMetrics(rows)).toEqual({
      pending: 2,
      lineLinked: 1,
      lineUnlinked: 1,
    });
  });

  it("searches safe employee display fields only", () => {
    expect(onboardingSearch(rows, "somchai")).toHaveLength(1);
    expect(onboardingSearch(rows, "ตัวอย่าง")).toHaveLength(1);
    expect(onboardingSearch(rows, "")).toHaveLength(2);
  });
});
