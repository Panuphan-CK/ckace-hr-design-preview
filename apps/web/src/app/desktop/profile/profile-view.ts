import type {
  ProfileAccountState,
  SelfProfileResponse,
} from "@ckace/contracts";

export interface ProfileNavigationCapabilities {
  readonly leave: boolean;
  readonly requestStatus: boolean;
  readonly approvals: boolean;
  readonly attendance: boolean;
  readonly overtime: boolean;
  readonly medical: boolean;
  readonly benefits: boolean;
  readonly announcements: boolean;
  readonly notifications: boolean;
  readonly profile: boolean;
  readonly admin: boolean;
}

const NAV_LABELS: Readonly<
  Record<keyof ProfileNavigationCapabilities, string>
> = {
  leave: "การลา",
  requestStatus: "สถานะคำขอ",
  approvals: "งานอนุมัติ",
  attendance: "เวลาเข้างาน",
  overtime: "โอที",
  medical: "ค่ารักษาพยาบาล",
  benefits: "สวัสดิการ",
  announcements: "ข่าวสาร",
  notifications: "Notifications",
  profile: "โปรไฟล์",
  admin: "ผู้ดูแลระบบ",
};

export function profileInitials(
  profile: Pick<SelfProfileResponse, "fullName" | "nickname">,
): string {
  const source = profile.nickname?.trim() || profile.fullName.trim();
  if (!source) return "CK";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export function profileAccountStateLabel(
  state: ProfileAccountState,
): string {
  switch (state) {
    case "ACTIVE":
      return "ใช้งานอยู่";
    case "PENDING":
      return "รออนุมัติ";
    case "INACTIVE":
      return "ไม่ใช้งาน";
    case "RESIGNED":
      return "พ้นสภาพ";
  }
}

export function profileAccountStateClass(
  state: ProfileAccountState,
): string {
  return `profile-account-state state-${state.toLowerCase()}`;
}

export function enabledProfileCapabilities(
  navigation: ProfileNavigationCapabilities,
): readonly string[] {
  return (
    Object.entries(navigation) as Array<
      [keyof ProfileNavigationCapabilities, boolean]
    >
  )
    .filter(([, enabled]) => enabled)
    .map(([key]) => NAV_LABELS[key]);
}
