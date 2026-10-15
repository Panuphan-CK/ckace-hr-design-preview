"use client";

export type RequestWorkspaceView = "new" | "pending" | "history";

export function RequestWorkspaceTabs({
  value,
  onChange,
  newLabel,
  pendingCount,
  historyCount,
}: {
  readonly value: RequestWorkspaceView;
  readonly onChange: (value: RequestWorkspaceView) => void;
  readonly newLabel: string;
  readonly pendingCount: number;
  readonly historyCount: number;
}) {
  const items: readonly {
    readonly id: RequestWorkspaceView;
    readonly label: string;
    readonly count?: number;
    readonly icon: string;
  }[] = [
    { id: "new", label: newLabel, icon: "fa-solid fa-plus" },
    {
      id: "pending",
      label: "กำลังดำเนินการ",
      count: pendingCount,
      icon: "fa-regular fa-clock",
    },
    {
      id: "history",
      label: "ประวัติ",
      count: historyCount,
      icon: "fa-solid fa-clock-rotate-left",
    },
  ];

  return (
    <div
      className="task396-workspace-tabs task396-request-tabs task398-request-tabs"
      role="tablist"
      aria-label="มุมมองคำขอของฉัน"
    >
      {items.map((item) => (
        <button
          key={item.id}
          className={value === item.id ? "active" : ""}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
        >
          <i className={item.icon} aria-hidden="true" />
          <span className="task398-request-tab-label">{item.label}</span>
          {item.count === undefined ? null : (
            <span className="task398-request-tab-count">{item.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

const MONTH_OPTIONS = [
  ["01", "มกราคม"],
  ["02", "กุมภาพันธ์"],
  ["03", "มีนาคม"],
  ["04", "เมษายน"],
  ["05", "พฤษภาคม"],
  ["06", "มิถุนายน"],
  ["07", "กรกฎาคม"],
  ["08", "สิงหาคม"],
  ["09", "กันยายน"],
  ["10", "ตุลาคม"],
  ["11", "พฤศจิกายน"],
  ["12", "ธันวาคม"],
] as const;

export function RequestListToolbar({
  search,
  onSearchChange,
  month,
  onMonthChange,
  onClear,
  onCreate,
  createLabel,
  searchPlaceholder = "ค้นหารายการ...",
}: {
  readonly search: string;
  readonly onSearchChange: (value: string) => void;
  readonly month: string;
  readonly onMonthChange: (value: string) => void;
  readonly onClear: () => void;
  readonly onCreate: () => void;
  readonly createLabel: string;
  readonly searchPlaceholder?: string;
}) {
  return (
    <div className="task398-request-toolbar">
      <div className="task398-request-search">
        <input
          className="form-input"
          type="search"
          value={search}
          placeholder={searchPlaceholder}
          onChange={(event) => onSearchChange(event.currentTarget.value)}
        />
        <i className="fa-solid fa-search" aria-hidden="true" />
      </div>
      <select
        className="form-input task398-request-month"
        value={month}
        onChange={(event) => onMonthChange(event.currentTarget.value)}
        aria-label="กรองตามเดือน"
      >
        <option value="">-- ทุกเดือน --</option>
        {MONTH_OPTIONS.map(([value, label]) => (
          <option value={value} key={value}>
            {label}
          </option>
        ))}
      </select>
      <button
        className="task398-clear-button"
        type="button"
        onClick={onClear}
      >
        ล้าง
      </button>
      <button
        className="success-button task398-create-button"
        type="button"
        onClick={onCreate}
      >
        <i className="fa-solid fa-plus" aria-hidden="true" />
        {createLabel}
      </button>
    </div>
  );
}
