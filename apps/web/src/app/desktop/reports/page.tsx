"use client";

import { DateField } from "../ui/date-picker";
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
  readonly icon: string;
  readonly tone: string;
}

const REPORT_OPTIONS: readonly ReportOption[] = [
  {
    kind: "LEAVE",
    title: "รายงานการลา",
    description: "วิเคราะห์เฉพาะรายการลาที่อนุมัติแล้ว",
    icon: "fa-solid fa-plane-departure",
    tone: "blue",
  },
  {
    kind: "ATTENDANCE",
    title: "รายงานเข้าออกงาน",
    description: "สรุปเฉพาะรายการเวลาเข้า-ออกที่บันทึกครบ",
    icon: "fa-solid fa-user-clock",
    tone: "green",
  },
  {
    kind: "OVERTIME",
    title: "รายงานทำงานล่วงเวลา",
    description: "วิเคราะห์เฉพาะ OT ที่อนุมัติแล้ว",
    icon: "fa-solid fa-briefcase",
    tone: "orange",
  },
  {
    kind: "MEDICAL",
    title: "รายงานเบิกค่ารักษา",
    description: "วิเคราะห์เฉพาะค่ารักษาที่อนุมัติแล้ว",
    icon: "fa-solid fa-first-aid",
    tone: "red",
  },
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

  if (selectedKind === null) {
    const overviewTotals =
      state.status === "ready"
        ? [
            { label: "การลา", value: state.data.totals.leave, icon: "fa-solid fa-plane-departure", tone: "blue" },
            { label: "การเข้างาน", value: state.data.totals.attendance, icon: "fa-solid fa-user-clock", tone: "green" },
            { label: "OT", value: state.data.totals.overtime, icon: "fa-solid fa-briefcase", tone: "orange" },
            { label: "ค่ารักษาพยาบาล", value: state.data.totals.medical, icon: "fa-solid fa-first-aid", tone: "red" },
          ] as const
        : [];

    return (
      <div className="production-report-selection task398-reports-page fade-in">
        <section className="module-heading task396-report-intro">
          <div>
            <p className="eyebrow">APPROVED DATA ANALYTICS</p>
            <h1>รายงานและวิเคราะห์ข้อมูล</h1>
            <p>
              วิเคราะห์ข้อมูลที่อนุมัติหรือบันทึกสมบูรณ์แล้วเท่านั้น
              เพื่อไม่ให้รายการรออนุมัติหรือถูกปฏิเสธปะปนกับข้อมูลจริง
            </p>
          </div>
        </section>

        <section className="module-panel task396-report-overview-panel">
          <div className="production-report-heading">
            <div>
              <span className="summary-kicker">ภาพรวม</span>
              <h2>ข้อมูลในช่วงที่เลือก</h2>
            </div>
            <span className="production-period-chip">
              {from} ถึง {to}
            </span>
          </div>

          <div className="production-report-filters task396-report-overview-filters">
            <label>
              <span>วันที่เริ่ม</span>
              <DateField label="วันที่เริ่ม" value={from} onChange={(next) => setFrom(next)} />
            </label>
            <label>
              <span>วันที่สิ้นสุด</span>
              <DateField label="วันที่สิ้นสุด" value={to} onChange={(next) => setTo(next)} />
            </label>
            <div className="production-report-filter-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  const next = monthRange();
                  setFrom(next.from);
                  setTo(next.to);
                }}
              >
                เดือนนี้
              </button>
              <a
                className="secondary-button"
                href={
                  "/api/management/reports/overtime.xlsx?from=" +
                  encodeURIComponent(from) +
                  "&to=" +
                  encodeURIComponent(to)
                }
                download
              >
                ดาวน์โหลดรายงาน OT (Excel)
              </a>
              <button
                className="primary-button"
                type="button"
                onClick={() => void load()}
              >
                วิเคราะห์
              </button>
            </div>
          </div>

          {state.status === "loading" ? (
            <div className="module-state production-report-state" role="status" aria-busy="true">
              <div className="spinner" aria-hidden="true" />
              <h2>กำลังสรุปข้อมูล</h2>
            </div>
          ) : state.status === "error" ? (
            <div className="module-state production-report-state" role="alert">
              <div className="status-badge error">เกิดข้อผิดพลาด</div>
              <h2>โหลดภาพรวมไม่สำเร็จ</h2>
              <p>{state.message}</p>
              <button className="primary-button" type="button" onClick={() => void load()}>
                ลองใหม่
              </button>
            </div>
          ) : (
            <div className="task396-report-overview-summary">
              {overviewTotals.map((item) => (
                <article key={item.label}>
                  <span
                    className={
                      "production-report-icon production-report-icon-" + item.tone
                    }
                  >
                    <i className={item.icon} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="production-report-grid">
          {REPORT_OPTIONS.map((option) => (
            <button
              className="production-report-card"
              key={option.kind}
              type="button"
              onClick={() => selectReport(option.kind)}
            >
              <span
                className={
                  "production-report-icon production-report-icon-" + option.tone
                }
              >
                <i className={option.icon} aria-hidden="true" />
              </span>
              <strong>{option.title}</strong>
              <span>{option.description}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="module-stack task398-reports-page">
      <section className="module-panel fade-in">
        <div className="production-report-heading">
          <h2>{selectedOption?.title ?? "รายงาน"}</h2>
          <button
            className="secondary-button compact"
            type="button"
            onClick={() => selectReport(null)}
          >
            <i className="fa-solid fa-arrow-left" aria-hidden="true" />
            กลับ
          </button>
        </div>

        <div className="production-report-filters">
          <label>
            <span>วันที่เริ่ม</span>
            <DateField label="วันที่เริ่ม" value={from} onChange={(next) => setFrom(next)} />
          </label>
          <label>
            <span>วันที่สิ้นสุด</span>
            <DateField label="วันที่สิ้นสุด" value={to} onChange={(next) => setTo(next)} />
          </label>
          <div className="production-report-filter-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                const next = monthRange();
                setFrom(next.from);
                setTo(next.to);
              }}
            >
              ล้าง
            </button>
            <button
              className="primary-button"
              type="button"
              onClick={() => void load()}
            >
              ค้นหา
            </button>
            <button
              className="success-button"
              type="button"
              disabled={selectedRows.length === 0}
              onClick={() => exportCsv(selectedRows, selectedKind)}
            >
              <i className="fa-solid fa-file-export" aria-hidden="true" />
              CSV
            </button>
          </div>
        </div>

        {state.status === "loading" ? (
          <div className="module-state production-report-state" role="status">
            <div className="spinner" aria-hidden="true" />
            <h2>กำลังโหลดรายงาน</h2>
          </div>
        ) : state.status === "error" ? (
          <div className="module-state production-report-state" role="alert">
            <div className="status-badge error">เกิดข้อผิดพลาด</div>
            <h2>โหลดรายงานไม่สำเร็จ</h2>
            <p>{state.message}</p>
            <button className="primary-button" onClick={() => void load()}>
              ลองใหม่
            </button>
          </div>
        ) : selectedRows.length === 0 ? (
          <div className="empty-state">
            <h3>ไม่พบข้อมูลในช่วงวันที่นี้</h3>
            <p>ลองเปลี่ยนช่วงวันที่แล้วค้นหาอีกครั้ง</p>
          </div>
        ) : (
          <>
            <div className="table-scroll production-report-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>วันที่</th>
                    <th>พนักงาน</th>
                    <th>สถานะ</th>
                    <th>รายละเอียด</th>
                    <th>จำนวนเงิน</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRows.map((row) => (
                    <tr key={row.kind + "-" + row.id}>
                      <td>{row.date}</td>
                      <td>{row.employeeName}</td>
                      <td>
                        <span className="request-status">{row.status}</span>
                      </td>
                      <td>{row.summary}</td>
                      <td>{row.amount ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="production-report-pagination">
              แสดง {selectedRows.length} รายการ
            </div>
          </>
        )}
      </section>

      {selectedKind === "ATTENDANCE" && missing.length > 0 ? (
        <section className="module-panel">
          <h2>ลืมลงเวลาออก ({missing.length})</h2>
          <div className="table-scroll production-report-table-wrap">
            <table className="data-table">
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

      {state.status === "ready" ? (
        <section className="module-panel production-report-summary">
          <h2>สรุปข้อมูล</h2>
          <div className="production-report-summary-grid">
            {REPORT_OPTIONS.map((option) => {
              const count =
                state.data.rows.filter((row) => row.kind === option.kind)
                  .length;
              return (
                <article key={option.kind}>
                  <span
                    className={
                      "production-report-icon production-report-icon-" +
                      option.tone
                    }
                  >
                    <i className={option.icon} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{count}</strong>
                    <span>{option.title}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
