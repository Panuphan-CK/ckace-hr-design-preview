"use client";

import type { LeaveEntitlementAdminItem } from "@ckace/contracts";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { DateField } from "../../ui/date-picker";
import { isoToDmy } from "../../ui/format";
import {
  DataGrid,
  DetailDialog,
  EmptyState,
  Message as MessageBox,
  SectionHead,
  type GridColumn,
} from "../../ui/kit";
import { MANAGEMENT_SECTION_LABEL, containsSearch } from "./management-helpers";
import { Field, SearchBox, mutate, type SectionProps } from "./shared";

export function EntitlementsSection(props: SectionProps) {
  const { data, capabilities, busy, search, setSearch, onDialog } = props;
  // null = closed, "new" = add, otherwise the id of the row being edited
  const [editing, setEditing] = useState<string | null>(null);

  const all = data.entitlements ?? [];
  const rows = all.filter((item) =>
    containsSearch([item.employeeName, item.leaveTypeName, item.leaveTypeKey, item.quota], search),
  );
  const current = editing && editing !== "new" ? all.find((item) => item.id === editing) ?? null : null;
  const open = editing === "new" || current !== null;

  useEffect(() => {
    onDialog(open);
  }, [open, onDialog]);

  const columns: GridColumn<LeaveEntitlementAdminItem>[] = [
    { key: "employee", header: "พนักงาน", render: (item) => <b>{item.employeeName}</b> },
    { key: "type", header: "ประเภท", render: (item) => <span className="ck-mg-chip">{item.leaveTypeName}</span> },
    { key: "quota", header: "จำนวน", align: "right", render: (item) => item.quota },
    {
      key: "period",
      header: "ช่วงสิทธิ",
      render: (item) => (
        <span>
          {item.validFrom ? isoToDmy(item.validFrom) : "—"} ถึง {item.validTo ? isoToDmy(item.validTo) : "—"}
        </span>
      ),
    },
  ];

  return (
    <>
      <SectionHead title={MANAGEMENT_SECTION_LABEL.entitlements} id="entitlements" count={rows.length}>
        <SearchBox value={search} onChange={setSearch} placeholder="ค้นหาข้อมูล..." />
        <button
          className="ck-btn sky"
          type="button"
          disabled={!capabilities.entitlementAdminWrite || Boolean(busy)}
          onClick={() => setEditing("new")}
        >
          เพิ่มสิทธิ์
        </button>
      </SectionHead>
      <DataGrid
        rows={rows}
        columns={columns}
        rowKey={(item) => item.id}
        onRowClick={(item) => setEditing(item.id)}
        empty={<EmptyState title="ยังไม่มีสิทธิวันลา" icon="leave" />}
      />
      {open ? (
        <EntitlementDialog
          key={editing}
          item={current}
          {...props}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

function EntitlementDialog({
  item,
  data,
  capabilities,
  busy,
  message,
  run,
  onClose,
}: SectionProps & { readonly item: LeaveEntitlementAdminItem | null; readonly onClose: () => void }) {
  const [employeeId, setEmployeeId] = useState(item?.employeeId ?? "");
  const [leaveTypeId, setLeaveTypeId] = useState(item?.leaveTypeId ?? "");
  const [quota, setQuota] = useState(item?.quota ?? "");
  const [validFrom, setValidFrom] = useState(item?.validFrom ?? "");
  const [validTo, setValidTo] = useState(item?.validTo ?? "");
  const options = data.entitlementOptions;
  const locked = !capabilities.entitlementAdminWrite || Boolean(busy);
  const formId = "mg-entitlement-form";

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!capabilities.entitlementAdminWrite) return;
    const ok = await run(
      "entitlement",
      () =>
        mutate("/api/management/entitlements", "PUT", {
          employeeId,
          leaveTypeId,
          quota,
          validFrom: validFrom || null,
          validTo: validTo || null,
        }),
      "บันทึกสิทธิการลาแล้ว",
    );
    if (ok) onClose();
  }

  return (
    <DetailDialog
      tone="leave"
      icon="leave"
      kicker="สิทธิวันลา"
      title={item ? item.employeeName : "เพิ่มสิทธิวันลา"}
      onClose={onClose}
      footer={
        <button className="ck-btn sky" type="submit" form={formId} disabled={locked}>
          บันทึก
        </button>
      }
    >
      <MessageBox value={message} />
      <form id={formId} className="ck-eform" onSubmit={(event) => void save(event)}>
        <Field label="พนักงาน" full>
          <select className="ck-in" required value={employeeId} disabled={locked} onChange={(e) => setEmployeeId(e.currentTarget.value)}>
            <option value="" disabled>
              เลือกพนักงาน
            </option>
            {options?.employees.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ประเภทลา">
          <select className="ck-in" required value={leaveTypeId} disabled={locked} onChange={(e) => setLeaveTypeId(e.currentTarget.value)}>
            <option value="" disabled>
              เลือกประเภทลา
            </option>
            {options?.leaveTypes.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="จำนวน (วัน)">
          <input className="ck-in" required inputMode="decimal" value={quota} disabled={locked} onChange={(e) => setQuota(e.currentTarget.value)} />
        </Field>
        <div className="ck-field">
          <span>เริ่มมีผล</span>
          <DateField label="เริ่มมีผล" value={validFrom} onChange={setValidFrom} />
        </div>
        <div className="ck-field">
          <span>สิ้นสุด</span>
          <DateField label="สิ้นสุด" value={validTo} onChange={setValidTo} />
        </div>
      </form>
    </DetailDialog>
  );
}
