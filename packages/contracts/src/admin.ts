export interface NotificationAdminItem {
  readonly id: string; readonly aggregateType: string; readonly aggregateId: string; readonly eventType: string;
  readonly status: "PENDING" | "PROCESSING" | "SENT" | "FAILED" | "CANCELLED";
  readonly attempts: number; readonly lastError: string | null; readonly availableAt: string;
  readonly createdAt: string; readonly deliveryCount: number;
}
export interface NotificationAdminOverview {
  readonly canRetry: boolean;
  readonly notifications: readonly NotificationAdminItem[];
}
export interface NotificationRetryResult { readonly id: string; readonly status: "PENDING"; }
export interface AdminSettingsView {
  readonly runtimeStage: string; readonly moduleRouting: "LEGACY" | "NEW" | "MIXED";
  readonly storageProvider: "R2"; readonly permanentPublicStorageUrls: false;
  readonly protectedActorRequiresActiveAccount: true; readonly pendingLineBindingSupported: true;
}
