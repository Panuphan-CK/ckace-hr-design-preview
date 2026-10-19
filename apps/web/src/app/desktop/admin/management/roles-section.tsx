"use client";

import type { RolePermissionAdminItem } from "@ckace/contracts";

import { Icon } from "../../ui/icons";
import { EmptyState, SectionHead, Toggle } from "../../ui/kit";
import { MANAGEMENT_SECTION_LABEL } from "./management-helpers";
import { mutate, type SectionProps } from "./shared";

export function RolesSection({ data, capabilities, busy, run }: SectionProps) {
  const rbac = data.rbac;
  if (!rbac) return null;

  async function toggleRolePermission(role: RolePermissionAdminItem, permission: string, enabled: boolean) {
    if (!capabilities.rbacAdminWrite) return;
    const next = new Set(role.permissions);
    if (enabled) next.add(permission);
    else next.delete(permission);
    await run(
      "role-" + role.id + "-" + permission,
      () =>
        mutate("/api/management/roles/" + encodeURIComponent(role.id) + "/permissions", "PUT", {
          permissions: [...next],
        }),
      "บันทึกสิทธิ์การใช้งานแล้ว",
    );
  }

  return (
    <>
      <SectionHead title={MANAGEMENT_SECTION_LABEL.roles} id="roles" count={rbac.roles.length} />
      {rbac.permissionCatalog.length === 0 ? (
        <EmptyState title="ยังไม่มีรายการสิทธิ์" icon="lock" />
      ) : (
        <div className="ck-grid-wrap">
          <div className="ck-tablewrap">
            <table className="ck-table ck-grid ck-mg-matrix">
              <thead>
                <tr>
                  <th>รายการเมนู / สิทธิ์</th>
                  {rbac.roles.map((role) => (
                    <th key={role.id} style={{ textAlign: "center" }}>
                      <div className="ck-mg-rolehead">
                        <span className="ck-mg-avatar" aria-hidden="true">
                          {role.name.slice(0, 1)}
                        </span>
                        <small>{role.name}</small>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rbac.permissionCatalog.map((permission) => (
                  <tr key={permission}>
                    <td className="ck-mg-perm">
                      <Icon name="apps" size={16} />
                      {permission}
                    </td>
                    {rbac.roles.map((role) => (
                      <td key={role.id} style={{ textAlign: "center" }}>
                        <Toggle
                          checked={role.permissions.includes(permission)}
                          disabled={!capabilities.rbacAdminWrite || Boolean(busy)}
                          label={role.name + " : " + permission}
                          onChange={(next) => void toggleRolePermission(role, permission, next)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
