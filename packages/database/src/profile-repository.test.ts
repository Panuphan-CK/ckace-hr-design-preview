import type { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { PrismaSelfProfileRepository } from "./profile-repository";

describe("PrismaSelfProfileRepository", () => {
  it("selects and returns only the privacy-minimized profile projection", async () => {
    let query: unknown;
    const prisma = {
      employee: {
        findUnique: async (input: unknown) => {
          query = input;
          return {
            id: "00000000-0000-4000-8000-000000000001",
            fullName: "Example Employee",
            nickname: "Example",
            dateOfBirth: new Date("1990-01-02T00:00:00.000Z"),
            employmentStart: new Date("2020-03-04T00:00:00.000Z"),
            resignationDate: null,
            agency: {
              id: "00000000-0000-4000-8000-000000000002",
              name: "Agency",
            },
            department: {
              id: "00000000-0000-4000-8000-000000000003",
              name: "Department",
            },
            userAccount: {
              loginName: "employee@example.test",
              state: "ACTIVE",
              roles: [
                { role: { key: "EMPLOYEE" } },
                { role: { key: "EMPLOYEE" } },
              ],
            },
            lineAccount: { id: "line-binding-row" },
            media: [
              {
                kind: "PROFILE",
                attachmentId:
                  "00000000-0000-4000-8000-000000000004",
              },
            ],
          };
        },
      },
    } as unknown as PrismaClient;

    const repository = new PrismaSelfProfileRepository(prisma);
    const result = await repository.findSelfProfile(
      "00000000-0000-4000-8000-000000000001",
    );

    expect(result).toEqual({
      employeeId: "00000000-0000-4000-8000-000000000001",
      fullName: "Example Employee",
      nickname: "Example",
      dateOfBirth: "1990-01-02",
      employmentStart: "2020-03-04",
      resignationDate: null,
      accountState: "ACTIVE",
      loginName: "employee@example.test",
      agency: {
        id: "00000000-0000-4000-8000-000000000002",
        name: "Agency",
      },
      department: {
        id: "00000000-0000-4000-8000-000000000003",
        name: "Department",
      },
      roles: ["EMPLOYEE"],
      lineLinked: true,
      profileAttachmentId:
        "00000000-0000-4000-8000-000000000004",
      signatureAttachmentId: null,
    });

    const serializedQuery = JSON.stringify(query);
    expect(serializedQuery).not.toContain("legacyPasswordHash");
    expect(serializedQuery).not.toContain("lineUserId");
    expect(serializedQuery).not.toContain("storageKey");
    expect(serializedQuery).not.toContain("legacyDriveUrl");
  });

  it("fails closed when the employee has no user account", async () => {
    const prisma = {
      employee: {
        findUnique: async () => ({
          id: "00000000-0000-4000-8000-000000000001",
          fullName: "No Account",
          nickname: null,
          dateOfBirth: null,
          employmentStart: null,
          resignationDate: null,
          agency: null,
          department: null,
          userAccount: null,
          lineAccount: null,
          media: [],
        }),
      },
    } as unknown as PrismaClient;

    await expect(
      new PrismaSelfProfileRepository(prisma).findSelfProfile(
        "00000000-0000-4000-8000-000000000001",
      ),
    ).resolves.toBeNull();
  });
});
