"use client";

import type { HolidayAdminItem } from "@ckace/contracts";
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
  SettingRow,
  StatusDot,
  Toggle,
  type GridColumn,
} from "../../ui/kit";
import {
  MANAGEMENT_SECTION_LABEL,
  WEEKDAY,
  activeDot,
  containsSearch,
} from "./management-helpers";
import { Field, SearchBox, mutate, type SectionProps } from "./shared";

interface CalendarSectionProps extends SectionProps {
  readonly show: "all" | "holidays" | "workdays";
}

type Holiday = HolidayAdminItem;

export function CalendarSection(props: CalendarSectionProps) {
  const { data, capabilities, busy, search, setSearch, onDialog, run, show } = props;
  // null = closed, "new" = add, otherwise holiday id
  const [editing, setEditing] = useState<string | null>(null);
  const calendar = data.workCalendar;
  const holidays = calendar?.holidays ?? [];
  const rows = holidays.filter((item) => containsSearch([item.holidayDate, isoToDmy(item.holidayDate), item.description], search));
  const current = editing && editing !== "new" ? holidays.find((item) => item.id === editing) ?? null : null;
  const open = editing === "new" || current !== null;

  useEffect(() => {
    onDialog(open);
  }, [open, onDialog]);

  if (!calendar) return null;

  const columns: GridColumn<Holiday>[] = [
    { key: "date", header: "วันที่", width: "160px", render: (item) => <b>{isoToDmy(item.holidayDate)}</b> },
    { key: "desc", header: "รายละเอียด", render: (item) => item.description },
    {
      key: "active",
      header: "สถานะ",
      width: "84px",
      align: "center",
      render: (item) => {
        const dot = activeDot(item.active);
        return <StatusDot tone={dot.tone} label={dot.tip} />;
      },
    },
  ];

  const lockedWorkday = !capabilities.workCalendarAdminWrite || Boolean(busy);

  async function toggleWorkday(isoWeekday: number, isWorking: boolean) {
    if (!capabilities.workCalendarAdminWrite) return;
    await run(
      "weekday-" + isoWeekday,
      () => mutate("/api/management/weekly-workdays/" + isoWeekday, "PUT", { isWorking }),
      "บันทึกวันทำงานแล้ว",
    );
  }

  return (
    <>
      {show === "all" || show === "holidays" ? (
        <section id="holidays">
          <SectionHead title={MANAGEMENT_SECTION_LABEL.holidays} count={rows.length}>
            <SearchBox value={search} onChange={setSearch} placeholder="ค้นหาข้อมูล..." />
            <button
              className="ck-btn sky"
              type="button"
              disabled={!capabilities.workCalendarAdminWrite || Boolean(busy)}
              onClick={() => setEditing("new")}
            >
              เพิ่มวันหยุด
            </button>
          </SectionHead>
          <DataGrid
            rows={rows}
            columns={columns}
            rowKey={(item) => item.id}
            onRowClick={(item) => setEditing(item.id)}
            empty={<EmptyState title="ยังไม่มีวันหยุด" icon="calendar" />}
          />
        </section>
      ) : null}

      {show === "all" || show === "workdays" ? (
        <section id="workdays">
          <SectionHead title={MANAGEMENT_SECTION_LABEL.workdays} />
          <div className="ck-sgroup ck-c-sick">
            {WEEKDAY.map((label, index) => {
              const isoWeekday = index + 1;
              const working =
                calendar.weeklyWorkdays.find((row) => row.isoWeekday === isoWeekday)?.isWorking ?? false;
              return (
                <SettingRow key={isoWeekday} label={"วัน" + label} hint={working ? "วันทำงาน" : "วันหยุด"}>
                  <Toggle
                    checked={working}
                    disabled={lockedWorkday}
                    label={"วันทำงาน วัน" + label}
                    onChange={(next) => void toggleWorkday(isoWeekday, next)}
                  />
                </SettingRow>
              );
            })}
          </div>
        </section>
      ) : null}

      {open ? (
        <HolidayDialog key={editing} item={current} {...props} onClose={() => setEditing(null)} />
      ) : null}
    </>
  );
}

function HolidayDialog({
  item,
  capabilities,
  busy,
  message,
  run,
  onClose,
}: SectionProps & { readonly item: Holiday | null; readonly onClose: () => void }) {
  const [holidayDate, setHolidayDate] = useState(item?.holidayDate ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [active, setActive] = useState(item?.active ?? true);
  const locked = !capabilities.workCalendarAdminWrite || Boolean(busy);
  const formId = "mg-holiday-form";

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!capabilities.workCalendarAdminWrite) return;
    const ok = await run(
      item ? "holiday-" + item.id : "holiday-create",
      () =>
        mutate(
          "/api/management/holidays",
          "PUT",
          item
            ? { id: item.id, holidayDate, description, active }
            : { holidayDate, description, active: true },
        ),
      "บันทึกวันหยุดแล้ว",
    );
    if (ok) onClose();
  }

  return (
    <DetailDialog
      tone="sick"
      icon="calendar"
      kicker="วันหยุดประจำปี"
      title={item ? isoToDmy(item.holidayDate) : "เพิ่มวันหยุด"}
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
          <div className="ck-field">
            <span>วันหยุด</span>
            <DateField label="วันหยุด" value={holidayDate} onChange={setHolidayDate} />
          </div>
          <Field label="รายละเอียดวันหยุด">
            <input className="ck-in" required maxLength={250} value={description} disabled={locked} onChange={(e) => setDescription(e.currentTarget.value)} />
          </Field>
        </div>
        {item ? (
          <div className="ck-mg-rows">
            <SettingRow label="เปิดใช้งาน">
              <Toggle checked={active} onChange={setActive} disabled={locked} label="เปิดใช้งานวันหยุด" />
            </SettingRow>
          </div>
        ) : null}
      </form>
    </DetailDialog>
  );
}
