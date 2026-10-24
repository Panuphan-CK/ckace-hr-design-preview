export const DESKTOP_NAV_ACCESSIBLE_NAMES = {
  dashboard: "ภาพรวม",
  calendar: "ปฏิทิน",
  profile: "โปรไฟล์และการแจ้งเตือน",
} as const;

export function desktopSectionAccessibleName(label: string, pendingCount?: number): string {
  if (pendingCount === undefined || !Number.isFinite(pendingCount) || pendingCount <= 0) {
    return label;
  }
  return `${label}, รออนุมัติ ${pendingCount} รายการ`;
}
