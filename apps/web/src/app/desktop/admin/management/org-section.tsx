"use client";

import type { OrganizationUnitItem } from "@ckace/contracts";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import {
  DataGrid,
  DetailDialog,
  EmptyState,
  Message as MessageBox,
  SectionHead,
  SettingRow,
  StatusDot,
  Toggle,
  type GridColumn,
} from "../../ui/kit";
import type { IconName } from "../../ui/icons";
import { MANAGEMENT_SECTION_LABEL, activeDot, containsSearch } from "./management-helpers";
import { Field, SearchBox, mutate, type SectionProps } from "./shared";

type UnitType = "companies" | "agencies" | "departments";

interface OrgSectionProps extends SectionProps {
  readonly show: "all" | UnitType;
}

const UNIT_META: Record<
  UnitType,
  { title: string; kicker: string; icon: IconName; tone: "biz" | "time" | "leave"; placeholder: string; empty: string }
> = {
  companies: { title: MANAGEMENT_SECTION_LABEL.companies, kicker: "บริษัท", icon: "building", tone: "biz", placeholder: "ชื่อบริษัท", empty: "ยังไม่มีบริษัท เพิ่มบริษัทแรกด้านบน" },
  agencies: { title: MANAGEMENT_SECTION_LABEL.agencies, kicker: "หน่วยงาน (ทีม)", icon: "users", tone: "time", placeholder: "ชื่อหน่วยงาน", empty: "ยังไม่มีหน่วยงาน" },
  departments: { title: MANAGEMENT_SECTION_LABEL.departments, kicker: "ฝ่าย", icon: "apps", tone: "leave", placeholder: "ชื่อฝ่าย", empty: "ยังไม่มีฝ่าย" },
};

export function OrgSection(props: OrgSectionProps) {
  const { data, show, search, setSearch, onDialog } = props;
  const [editing, setEditing] = useState<{ type: UnitType; id: string } | null>(null);

  const list = (type: UnitType) => data[type];
  const item = editing ? list(editing.type)?.find((row) => row.id === editing.id) ?? null : null;

  useEffect(() => {
    onDialog(item !== null);
  }, [item, onDialog]);

  const types = (["companies", "agencies", "departments"] as const).filter(
    (type) => (show === "all" || show === type) && list(type),
  );

  return (
    <>
      <div className="ck-mg-bar">
        <SearchBox value={search} onChange={setSearch} placeholder="ค้นหาข้อมูล..." />
      </div>
      {types.map((type) => (
        <UnitGrid key={type} type={type} {...props} onEdit={(id) => setEditing({ type, id })} />
      ))}
      {editing && item ? (
        <UnitDialog key={editing.type + editing.id} type={editing.type} item={item} {...props} onClose={() => setEditing(null)} />
      ) : null}
    </>
  );
}

function UnitGrid({
  type,
  data,
  capabilities,
  busy,
  search,
  run,
  onEdit,
}: OrgSectionProps & { readonly type: UnitType; readonly onEdit: (id: string) => void }) {
  const meta = UNIT_META[type];
  const rows = (data[type] ?? []).filter((row) =>
    containsSearch(type === "agencies" ? [row.name, row.companyName] : [row.name], search),
  );

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!capabilities.organizationAdminWrite) return;
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name") ?? "").trim();
    if (!name) return;
    const ok = await run(
      "create-" + type,
      () => mutate("/api/management/" + type, "POST", { name }),
      "เพิ่มข้อมูลแล้ว",
    );
    if (ok) form.reset();
  }

  const columns: GridColumn<OrganizationUnitItem>[] = [
    { key: "name", header: meta.kicker, render: (row) => <b>{row.name}</b> },
  ];
  if (type === "companies") {
    columns.push(
      { key: "tax", header: "เลขประจำตัวผู้เสียภาษี", render: (row) => row.taxId || "—" },
      { key: "phone", header: "โทรศัพท์", render: (row) => row.phone || "—" },
      { key: "email", header: "อีเมล", render: (row) => row.email || "—" },
    );
  }
  if (type === "agencies") {
    columns.push({ key: "company", header: "บริษัท", render: (row) => row.companyName || "—" });
  }
  columns.push({
    key: "active",
    header: "สถานะ",
    width: "84px",
    align: "center",
    render: (row) => {
      const dot = activeDot(row.active);
      return <StatusDot tone={dot.tone} label={dot.tip} />;
    },
  });

  return (
    <section id={type}>
      <SectionHead title={meta.title} count={data[type]?.length ?? 0}>
        <form className="ck-mg-create" onSubmit={(event) => void create(event)}>
          <input className="ck-in" name="name" required maxLength={200} placeholder={meta.placeholder} aria-label={meta.placeholder} />
          <button className="ck-btn sky" type="submit" disabled={!capabilities.organizationAdminWrite || Boolean(busy)}>
            เพิ่มข้อมูล
          </button>
        </form>
      </SectionHead>
      <DataGrid
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        onRowClick={(row) => onEdit(row.id)}
        empty={<EmptyState title={meta.empty} icon={meta.icon} />}
      />
    </section>
  );
}

function UnitDialog({
  type,
  item,
  data,
  capabilities,
  busy,
  message,
  run,
  onClose,
}: OrgSectionProps & {
  readonly type: UnitType;
  readonly item: OrganizationUnitItem;
  readonly onClose: () => void;
}) {
  const meta = UNIT_META[type];
  const [name, setName] = useState(item.name);
  const [active, setActive] = useState(item.active);
  const [companyId, setCompanyId] = useState(item.companyId ?? "");
  const [taxId, setTaxId] = useState(item.taxId ?? "");
  const [address, setAddress] = useState(item.address ?? "");
  const [phone, setPhone] = useState(item.phone ?? "");
  const [email, setEmail] = useState(item.email ?? "");
  const locked = !capabilities.organizationAdminWrite || Boolean(busy);
  const formId = "mg-unit-form";

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!capabilities.organizationAdminWrite) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const ok = await run(
      "update-" + type + "-" + item.id,
      () =>
        mutate(
          "/api/management/" + type + "/" + encodeURIComponent(item.id),
          "PATCH",
          type === "agencies"
            ? { name: trimmed, active, companyId: companyId || null }
            : type === "companies"
              ? { name: trimmed, active, taxId, address, phone, email }
              : { name: trimmed, active },
        ),
      "บันทึกข้อมูลแล้ว",
    );
    if (ok) onClose();
  }

  return (
    <DetailDialog
      tone={meta.tone}
      icon={meta.icon}
      kicker={meta.kicker}
      title={item.name}
      onClose={onClose}
      footer={
        <button className="ck-btn sky" type="submit" form={formId} disabled={locked}>
          บันทึก
        </button>
      }
    >
      <MessageBox value={message} />
      <form id={formId} onSubmit={(event) => void save(event)}>
        <div className="ck-eform">
          <Field label="ชื่อ" full>
            <input className="ck-in" value={name} required maxLength={200} disabled={locked} onChange={(e) => setName(e.currentTarget.value)} />
          </Field>
          {type === "agencies" ? (
            <Field label="บริษัท" full>
              <select className="ck-in" value={companyId} disabled={locked} onChange={(e) => setCompanyId(e.currentTarget.value)}>
                <option value="">ไม่ระบุ</option>
                {data.companies?.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          {type === "companies" ? (
            <>
              <Field label="เลขประจำตัวผู้เสียภาษี">
                <input className="ck-in" value={taxId} maxLength={40} disabled={locked} onChange={(e) => setTaxId(e.currentTarget.value)} />
              </Field>
              <Field label="โทรศัพท์">
                <input className="ck-in" value={phone} maxLength={40} disabled={locked} onChange={(e) => setPhone(e.currentTarget.value)} />
              </Field>
              <Field label="อีเมล" full>
                <input className="ck-in" value={email} maxLength={200} disabled={locked} onChange={(e) => setEmail(e.currentTarget.value)} />
              </Field>
              <Field label="ที่อยู่" full>
                <input className="ck-in" value={address} maxLength={500} disabled={locked} onChange={(e) => setAddress(e.currentTarget.value)} />
              </Field>
            </>
          ) : null}
        </div>
        <div className="ck-mg-rows">
          <SettingRow label="เปิดใช้งาน">
            <Toggle checked={active} onChange={setActive} disabled={locked} label={"เปิดใช้งาน " + item.name} />
          </SettingRow>
        </div>
      </form>
    </DetailDialog>
  );
}
