"use client";

import type { ManagedEmployeeItem } from "@ckace/contracts";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { Icon } from "../../ui/icons";
import {
  DataGrid,
  DetailDialog,
  EmptyState,
  Filters,
  Message as MessageBox,
  SectionHead,
  SettingRow,
  StatusDot,
  Toggle,
  type GridColumn,
} from "../../ui/kit";
import {
  ACCOUNT_STATE_OPTIONS,
  MANAGEMENT_SECTION_LABEL,
  accountStateInfo,
  computeUserStats,
  containsSearch,
  matchesStateFilter,
  type UserStateFilter,
} from "./management-helpers";
import {
  Field,
  SearchBox,
  StatTile,
  mutate,
  type SectionProps,
} from "./shared";

const STATE_FILTERS = [
  { id: "all", label: "ทั้งหมด" },
  { id: "ACTIVE", label: "ใช้งาน" },
  { id: "PENDING", label: "รออนุมัติ" },
  { id: "OTHER", label: "ไม่ใช้งาน / พ้นสภาพ" },
] as const;

interface UsersSectionProps extends SectionProps {
  readonly resetLink: string | null;
  readonly onIssueRecovery: (employeeId: string) => Promise<void>;
  readonly onCloseUser: () => void;
}

export function UsersSection(props: UsersSectionProps) {
  const { data, capabilities, search, setSearch, onDialog } = props;
  const [filter, setFilter] = useState<UserStateFilter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  const users = data.users ?? [];
  const stats = computeUserStats(users);
  const visible = users.filter(
    (user) =>
      matchesStateFilter(user.state, filter) &&
      containsSearch(
        [
          user.fullName,
          user.loginName,
          user.companyName,
          user.agencyName,
          user.departmentName,
          user.managerName,
          ...user.roles.map((role) => role.name),
        ],
        search,
      ),
  );
  const editing = editingId ? users.find((user) => user.id === editingId) ?? null : null;

  useEffect(() => {
    onDialog(editing !== null);
  }, [editing, onDialog]);

  const close = () => {
    setEditingId(null);
    props.onCloseUser();
  };

  const columns: GridColumn<ManagedEmployeeItem>[] = [
    {
      key: "name",
      header: "พนักงาน",
      render: (user) => (
        <div className="ck-mg-who">
          <span className="ck-mg-avatar" aria-hidden="true">
            {user.fullName.trim().slice(0, 1)}
          </span>
          <div>
            <b>{user.fullName}</b>
            <small>{user.loginName ?? "ยังไม่มีบัญชีเข้าสู่ระบบ"}</small>
          </div>
        </div>
      ),
    },
    {
      key: "org",
      header: "บริษัท / ทีม",
      render: (user) => (
        <div className="ck-mg-two">
          <span>{user.companyName ?? "—"}</span>
          <small>
            {[user.agencyName, user.departmentName].filter(Boolean).join(" · ") || "—"}
          </small>
        </div>
      ),
    },
    {
      key: "roles",
      header: "ระดับสิทธิ์",
      render: (user) =>
        user.roles.length > 0 ? (
          <div className="ck-mg-chips">
            {user.roles.map((role) => (
              <span className="ck-mg-chip" key={role.id}>
                {role.name}
              </span>
            ))}
          </div>
        ) : (
          "—"
        ),
    },
    {
      key: "info",
      header: "ข้อมูลสำคัญ",
      render: (user) => (
        <div className="ck-mg-two">
          <span>
            {user.managerName ? "หัวหน้า: " + user.managerName : "ใช้สายตามนโยบาย"}
          </span>
          <small>
            {[
              user.overtimeTransportSatang > 0
                ? "ค่ารถ OT " + user.overtimeTransportSatang / 100 + " บาท"
                : null,
              user.attendanceExempt ? "ไม่ต้องลงเวลา" : null,
              user.approvalRouteMode === "MANAGER_FIRST" ? "หัวหน้าอนุมัติก่อน" : null,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </small>
        </div>
      ),
    },
    {
      key: "state",
      header: "สถานะ",
      width: "84px",
      align: "center",
      render: (user) => {
        const info = accountStateInfo(user.state);
        return <StatusDot tone={info.tone} label={info.tip} />;
      },
    },
  ];

  return (
    <>
      <section className="ck-mg-stats fade-in" aria-label="สรุปผู้ใช้งาน">
        <StatTile tone="biz" icon="users" value={stats.total} label="ผู้ใช้งาน" />
        <StatTile tone="med" icon="user" value={stats.regular} label="ผู้ใช้งาน(ทั่วไป)" />
        <StatTile tone="ot" icon="lock" value={stats.elevated} label="ผู้ใช้งาน(ระดับสูง)" />
        <StatTile tone="time" icon="clock" value={stats.pending} label="รออนุมัติ" />
        <StatTile tone="sick" icon="logout" value={stats.resigned} label="พ้นสภาพ" />
      </section>

      <SectionHead title={MANAGEMENT_SECTION_LABEL.users} id="users" count={visible.length} />
      <div className="ck-mg-bar">
        <Filters value={filter} options={STATE_FILTERS} onChange={setFilter} />
        <SearchBox value={search} onChange={setSearch} placeholder="ค้นหาพนักงาน..." />
      </div>
      <DataGrid
        rows={visible}
        columns={columns}
        rowKey={(user) => user.id}
        onRowClick={(user) => setEditingId(user.id)}
        empty={<EmptyState title="ไม่พบพนักงาน" icon="users" />}
      />

      {editing ? (
        <UserDialog
          key={editing.id}
          user={editing}
          {...props}
          onClose={close}
          canWrite={capabilities.usersAdminWrite}
        />
      ) : null}
    </>
  );
}

function UserDialog({
  user,
  data,
  capabilities,
  busy,
  message,
  run,
  resetLink,
  onIssueRecovery,
  onClose,
  canWrite,
}: UsersSectionProps & {
  readonly user: ManagedEmployeeItem;
  readonly onClose: () => void;
  readonly canWrite: boolean;
}) {
  const first = user.roleAssignments[0];
  const [accountState, setAccountState] = useState<string>(user.state ?? "PENDING");
  const [companyId, setCompanyId] = useState(user.companyId ?? "");
  const [agencyId, setAgencyId] = useState(user.agencyId ?? "");
  const [departmentId, setDepartmentId] = useState(user.departmentId ?? "");
  const [managerId, setManagerId] = useState(user.managerEmployeeId ?? "");
  const [managerFirst, setManagerFirst] = useState(user.approvalRouteMode === "MANAGER_FIRST");
  const [transport, setTransport] = useState(String(user.overtimeTransportSatang / 100));
  const [exempt, setExempt] = useState(user.attendanceExempt);

  const [roleIds, setRoleIds] = useState<readonly string[]>(user.roles.map((role) => role.id));
  const [scopeType, setScopeType] = useState<string>(first?.scopeType ?? "SELF");
  const [scopeCompanyId, setScopeCompanyId] = useState(first?.scopeCompanyId ?? "");
  const [scopeAgencyIds, setScopeAgencyIds] = useState<readonly string[]>(first?.scopeAgencyIds ?? []);

  const locked = !canWrite || Boolean(busy);
  const canRoles = Boolean(data.rbac && capabilities.rbacAdminWrite);
  const info = accountStateInfo(user.state);
  const userFormId = "mg-user-form";
  const roleFormId = "mg-role-form";

  const toggleIn = (list: readonly string[], id: string, on: boolean) =>
    on ? (list.includes(id) ? list : [...list, id]) : list.filter((item) => item !== id);

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!capabilities.usersAdminWrite) return;
    const ok = await run(
      "user-" + user.id,
      () =>
        mutate("/api/management/users/" + encodeURIComponent(user.id), "PATCH", {
          state: accountState,
          agencyId: agencyId || null,
          departmentId: departmentId || null,
          companyId: companyId || null,
          managerEmployeeId: managerId || null,
          approvalRouteMode: managerFirst ? "MANAGER_FIRST" : "STANDARD",
          overtimeTransportSatang: Math.round(Math.max(0, Number(transport) || 0) * 100),
          attendanceExempt: exempt,
        }),
      "บันทึกข้อมูลพนักงานแล้ว",
    );
    if (ok) onClose();
  }

  async function saveRoles(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!capabilities.rbacAdminWrite) return;
    const ok = await run(
      "user-roles-" + user.id,
      () =>
        mutate(
          "/api/management/users/" + encodeURIComponent(user.id) + "/role-assignments",
          "PUT",
          {
            assignments: roleIds.map((roleId) => ({
              roleId,
              scopeType,
              scopeCompanyId: scopeType === "COMPANY" ? scopeCompanyId || null : null,
              scopeAgencyIds: scopeType === "TEAM_SET" ? [...scopeAgencyIds] : [],
            })),
          },
        ),
      "บันทึกระดับสิทธิ์ของพนักงานแล้ว",
    );
    if (ok) onClose();
  }

  return (
    <DetailDialog
      tone="biz"
      icon="user"
      kicker={user.loginName ?? "พนักงาน"}
      title={user.fullName}
      status={{ label: info.label, tone: info.tone }}
      onClose={onClose}
      footer={
        <>
          <button className="ck-btn sky" type="submit" form={userFormId} disabled={locked}>
            บันทึกข้อมูล
          </button>
          {canRoles ? (
            <button className="ck-btn tone" type="submit" form={roleFormId} disabled={Boolean(busy)}>
              บันทึกสิทธิ์
            </button>
          ) : null}
          {capabilities.passwordRecoveryAdmin ? (
            <button
              className="ck-btn quiet"
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void onIssueRecovery(user.id)}
            >
              <Icon name="lock" size={16} /> สร้างลิงก์รีเซ็ตรหัสผ่าน
            </button>
          ) : null}
        </>
      }
    >
      <MessageBox value={message} />

      {resetLink ? (
        <div className="ck-dlg-sec">
          <h3>ลิงก์กู้คืนรหัสผ่าน (หมดอายุใน 15 นาที)</h3>
          <input
            className="ck-in"
            readOnly
            value={resetLink}
            aria-label="ลิงก์กู้คืนรหัสผ่าน"
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
      ) : null}

      <form id={userFormId} className="ck-dlg-sec" onSubmit={(event) => void saveUser(event)}>
        <h3>ข้อมูลและสังกัด</h3>
        <div className="ck-eform">
          <Field label="สถานะบัญชี">
            <select className="ck-in" value={accountState} disabled={locked} onChange={(e) => setAccountState(e.currentTarget.value)}>
              {ACCOUNT_STATE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="บริษัท">
            <select className="ck-in" value={companyId} disabled={locked} onChange={(e) => setCompanyId(e.currentTarget.value)}>
              <option value="">ไม่ระบุ</option>
              {data.companies?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="หน่วยงาน (ทีม)">
            <select className="ck-in" value={agencyId} disabled={locked} onChange={(e) => setAgencyId(e.currentTarget.value)}>
              <option value="">ไม่ระบุ</option>
              {data.agencies?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ฝ่าย">
            <select className="ck-in" value={departmentId} disabled={locked} onChange={(e) => setDepartmentId(e.currentTarget.value)}>
              <option value="">ไม่ระบุ</option>
              {data.departments?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ผู้บังคับบัญชา" full>
            <select className="ck-in" value={managerId} disabled={locked} onChange={(e) => setManagerId(e.currentTarget.value)}>
              <option value="">ไม่มี (ใช้สายตามนโยบาย)</option>
              {data.users
                ?.filter((candidate) => candidate.id !== user.id)
                .map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.fullName}
                  </option>
                ))}
            </select>
          </Field>
        </div>
        <div className="ck-mg-rows">
          <SettingRow label="ผู้บังคับบัญชาอนุมัติก่อน" hint="ข้ามหัวหน้าทีม">
            <Toggle
              checked={managerFirst}
              onChange={setManagerFirst}
              disabled={locked}
              label={"ผู้บังคับบัญชาอนุมัติก่อน " + user.fullName}
            />
          </SettingRow>
          <SettingRow label="ไม่ต้องลงเวลา" hint="เช่น ผู้ตรวจสอบบัญชี">
            <Toggle
              checked={exempt}
              onChange={setExempt}
              disabled={locked}
              label={"ไม่ต้องลงเวลา " + user.fullName}
            />
          </SettingRow>
          <SettingRow label="ค่ารถ OT (บาท/วัน)">
            <input
              className="ck-snum"
              type="number"
              min="0"
              step="1"
              value={transport}
              disabled={locked}
              aria-label={"ค่ารถ OT ของ " + user.fullName}
              onChange={(event) => setTransport(event.currentTarget.value)}
            />
          </SettingRow>
        </div>
      </form>

      <form id={roleFormId} className="ck-dlg-sec" onSubmit={(event) => void saveRoles(event)}>
        <h3>ระดับและขอบเขตสิทธิ์</h3>
        {canRoles && data.rbac ? (
          <>
            <div className="ck-mg-rows">
              {data.rbac.roles.map((role) => (
                <SettingRow key={role.id} label={role.name}>
                  <Toggle
                    checked={roleIds.includes(role.id)}
                    onChange={(on) => setRoleIds(toggleIn(roleIds, role.id, on))}
                    disabled={Boolean(busy)}
                    label={"ระดับสิทธิ์ " + role.name}
                  />
                </SettingRow>
              ))}
            </div>
            <div className="ck-eform">
              <Field label="ขอบเขต">
                <select className="ck-in" value={scopeType} disabled={Boolean(busy)} onChange={(e) => setScopeType(e.currentTarget.value)}>
                  <option value="PLATFORM">ทั้งแพลตฟอร์ม</option>
                  <option value="COMPANY">ทั้งบริษัท</option>
                  <option value="TEAM_SET">เฉพาะทีมที่เลือก</option>
                  <option value="SELF">เฉพาะตนเอง</option>
                </select>
              </Field>
              {scopeType === "COMPANY" ? (
                <Field label="บริษัท">
                  <select className="ck-in" value={scopeCompanyId} disabled={Boolean(busy)} onChange={(e) => setScopeCompanyId(e.currentTarget.value)}>
                    <option value="">— ไม่ระบุ</option>
                    {data.companies?.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
            </div>
            {scopeType === "TEAM_SET" ? (
              <div className="ck-mg-rows">
                {data.agencies?.map((item) => (
                  <SettingRow key={item.id} label={item.name}>
                    <Toggle
                      checked={scopeAgencyIds.includes(item.id)}
                      onChange={(on) => setScopeAgencyIds(toggleIn(scopeAgencyIds, item.id, on))}
                      disabled={Boolean(busy)}
                      label={"ทีมในขอบเขต " + item.name}
                    />
                  </SettingRow>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div className="ck-mg-chips">
            {user.roles.length > 0
              ? user.roles.map((role) => (
                  <span className="ck-mg-chip" key={role.id}>
                    {role.name}
                  </span>
                ))
              : "—"}
          </div>
        )}
      </form>
    </DetailDialog>
  );
}
