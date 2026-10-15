"use client";

import type {
  AttendanceSelfOverview,
  LeaveEntitlementView,
  LeaveSelfOverview,
  MedicalSelfOverview,
  OvertimeSelfOverview,
} from "@ckace/contracts";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { DashboardAnnouncements } from "./dashboard-announcements";

type ReadState<T> =
  | { status: "loading" }
  | { status: "ready"; value: T }
  | { status: "error"; message: string };

interface DashboardData {
  readonly leave: ReadState<LeaveSelfOverview>;
  readonly attendance: ReadState<AttendanceSelfOverview>;
  readonly overtime: ReadState<OvertimeSelfOverview>;
  readonly medical: ReadState<MedicalSelfOverview>;
}

type DashboardState =
  | { status: "loading" }
  | { status: "ready"; data: DashboardData };

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
] as const;

const THAI_MONTH_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
] as const;

function readErrorMessage(label: string, status: number): string {
  if (status === 401) return "หมดเวลาการเข้าใช้งาน กรุณาเข้าสู่ระบบใหม่";
  if (status === 403) return `บัญชีนี้ไม่มีสิทธิ์ดูข้อมูล${label}`;
  if (status === 503) return `ข้อมูล${label}ยังไม่พร้อมให้บริการในขณะนี้`;
  return `ไม่สามารถโหลดข้อมูล${label}ได้`;
}

async function readResource<T>(
  url: string,
  label: string,
): Promise<ReadState<T>> {
  try {
    const response = await fetch(url, {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) {
      return {
        status: "error",
        message: readErrorMessage(label, response.status),
      };
    }
    return {
      status: "ready",
      value: (await response.json()) as T,
    };
  } catch {
    return {
      status: "error",
      message: `ไม่สามารถเชื่อมต่อเพื่อโหลดข้อมูล${label}ได้`,
    };
  }
}

function leaveIcon(entitlement: LeaveEntitlementView): string {
  const key = entitlement.leaveTypeKey.toLowerCase();
  if (key.includes("sick")) return "fa-solid fa-user-injured";
  if (key.includes("annual") || key.includes("vacation")) {
    return "fa-solid fa-plane-up";
  }
  if (key.includes("personal")) return "fa-solid fa-person-walking-luggage";
  if (key.includes("maternity")) return "fa-solid fa-baby-carriage";
  if (key.includes("study")) return "fa-solid fa-graduation-cap";
  if (key.includes("military")) return "fa-solid fa-person-military-rifle";
  return "fa-solid fa-calendar-day";
}

function leaveTone(index: number): string {
  const tones = ["blue", "red", "purple", "green", "pink", "orange"];
  return tones[index % tones.length] ?? "blue";
}

function leaveToneColor(tone: string): string {
  if (tone === "red") return "#ef5350";
  if (tone === "purple") return "#745af2";
  if (tone === "green") return "#22c55e";
  if (tone === "pink") return "#ec4899";
  if (tone === "orange") return "#f97316";
  return "#3b82f6";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 2,
  }).format(value);
}

function dateMatchesPeriod(
  value: string,
  year: number,
  month: number | null,
): boolean {
  const [rawYear, rawMonth] = value.slice(0, 10).split("-");
  const valueYear = Number(rawYear);
  const valueMonth = Number(rawMonth);
  return valueYear === year && (month === null || valueMonth === month);
}

function ResourceError({
  message,
  onRetry,
}: {
  readonly message: string;
  readonly onRetry: () => void;
}) {
  return (
    <div className="production-dashboard-resource-error" role="alert">
      <span>{message}</span>
      <button className="secondary-button compact" type="button" onClick={onRetry}>
        ลองใหม่
      </button>
    </div>
  );
}

export default function DesktopHomePage() {
  const now = useMemo(() => new Date(), []);
  const [state, setState] = useState<DashboardState>({
    status: "loading",
  });
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const loadDashboard = useCallback(async () => {
    setState({ status: "loading" });
    const [leave, attendance, overtime, medical] = await Promise.all([
      readResource<LeaveSelfOverview>("/api/leave/me", "การลา"),
      readResource<AttendanceSelfOverview>(
        "/api/attendance/me",
        "เวลาเข้างาน",
      ),
      readResource<OvertimeSelfOverview>("/api/overtime/me", "โอที"),
      readResource<MedicalSelfOverview>(
        "/api/medical/me",
        "ค่ารักษาพยาบาล",
      ),
    ]);
    setState({
      status: "ready",
      data: { leave, attendance, overtime, medical },
    });
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    function closeFilter(event: MouseEvent) {
      if (
        filterRef.current &&
        event.target instanceof Node &&
        !filterRef.current.contains(event.target)
      ) {
        setFilterOpen(false);
        setMonthPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", closeFilter);
    return () => document.removeEventListener("mousedown", closeFilter);
  }, []);

  if (state.status === "loading") {
    return (
      <section
        className="module-state"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="spinner" aria-hidden="true" />
        <h1>กำลังโหลดข้อมูล</h1>
        <p>กำลังเตรียมแดชบอร์ดของคุณ</p>
      </section>
    );
  }

  const { data } = state;
  const leave =
    data.leave.status === "ready" ? data.leave.value : null;
  const overtime =
    data.overtime.status === "ready" ? data.overtime.value : null;
  const medical =
    data.medical.status === "ready" ? data.medical.value : null;
  const attendance =
    data.attendance.status === "ready" ? data.attendance.value : null;

  const periodLabel =
    selectedMonth === null
      ? String(selectedYear + 543)
      : THAI_MONTHS[selectedMonth - 1] + " " + String(selectedYear + 543);

  const filteredApprovedLeave =
    leave?.requests.filter(
      (request) =>
        request.status === "APPROVED" &&
        dateMatchesPeriod(request.startDate, selectedYear, selectedMonth),
    ) ?? [];

  const usedLeaveByType = new Map<string, number>();
  for (const request of filteredApprovedLeave) {
    usedLeaveByType.set(
      request.leaveTypeKey,
      (usedLeaveByType.get(request.leaveTypeKey) ?? 0) + request.usageDays,
    );
  }

  const approvedOvertimeMinutes =
    overtime?.requests
      .filter((request) => request.status === "APPROVED")
      .flatMap((request) => request.segments)
      .filter((segment) =>
        dateMatchesPeriod(segment.workDate, selectedYear, selectedMonth),
      )
      .reduce((total, segment) => total + segment.requestedMinutes, 0) ?? 0;
  const approvedOvertimeHours = approvedOvertimeMinutes / 60;
  const approvedOvertimeCount =
    overtime?.requests.filter(
      (request) =>
        request.status === "APPROVED" &&
        request.segments.some((segment) =>
          dateMatchesPeriod(segment.workDate, selectedYear, selectedMonth),
        ),
    ).length ?? 0;

  const approvedMedicalClaims =
    medical?.claims.filter(
      (claim) =>
        claim.status === "APPROVED" &&
        dateMatchesPeriod(claim.sicknessDate, selectedYear, selectedMonth),
    ) ?? [];
  const approvedMedicalAmount = approvedMedicalClaims.reduce(
    (sum, claim) => sum + claim.amount,
    0,
  );

  const lateCount =
    attendance?.records.filter(
      (record) =>
        dateMatchesPeriod(record.workDate, selectedYear, selectedMonth) &&
        (record.lateMinutes ?? 0) > 0,
    ).length ?? 0;
  const earlyCount =
    attendance?.records.filter(
      (record) =>
        dateMatchesPeriod(record.workDate, selectedYear, selectedMonth) &&
        (record.earlyMinutes ?? 0) > 0,
    ).length ?? 0;

  const leaveChartItems =
    leave?.entitlements.map((entitlement, index) => {
      const used = usedLeaveByType.get(entitlement.leaveTypeKey) ?? 0;
      const tone = leaveTone(index);
      return {
        ...entitlement,
        used,
        remaining: Math.max(0, entitlement.quota - used),
        percentage:
          entitlement.quota > 0
            ? Math.min(100, Math.max(0, (used / entitlement.quota) * 100))
            : 0,
        tone,
        color: leaveToneColor(tone),
      };
    }) ?? [];

  const totalApprovedLeaveDays = leaveChartItems.reduce(
    (sum, item) => sum + item.used,
    0,
  );
  const maxUsedLeaveDays = Math.max(
    0,
    ...leaveChartItems.map((item) => item.used),
  );
  let donutCursor = 0;
  const donutStops: string[] = [];
  for (const item of leaveChartItems) {
    if (item.used <= 0 || totalApprovedLeaveDays <= 0) continue;
    const next = donutCursor + (item.used / totalApprovedLeaveDays) * 100;
    donutStops.push(
      item.color + " " + donutCursor + "% " + next + "%",
    );
    donutCursor = next;
  }
  const donutBackground =
    donutStops.length > 0
      ? "conic-gradient(" + donutStops.join(",") + ")"
      : "conic-gradient(#e5e7eb 0 100%)";

  function applyPreset(preset: "year" | "month" | "last-month") {
    const target = new Date(
      now.getFullYear(),
      now.getMonth() - (preset === "last-month" ? 1 : 0),
      1,
    );
    if (preset === "year") {
      setSelectedYear(now.getFullYear());
      setSelectedMonth(null);
    } else {
      setSelectedYear(target.getFullYear());
      setSelectedMonth(target.getMonth() + 1);
    }
    setFilterOpen(false);
    setMonthPickerOpen(false);
  }

  return (
    <div className="production-dashboard fade-in">
      <section className="production-dashboard-section">
        <div className="production-dashboard-section-head">
          <div>
            <h1>สรุปการใช้วันลา</h1>
            <p>
              {selectedMonth === null ? "ปี " : ""}
              {periodLabel} • ข้อมูลของฉัน
            </p>
          </div>
          <div className="production-dashboard-head-actions">
            <div className="production-dashboard-filter-wrap" ref={filterRef}>
              <button
                className="production-period-chip production-period-filter"
                type="button"
                aria-expanded={filterOpen}
                onClick={() => setFilterOpen((current) => !current)}
              >
                <i className="fa-regular fa-calendar" aria-hidden="true" />
                <span>{periodLabel}</span>
                <i className="fa-solid fa-chevron-down" aria-hidden="true" />
              </button>
              {filterOpen ? (
                <div className="production-dashboard-filter-panel">
                  <div className="production-dashboard-filter-section">
                    <span>ทางลัด</span>
                    <div className="production-dashboard-preset-grid">
                      <button type="button" onClick={() => applyPreset("year")}>
                        ปีนี้
                      </button>
                      <button type="button" onClick={() => applyPreset("month")}>
                        เดือนนี้
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset("last-month")}
                      >
                        เดือนที่แล้ว
                      </button>
                    </div>
                  </div>
                  <div className="production-dashboard-filter-section">
                    <span>กำหนดช่วงเวลา</span>
                    <button
                      className="production-dashboard-month-trigger"
                      type="button"
                      aria-expanded={monthPickerOpen}
                      onClick={() => setMonthPickerOpen((current) => !current)}
                    >
                      <span>
                        <i
                          className="fa-regular fa-calendar"
                          aria-hidden="true"
                        />
                        {selectedMonth === null
                          ? "เลือกเดือน"
                          : THAI_MONTHS[selectedMonth - 1] +
                            " " +
                            String(selectedYear + 543)}
                      </span>
                      <i
                        className="fa-solid fa-chevron-right"
                        aria-hidden="true"
                      />
                    </button>
                    {monthPickerOpen ? (
                      <div className="production-dashboard-month-panel">
                        <div className="production-dashboard-year-nav">
                          <button
                            type="button"
                            aria-label="ปีก่อนหน้า"
                            onClick={() =>
                              setSelectedYear((current) => current - 1)
                            }
                          >
                            <i
                              className="fa-solid fa-chevron-left"
                              aria-hidden="true"
                            />
                          </button>
                          <strong>{selectedYear + 543}</strong>
                          <button
                            type="button"
                            aria-label="ปีถัดไป"
                            onClick={() =>
                              setSelectedYear((current) => current + 1)
                            }
                          >
                            <i
                              className="fa-solid fa-chevron-right"
                              aria-hidden="true"
                            />
                          </button>
                        </div>
                        <div className="production-dashboard-month-grid">
                          {THAI_MONTHS.map((monthName, index) => (
                            <button
                              className={
                                selectedMonth === index + 1 ? "active" : ""
                              }
                              type="button"
                              key={monthName}
                              onClick={() => {
                                setSelectedMonth(index + 1);
                                setMonthPickerOpen(false);
                              }}
                            >
                              {THAI_MONTH_SHORT[index]}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <button
                    className="production-dashboard-clear-filter"
                    type="button"
                    onClick={() => {
                      setSelectedYear(now.getFullYear());
                      setSelectedMonth(null);
                      setFilterOpen(false);
                      setMonthPickerOpen(false);
                    }}
                  >
                    ล้างตัวกรอง
                  </button>
                </div>
              ) : null}
            </div>
            <button
              className="secondary-button compact"
              type="button"
              onClick={() => void loadDashboard()}
            >
              <i className="fa-solid fa-rotate-right" aria-hidden="true" />
              รีเฟรช
            </button>
          </div>
        </div>

        {data.leave.status === "error" ? (
          <ResourceError
            message={data.leave.message}
            onRetry={() => void loadDashboard()}
          />
        ) : leave && leave.entitlements.length > 0 ? (
          <>
            <div className="production-leave-summary-grid">
              {leaveChartItems.map((entitlement) => (
                <article
                  className={
                    "production-leave-card production-leave-card-" +
                    entitlement.tone
                  }
                  key={entitlement.entitlementId}
                >
                  <div className="production-leave-card-head">
                    <span
                      className={
                        "production-leave-icon production-leave-icon-" +
                        entitlement.tone
                      }
                    >
                      <i
                        className={leaveIcon(entitlement)}
                        aria-hidden="true"
                      />
                    </span>
                    <div className="production-leave-used">
                      <strong>{formatNumber(entitlement.used)}</strong>
                      <span>ใช้ไป</span>
                    </div>
                  </div>
                  <h2>{entitlement.leaveTypeName}</h2>
                  <p>สิทธิทั้งหมด {formatNumber(entitlement.quota)} วัน</p>
                  <div className="production-leave-progress-track">
                    <span style={{ width: entitlement.percentage + "%" }} />
                  </div>
                  <p className="production-leave-percent">
                    {Math.round(entitlement.percentage)}% ใช้ไปแล้ว
                  </p>
                </article>
              ))}
            </div>

            <div className="production-dashboard-chart-grid">
              <article className="production-dashboard-chart-card">
                <div className="production-dashboard-chart-head">
                  <h2>สิทธิวันลาและการใช้งาน</h2>
                  <p>จำนวนวันลาที่ใช้ไป แยกตามประเภทการลา</p>
                </div>
                <div className="production-usage-bar-chart">
                  <div
                    className="production-chart-grid-lines"
                    aria-hidden="true"
                  />
                  <div className="production-usage-bar-columns">
                    {leaveChartItems.map((entitlement) => (
                      <div
                        className="production-usage-bar-item"
                        key={entitlement.entitlementId}
                      >
                        <div className="production-usage-bar-plot">
                          <strong
                            style={{
                              bottom:
                                (maxUsedLeaveDays > 0
                                  ? (entitlement.used / maxUsedLeaveDays) * 100
                                  : 0) +
                                "%",
                            }}
                          >
                            {formatNumber(entitlement.used)}
                          </strong>
                          <span
                            style={{
                              height:
                                Math.max(
                                  entitlement.used > 0 ? 8 : 0,
                                  maxUsedLeaveDays > 0
                                    ? (entitlement.used / maxUsedLeaveDays) * 100
                                    : 0,
                                ) + "%",
                              background: entitlement.color,
                            }}
                          />
                        </div>
                        <span>{entitlement.leaveTypeName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <article className="production-dashboard-chart-card">
                <div className="production-dashboard-chart-head">
                  <h2>สัดส่วนวันลาที่อนุมัติแล้ว</h2>
                  <p>แยกตามประเภทการลาจากตัวกรองที่เลือก</p>
                </div>
                <div className="production-proportion-chart">
                  <div
                    className="production-proportion-donut"
                    style={{ background: donutBackground }}
                    aria-label={
                      "วันลาที่อนุมัติแล้ว " +
                      formatNumber(totalApprovedLeaveDays) +
                      " วัน"
                    }
                  >
                    <div>
                      <strong>{formatNumber(totalApprovedLeaveDays)}</strong>
                      <span>วัน</span>
                    </div>
                  </div>
                  <div className="production-proportion-legend">
                    {leaveChartItems.some((entitlement) => entitlement.used > 0) ? (
                      leaveChartItems
                        .filter((entitlement) => entitlement.used > 0)
                        .map((entitlement) => {
                          const share =
                            totalApprovedLeaveDays > 0
                              ? (entitlement.used / totalApprovedLeaveDays) * 100
                              : 0;
                          return (
                            <div key={entitlement.entitlementId}>
                              <span
                                className="production-approved-dot"
                                style={{ background: entitlement.color }}
                              />
                              <span>{entitlement.leaveTypeName}</span>
                              <strong>
                                {formatNumber(entitlement.used)} วัน ·{" "}
                                {share.toFixed(share % 1 === 0 ? 0 : 1)}%
                              </strong>
                            </div>
                          );
                        })
                    ) : (
                      <div className="production-proportion-empty">
                        ยังไม่มีวันลาที่อนุมัติในช่วงเวลานี้
                      </div>
                    )}
                  </div>
                </div>
              </article>
            </div>
          </>
        ) : (
          <div className="empty-state production-dashboard-empty">
            <i className="fa-regular fa-calendar-xmark" aria-hidden="true" />
            <h3>ยังไม่มีการกำหนดสิทธิวันลา</h3>
            <p>ข้อมูลสิทธิวันลาจะแสดงที่นี่เมื่อระบบมีข้อมูล</p>
          </div>
        )}
      </section>

      <section className="production-dashboard-section">
        <div className="production-operational-grid">
          <article className="production-operational-card production-operational-blue">
            <div className="production-operational-head">
              <div>
                <h2>ชั่วโมงการทำงาน (OT)</h2>
                {data.overtime.status === "error" ? (
                  <span className="production-operational-unavailable">
                    โหลดข้อมูลไม่สำเร็จ
                  </span>
                ) : (
                  <strong>
                    {formatNumber(approvedOvertimeHours)}{" "}
                    <small>ชั่วโมง</small>
                  </strong>
                )}
              </div>
              <span className="production-operational-icon">
                <i className="fa-solid fa-clock" aria-hidden="true" />
              </span>
            </div>
            <p>{approvedOvertimeCount} รายการที่อนุมัติแล้ว</p>
          </article>

          <article className="production-operational-card production-operational-green">
            <div className="production-operational-head">
              <div>
                <h2>ค่ารักษาพยาบาล</h2>
                {data.medical.status === "error" ? (
                  <span className="production-operational-unavailable">
                    โหลดข้อมูลไม่สำเร็จ
                  </span>
                ) : (
                  <strong>{formatCurrency(approvedMedicalAmount)}</strong>
                )}
              </div>
              <span className="production-operational-icon">
                <i
                  className="fa-solid fa-hand-holding-medical"
                  aria-hidden="true"
                />
              </span>
            </div>
            <p>{approvedMedicalClaims.length} รายการที่อนุมัติแล้ว</p>
          </article>

          <article className="production-operational-card production-operational-purple">
            <div className="production-operational-head">
              <h2>การลงเวลา</h2>
              <span className="production-operational-icon">
                <i className="fa-solid fa-fingerprint" aria-hidden="true" />
              </span>
            </div>
            {data.attendance.status === "error" ? (
              <span className="production-operational-unavailable">
                โหลดข้อมูลไม่สำเร็จ
              </span>
            ) : (
              <div className="production-attendance-mini-grid">
                <div>
                  <span>มาสาย</span>
                  <strong>{lateCount} ครั้ง</strong>
                </div>
                <div>
                  <span>ออกก่อน</span>
                  <strong>{earlyCount} ครั้ง</strong>
                </div>
                <div>
                  <span>ไม่ลงเวลา</span>
                  <strong>—</strong>
                </div>
              </div>
            )}
          </article>
        </div>
      </section>

      <DashboardAnnouncements />
    </div>
  );
}
