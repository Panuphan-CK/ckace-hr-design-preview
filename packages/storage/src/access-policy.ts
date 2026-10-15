import {
  hasPermission,
  type InternalActorContext,
} from "@ckace/auth";

import type {
  AttachmentAccessOperation,
  PrivateAttachmentDescriptor,
} from "./types";

const PERMISSIONS = {
  employee: {
    READ: "storage.attachment.self.read",
    WRITE: "storage.attachment.self.write",
    DELETE: "storage.attachment.self.delete",
  },
  global: {
    READ: "storage.attachment.global.read",
    WRITE: "storage.attachment.global.write",
    DELETE: "storage.attachment.global.delete",
  },
  medicalSelf: {
    READ: "medical.attachment.self.read",
    WRITE: "medical.attachment.self.write",
    DELETE: "medical.attachment.self.delete",
  },
  medicalGlobal: {
    READ: "medical.attachment.global.read",
    WRITE: "medical.attachment.global.write",
    DELETE: "medical.attachment.global.delete",
  },
  internal: {
    READ: "storage.attachment.internal.read",
    WRITE: "storage.attachment.internal.write",
    DELETE: "storage.attachment.internal.delete",
  },
  admin: {
    READ: "storage.attachment.admin.read",
    WRITE: "storage.attachment.admin.write",
    DELETE: "storage.attachment.admin.delete",
  },
} as const;

export class PrivateStorageAuthorizationError extends Error {
  constructor() {
    super("Private attachment access denied");
    this.name = "PrivateStorageAuthorizationError";
  }
}

export function canAccessPrivateAttachment(
  actor: InternalActorContext,
  attachment: Pick<
    PrivateAttachmentDescriptor,
    "ownerEmployeeId" | "privacyClass"
  >,
  operation: AttachmentAccessOperation,
): boolean {
  switch (attachment.privacyClass) {
    case "EMPLOYEE_PRIVATE":
      return (
        (attachment.ownerEmployeeId === actor.employeeId &&
          hasPermission(actor, PERMISSIONS.employee[operation])) ||
        hasPermission(actor, PERMISSIONS.global[operation])
      );
    case "MEDICAL_PRIVATE":
      return (
        (attachment.ownerEmployeeId === actor.employeeId &&
          hasPermission(actor, PERMISSIONS.medicalSelf[operation])) ||
        hasPermission(actor, PERMISSIONS.medicalGlobal[operation])
      );
    case "INTERNAL":
      return hasPermission(actor, PERMISSIONS.internal[operation]);
    case "ADMIN_PRIVATE":
      return hasPermission(actor, PERMISSIONS.admin[operation]);
    default: {
      const exhaustive: never = attachment.privacyClass;
      return exhaustive;
    }
  }
}

export function assertPrivateAttachmentAccess(
  actor: InternalActorContext,
  attachment: Pick<
    PrivateAttachmentDescriptor,
    "ownerEmployeeId" | "privacyClass"
  >,
  operation: AttachmentAccessOperation,
): void {
  if (!canAccessPrivateAttachment(actor, attachment, operation)) {
    throw new PrivateStorageAuthorizationError();
  }
}

export const PRIVATE_STORAGE_PERMISSIONS = PERMISSIONS;
