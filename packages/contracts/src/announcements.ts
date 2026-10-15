export type AnnouncementScope = "GLOBAL" | "AGENCY" | "DEPARTMENT";
export interface AnnouncementView {
  readonly id: string; readonly title: string | null; readonly content: string;
  readonly scope: AnnouncementScope; readonly publishedAt: string | null; readonly hasAttachment: boolean;
  readonly attachmentIds: readonly string[];
}
export interface AnnouncementListResult {
  readonly dataStatus: "AVAILABLE" | "SOURCE_MISSING";
  readonly announcements: readonly AnnouncementView[];
}

export interface AnnouncementAdminItem extends AnnouncementView {
  readonly agencyId: string | null;
  readonly agencyName: string | null;
  readonly departmentId: string | null;
  readonly departmentName: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AnnouncementAdminListResult {
  readonly announcements: readonly AnnouncementAdminItem[];
  readonly agencies: readonly {
    readonly id: string;
    readonly name: string;
  }[];
  readonly departments: readonly {
    readonly id: string;
    readonly name: string;
  }[];
}
export interface AnnouncementCreateInput {
  readonly title?: string | null; readonly content: string; readonly scope: AnnouncementScope;
  readonly agencyId?: string | null; readonly departmentId?: string | null;
  readonly attachmentIds?: readonly string[]; readonly publishNow?: boolean;
}
export interface AnnouncementCreateResult { readonly announcement: AnnouncementView; }
export interface AnnouncementUpdateResult { readonly announcement: AnnouncementView; }
export interface AnnouncementDeleteResult { readonly announcementId: string; readonly deleted: true; }
