import type {
  AnnouncementScope,
  AnnouncementView,
} from "@ckace/contracts";

export type AnnouncementScopeFilter =
  | "ALL"
  | AnnouncementScope;

export function announcementScopeLabel(
  scope: AnnouncementScope,
): string {
  switch (scope) {
    case "GLOBAL":
      return "ทั้งบริษัท";
    case "AGENCY":
      return "หน่วยงาน";
    case "DEPARTMENT":
      return "แผนก";
  }
}

export function announcementTitle(
  announcement: AnnouncementView,
): string {
  return announcement.title?.trim() || "ประกาศทั่วไป";
}

export function filterAnnouncements(
  announcements: readonly AnnouncementView[],
  scope: AnnouncementScopeFilter,
  query: string,
): readonly AnnouncementView[] {
  const normalized = query.trim().toLocaleLowerCase("th-TH");
  return announcements.filter((announcement) => {
    if (scope !== "ALL" && announcement.scope !== scope) {
      return false;
    }
    if (!normalized) return true;
    return (
      announcementTitle(announcement)
        .toLocaleLowerCase("th-TH")
        .includes(normalized) ||
      announcement.content
        .toLocaleLowerCase("th-TH")
        .includes(normalized)
    );
  });
}
