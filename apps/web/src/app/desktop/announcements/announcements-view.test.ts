import type {
  AnnouncementView,
} from "@ckace/contracts";
import {
  describe,
  expect,
  it,
} from "vitest";

import {
  announcementScopeLabel,
  announcementTitle,
  filterAnnouncements,
} from "./announcements-view";

const announcements: readonly AnnouncementView[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    title: "ปิดระบบชั่วคราว",
    content: "แจ้งปรับปรุงระบบวันเสาร์",
    scope: "GLOBAL",
    publishedAt: "2026-10-07T08:00:00.000Z",
    hasAttachment: true,
    attachmentIds: [
      "00000000-0000-4000-8000-000000000010",
    ],
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    title: null,
    content: "แจ้งเฉพาะแผนกบัญชี",
    scope: "DEPARTMENT",
    publishedAt: "2026-10-06T08:00:00.000Z",
    hasAttachment: false,
    attachmentIds: [],
  },
];

describe("Desktop announcements view helpers", () => {
  it("maps announcement scopes to Thai labels", () => {
    expect(announcementScopeLabel("GLOBAL")).toBe("ทั้งบริษัท");
    expect(announcementScopeLabel("AGENCY")).toBe("หน่วยงาน");
    expect(announcementScopeLabel("DEPARTMENT")).toBe("แผนก");
  });

  it("uses a safe fallback title when source title is absent", () => {
    expect(announcementTitle(announcements[1]!)).toBe(
      "ประกาศทั่วไป",
    );
  });

  it("filters by scope and text without changing source rows", () => {
    expect(
      filterAnnouncements(
        announcements,
        "GLOBAL",
        "ปรับปรุง",
      ).map((item) => item.id),
    ).toEqual([
      "00000000-0000-4000-8000-000000000001",
    ]);

    expect(
      filterAnnouncements(
        announcements,
        "DEPARTMENT",
        "บัญชี",
      ).map((item) => item.id),
    ).toEqual([
      "00000000-0000-4000-8000-000000000002",
    ]);
  });
});
