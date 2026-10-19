"use client";

import { DateField } from "../ui/date-picker";
import { thaiDateRange } from "../ui/format";
import { Icon, type IconName } from "../ui/icons";
import { ErrorState, LoadingState, PageHead, SectionHead, type Tone } from "../ui/kit";
import { OvertimeCheckPanel } from "./overtime-check-panel";
import { DonutChart, MonthlyChart, seriesColor } from "./report-charts";
import { formatNumber, monthlyBuckets, personSummaries, rowType, typeShares } from "./report-stats";
import type {
  ManagementReportRow,
  MissingCheckOutItem,
  ManagementReportView,
} from "@ckace/contracts";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type State =
  | { status: "loading" }
  | { status: "ready"; data: ManagementReportView }
  | { status: "error"; message: string };

type ReportKind = ManagementReportRow["kind"];

interface ReportOption {
  readonly kind: ReportKind;
  readonly title: string;
  readonly description: string;
  readonly icon: IconName;
  readonly tone: Tone;
  readonly unit: string;
  readonly overview: string;
}

const REPORT_OPTIONS: readonly ReportOption[] = [
  { kind: "LEAVE", title: "รายงานการลา", description: "วิเคราะห์เฉพาะรายการลาที่อนุมัติแล้ว", icon: "leave", tone: "leave", unit: "วัน", overview: "การลา" },
  { kind: "ATTENDANCE", title: "รายงานเข้าออกงาน", description: "สรุปเฉพาะรายการเวลาเข้า-ออกที่บันทึกครบ", icon: "clock", tone: "time", unit: "ชม.", overview: "การเข้างาน" },
  { kind: "OVERTIME", title: "รายงานทำงานล่วงเวลา", description: "วิเคราะห์เฉพาะ OT ที่อนุมัติแล้ว", icon: "ot", tone: "ot", unit: "ชม.", overview: "OT" },
  { kind: "MEDICAL", title: "รายงานเบิกค่ารักษา", description: "วิเคราะห์เฉพาะค่ารักษาที่อนุมัติแล้ว", icon: "med", tone: "med", unit: "บาท", overview: "ค่ารักษาพยาบาล" },
];

const REPORT_HASH: Readonly<Record<string, ReportKind | null>> = {
  "#overview": null,
  "#leave": "LEAVE",
  "#attendance": "ATTENDANCE",
  "#overtime": "OVERTIME",
  "#medical": "MEDICAL",
};

function reportHash(kind: ReportKind | null): string {
  if (kind === null) return "#overview";
  if (kind === "LEAVE") return "#leave";
  if (kind === "ATTENDANCE") return "#attendance";
  if (kind === "OVERTIME") return "#overtime";
  return "#medical";
}

function monthRange(): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const toDate = new Date(year, month + 1, 0);
  return {
    from:
      String(year) +
      "-" +
      String(month + 1).padStart(2, "0") +
      "-01",
    to:
      String(year) +
      "-" +
      String(month + 1).padStart(2, "0") +
      "-" +
      String(toDate.getDate()).padStart(2, "0"),
  };
}

function csvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}

function exportCsv(
  rows: readonly ManagementReportRow[],
  kind: ReportKind,
): void {
  const header = [
    "วันที่",
    "ประเภท",
    "พนักงาน",
    "สถานะ",
    "รายละเอียด",
    "จำนวนเงิน",
  ];
  const lines = [
    header.map(csvCell).join(","),
    ...rows.map((row) =>
      [
        row.date,
        row.kind,
        row.employeeName,
        row.status,
        row.summary,
        row.amount ?? "",
      ]
        .map(csvCell)
        .join(","),
    ),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "ckace-" + kind.toLowerCase() + "-report.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function DesktopReportsPage() {
  const initial = monthRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [selectedKind, setSelectedKind] = useState<ReportKind | null>(null);
  const [state, setState] = useState<State>({ status: "loading" });
  const [missing, setMissing] = useState<readonly MissingCheckOutItem[]>([]);

  const loadMissing = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/management/reports/missing-checkouts?from=" +
          encodeURIComponent(from) +
          "&to=" +
          encodeURIComponent(to),
        { credentials: "same-origin", cache: "no-store" },
      );
      setMissing(response.ok ? ((await response.json()) as MissingCheckOutItem[]) : []);
    } catch {
      setMissing([]);
    }
  }, [from, to]);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch(
        "/api/management/reports?from=" +
          encodeURIComponent(from) +
          "&to=" +
          encodeURIComponent(to),
        { credentials: "same-origin", cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? "บัญชีนี้ไม่มีสิทธิ์ดูรายงานขององค์กร"
            : response.status === 401
              ? "หมดเวลาการเข้าใช้งาน กรุณาเข้าสู่ระบบใหม่"
              : "ไม่สามารถโหลดรายงานได้",
        );
      }
      setState({
        status: "ready",
        data: (await response.json()) as ManagementReportView,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "ไม่สามารถโหลดรายงานได้",
      });
    }
  }, [from, to]);

  useEffect(() => {
    void load();
    void loadMissing();
  }, [load, loadMissing]);

  useEffect(() => {
    const syncHash = () => {
      const next = REPORT_HASH[window.location.hash];
      setSelectedKind(next === undefined ? null : next);
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  function selectReport(kind: ReportKind | null) {
    setSelectedKind(kind);
    if (window.location.hash !== reportHash(kind)) {
      window.location.hash = reportHash(kind);
    }
  }

  const selectedOption = useMemo(
    () => REPORT_OPTIONS.find((option) => option.kind === selectedKind) ?? null,
    [selectedKind],
  );

  const selectedRows = useMemo(() => {
    if (state.status !== "ready" || selectedKind === null) return [];
    return state.data.rows.filter((row) => row.kind === selectedKind);
  }, [selectedKind, state]);

  const buckets = useMemo(() => monthlyBuckets(selectedRows), [selectedRows]);
  const shares = useMemo(() => typeShares(selectedRows), [selectedRows]);
  const people = useMemo(() => personSummaries(selectedRows), [selectedRows]);
  const typeNames = useMemo(() => shares.map((share) => share.label), [shares]);

  const totals =
    state.status === "ready"
      ? [state.data.totals.leave, state.data.totals.attendance, state.data.totals.overtime, state.data.totals.medical]
      : [];

  const filterBar = (
    <div className="ck-fbox ck-c-accent" style={{ padding: 16 }}>
      <div className="ck-row" style={{ alignItems: "flex-end" }}>
        <label className="ck-field" style={{ minWidth: 200 }}>
          <span>วันที่เริ่ม</span>
          <DateField label="วันที่เริ่ม" value={from} onChange={(next) => setFrom(next)} />
        </label>
        <label className="ck-field" style={{ minWidth: 200 }}>
          <span>วันที่สิ้นสุด</span>
          <DateField label="วันที่สิ้นสุด" value={to} onChange={(next) => setTo(next)} />
        </label>
        <button
          className="ck-btn quiet"
          type="button"
          onClick={() => {
            const next = monthRange();
            setFrom(next.from);
            setTo(next.to);
          }}
        >
          เดือนนี้
        </button>
        <button className="ck-btn tone" type="button" onClick={() => void load()}>
          วิเคราะห์
        </button>
        <span className="ck-ml ck-row">
          <a
            className="ck-btn quiet"
            href={"/api/management/reports/overtime.xlsx?from=" + encodeURIComponent(from) + "&to=" + encodeURIComponent(to)}
            download
          >
            ดาวน์โหลดรายงาน OT (Excel)
          </a>
          {selectedKind !== null ? (
            <button className="ck-btn quiet" type="button" disabled={selectedRows.length === 0} onClick={() => exportCsv(selectedRows, selectedKind)}>
              ส่งออก CSV
            </button>
          ) : null}
        </span>
      </div>
    </div>
  );

  const stateBlock =
    state.status === "loading" ? (
      <LoadingState title="กำลังสรุปข้อมูล" />
    ) : state.status === "error" ? (
      <ErrorState title="โหลดรายงานไม่สำเร็จ" message={state.message} onRetry={() => void load()} />
    ) : null;

  if (selectedKind === null || selectedOption === null) {
    return (
      <>
        <PageHead tone="accent" icon="chart" title="รายงาน" subtitle={"ข้อมูลที่อนุมัติหรือบันทึกครบแล้ว · " + thaiDateRange(from, to)} />
        <div className="ck-wrap ck-stack">
          {filterBar}
          {stateBlock}
          {state.status === "ready" ? (
            <div className="ck-hgrid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              {REPORT_OPTIONS.map((option, index) => (
                <button className={"ck-hcard ck-c-" + option.tone} key={option.kind} type="button" onClick={() => selectReport(option.kind)}>
                  <div className="ck-hc-top">
                    <span className={"ck-chip ck-c-" + option.tone}>
                      <Icon name={option.icon} size={20} />
                    </span>
                    <div>
                      <b>{option.title}</b>
                      <small>{option.description}</small>
                    </div>
                  </div>
                  <div style={{ fontSize: 34, fontWeight: 600, padding: "6px 0" }}>
                    {totals[index] ?? 0} <small className="ck-muted" style={{ fontSize: 14, fontWeight: 400 }}>รายการ</small>
                  </div>
                  <div className="ck-hc-foot">
                    <span className="ck-more">
                      ดูรายงาน <Icon name="chevron" size={16} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </>
    );
  }

  const sumValue = selectedRows.reduce((sum, row) => sum + (Number.isFinite(Number(row.amount)) && row.amount !== null ? Number(row.amount) : 1), 0);
  const kpis = [
    { label: "ยอดรวม", value: formatNumber(sumValue), unit: selectedOption.unit, tone: selectedOption.tone, icon: selectedOption.icon },
    { label: "จำนวนรายการ", value: String(selectedRows.length), unit: "รายการ", tone: "gray" as Tone, icon: "document" as IconName },
    { label: "จำนวนพนักงาน", value: String(people.length), unit: "คน", tone: "biz" as Tone, icon: "users" as IconName },
    {
      label: "เฉลี่ยต่อคน",
      value: people.length > 0 ? formatNumber(Math.round((sumValue / people.length) * 10) / 10) : "0",
      unit: selectedOption.unit,
      tone: "ot" as Tone,
      icon: "chart" as IconName,
    },
  ];

  return (
    <>
      <PageHead tone={selectedOption.tone} icon={selectedOption.icon} title={selectedOption.title} subtitle={thaiDateRange(from, to)}>
        <button className="ck-btn quiet" type="button" onClick={() => selectReport(null)}>
          <Icon name="back" size={16} /> กลับภาพรวม
        </button>
      </PageHead>
      <div className="ck-wrap ck-stack">
        {filterBar}
        {stateBlock}
        {selectedKind === "OVERTIME" ? <OvertimeCheckPanel from={from} to={to} /> : null}
        {state.status === "ready" && selectedRows.length === 0 ? (
          <div className="ck-empty">
            <b>ไม่พบข้อมูลในช่วงวันที่นี้</b>
            ลองเปลี่ยนช่วงวันที่แล้วกดวิเคราะห์อีกครั้ง
          </div>
        ) : null}
        {state.status === "ready" && selectedRows.length > 0 ? (
          <>
            <div className="ck-qgrid">
              {kpis.map((kpi) => (
                <div className={"ck-hcard ck-c-" + kpi.tone} key={kpi.label}>
                  <div className="ck-hc-top">
                    <span className={"ck-chip ck-c-" + kpi.tone}>
                      <Icon name={kpi.icon} size={18} />
                    </span>
                    <b>{kpi.label}</b>
                  </div>
                  <div style={{ fontSize: 30, fontWeight: 600 }}>
                    {kpi.value} <small className="ck-muted" style={{ fontSize: 14, fontWeight: 400 }}>{kpi.unit}</small>
                  </div>
                </div>
              ))}
            </div>

            <div className="ck-two">
              <section className={"ck-panel ck-c-" + selectedOption.tone}>
                <SectionHead title="สรุปรายเดือน" />
                <MonthlyChart buckets={buckets} types={typeNames} />
              </section>
              <section className={"ck-panel ck-c-" + selectedOption.tone}>
                <SectionHead title="สัดส่วนตามประเภท" />
                <DonutChart shares={shares} centerLabel={"รวม (" + selectedOption.unit + ")"} unit={selectedOption.unit} />
              </section>
            </div>

            <section className={"ck-panel ck-c-" + selectedOption.tone}>
              <SectionHead title="รายบุคคล" count={people.length} />
              <div className="ck-tablewrap">
                <table className="ck-table">
                  <thead>
                    <tr>
                      <th>พนักงาน</th>
                      {typeNames.map((type, index) => (
                        <th key={type}>
                          <i style={{ background: seriesColor(index) }} /> {type}
                        </th>
                      ))}
                      <th>รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.map((person) => (
                      <tr key={person.employeeId}>
                        <td>
                          <b>{person.employeeName}</b>
                        </td>
                        {typeNames.map((type, index) => {
                          const value = person.byType[type] ?? 0;
                          const pct = person.value > 0 ? Math.round((value / person.value) * 100) : 0;
                          return (
                            <td key={type}>
                              {formatNumber(value)}
                              <div className="ck-track" style={{ ["--tc" as string]: seriesColor(index), marginTop: 4 }}>
                                <i style={{ width: pct + "%" }} />
                              </div>
                            </td>
                          );
                        })}
                        <td>
                          <b>{formatNumber(person.value)}</b> <small className="ck-muted">{selectedOption.unit}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={"ck-panel ck-c-" + selectedOption.tone}>
              <SectionHead title="รายการทั้งหมด" count={selectedRows.length} />
              <div className="ck-tablewrap">
                <table className="ck-table">
                  <thead>
                    <tr>
                      <th>วันที่</th>
                      <th>พนักงาน</th>
                      <th>สถานะ</th>
                      <th>รายละเอียด</th>
                      <th>จำนวน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRows.map((row) => (
                      <tr key={row.kind + "-" + row.id}>
                        <td>{row.date}</td>
                        <td>{row.employeeName}</td>
                        <td>
                          <span className="ck-pill muted">{row.status}</span>
                        </td>
                        <td>{row.summary || rowType(row)}</td>
                        <td>{row.amount ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}

        {selectedKind === "ATTENDANCE" && missing.length > 0 ? (
          <section className="ck-panel ck-c-ot">
            <SectionHead title="ลืมลงเวลาออก" count={missing.length} />
            <div className="ck-tablewrap">
              <table className="ck-table">
                <thead>
                  <tr>
                    <th>วันที่</th>
                    <th>พนักงาน</th>
                    <th>ทีม</th>
                    <th>บริษัท</th>
                    <th>เวลาเข้า</th>
                  </tr>
                </thead>
                <tbody>
                  {missing.map((item) => (
                    <tr key={item.employeeId + "-" + item.workDate}>
                      <td>{item.workDate}</td>
                      <td>{item.employeeName}</td>
                      <td>{item.teamName}</td>
                      <td>{item.companyName}</td>
                      <td>{item.checkIn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
