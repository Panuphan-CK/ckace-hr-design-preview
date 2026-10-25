"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { Icon, type IconName } from "./icons";

export type Tone = "leave" | "sick" | "biz" | "ot" | "time" | "med" | "gray" | "accent";

export function toneClass(tone: Tone): string {
  return "ck-c-" + tone;
}

export function PageHead({
  tone,
  icon,
  title,
  subtitle,
  children,
}: {
  readonly tone: Tone;
  readonly icon: IconName;
  readonly title: string;
  readonly subtitle: string;
  readonly children?: ReactNode;
}) {
  return (
    <header className={"ck-phead " + toneClass(tone)}>
      <div className="ck-wrap">
        <span className="ck-chip lg">
          <Icon name={icon} size={26} />
        </span>
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {children ? <div className="ck-ml ck-row">{children}</div> : null}
      </div>
    </header>
  );
}

export function SectionHead({
  title,
  id,
  count,
  hint,
  children,
}: {
  readonly title: string;
  readonly id?: string;
  readonly count?: number;
  readonly hint?: string;
  readonly children?: ReactNode;
}) {
  return (
    <div className="ck-sh">
      <h2 id={id}>{title}</h2>
      {count !== undefined ? <span className="ck-count">{count}</span> : null}
      {hint ? <span className="ck-hint">{hint}</span> : null}
      {children ? <div className="ck-ml ck-row">{children}</div> : null}
    </div>
  );
}

export function Filters<T extends string>({
  value,
  options,
  onChange,
}: {
  readonly value: T;
  readonly options: readonly { readonly id: T; readonly label: string }[];
  readonly onChange: (next: T) => void;
}) {
  return (
    <div className="ck-filters" role="tablist">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          className={value === option.id ? "on" : ""}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function LoadingState({ title }: { readonly title: string }) {
  return (
    <div className="ck-state" role="status" aria-live="polite" aria-busy="true">
      <div className="ck-spinner" aria-hidden="true" />
      <h1>{title}</h1>
    </div>
  );
}

export function ErrorState({ title, message, onRetry }: { readonly title: string; readonly message: string; readonly onRetry: () => void }) {
  return (
    <div className="ck-state" role="alert">
      <h1>{title}</h1>
      <p>{message}</p>
      <button className="ck-btn sky" type="button" onClick={onRetry}>
        ลองใหม่
      </button>
    </div>
  );
}

export function Message({ value }: { readonly value: { kind: "success" | "error"; text: string } | null }) {
  if (!value) return null;
  return (
    <div className={"ck-msg " + value.kind} role={value.kind === "error" ? "alert" : "status"}>
      {value.text}
    </div>
  );
}

export function EmptyState({ title, children, icon = "document" }: { readonly title: string; readonly children?: ReactNode; readonly icon?: IconName }) {
  return (
    <div className="ck-empty">
      <span className="ck-empty-art" aria-hidden="true">
        <Icon name={icon} size={40} />
      </span>
      <b>{title}</b>
      {children}
    </div>
  );
}

/** On/off switch. The one control for every yes/no setting in the system. */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  readonly checked: boolean;
  readonly onChange: (next: boolean) => void;
  readonly label: string;
  readonly disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={checked ? "ck-sw on" : "ck-sw"}
      onClick={() => onChange(!checked)}
    >
      <i />
    </button>
  );
}

/** A setting row: label (+ short hint) on the left, its single control on the right. */
export function SettingRow({ label, hint, children }: { readonly label: string; readonly hint?: string; readonly children: ReactNode }) {
  return (
    <div className="ck-srow">
      <div>
        <b>{label}</b>
        {hint ? <small>{hint}</small> : null}
      </div>
      <div className="ck-srow-c">{children}</div>
    </div>
  );
}

export type DotTone = "ok" | "wait" | "bad" | "back" | "muted";

/** Status as a coloured dot; the meaning appears on hover or keyboard focus. */
export function StatusDot({ tone, label }: { readonly tone: DotTone; readonly label: string }) {
  return (
    <span className={"ck-dot " + tone} tabIndex={0} role="img" aria-label={label}>
      <i />
      <span className="ck-dot-tip">{label}</span>
    </span>
  );
}

export interface GridColumn<T> {
  readonly key: string;
  readonly header: string;
  readonly render: (row: T) => ReactNode;
  readonly width?: string;
  readonly align?: "left" | "center" | "right";
}

/** One table for a whole list: every row shows all its data, clicking a row opens its edit window. */
export function DataGrid<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  empty,
  pageSize = 15,
}: {
  readonly rows: readonly T[];
  readonly columns: readonly GridColumn<T>[];
  readonly rowKey: (row: T) => string;
  readonly onRowClick?: (row: T) => void;
  readonly empty?: ReactNode;
  readonly pageSize?: number;
}) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = rows.slice(current * pageSize, current * pageSize + pageSize);
  if (rows.length === 0) return <>{empty ?? <EmptyState title="ยังไม่มีข้อมูล" />}</>;
  return (
    <div className="ck-grid-wrap">
      <div className="ck-tablewrap">
        <table className="ck-table ck-grid">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} style={{ width: column.width, textAlign: column.align }}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={rowKey(row)}
                className={onRowClick ? "click" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
              >
                {columns.map((column) => (
                  <td key={column.key} style={{ textAlign: column.align }}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 ? (
        <div className="ck-pager">
          <button type="button" className="ck-btn quiet sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
            ก่อนหน้า
          </button>
          <span>
            หน้า {current + 1} / {pages} · ทั้งหมด {rows.length} รายการ
          </span>
          <button type="button" className="ck-btn quiet sm" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
            ถัดไป
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Large coloured band at the top of the home page: greeting, subtitle and stat circles. */
export function HeroBand({
  title,
  subtitle,
  eyebrow,
  action,
  children,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly eyebrow?: string;
  readonly action?: ReactNode;
  readonly children?: ReactNode;
}) {
  return (
    <section className="ck-hero">
      <div className="ck-hero-txt">
        {eyebrow ? <small>{eyebrow}</small> : null}
        <h1>{title}</h1>
        <p>{subtitle}</p>
        {action ? <div className="ck-hero-act">{action}</div> : null}
      </div>
      {children ? <div className="ck-hero-orbs">{children}</div> : null}
    </section>
  );
}

/** Round stat inside the hero band. */
export function StatOrb({ value, label, tone }: { readonly value: string; readonly label: string; readonly tone?: Tone }) {
  return (
    <div className={"ck-orb " + (tone ? toneClass(tone) : "")}>
      <b>{value}</b>
      <small>{label}</small>
    </div>
  );
}

/** Modal detail card. Closes on Escape, on the scrim, and on the close buttons. */
export function DetailDialog({
  tone,
  icon,
  kicker,
  title,
  status,
  onClose,
  footer,
  children,
}: {
  readonly tone: Tone;
  readonly icon: IconName;
  readonly kicker: string;
  readonly title: string;
  readonly status?: { readonly label: string; readonly tone: string };
  readonly onClose: () => void;
  readonly footer?: ReactNode;
  readonly children: ReactNode;
}) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  return (
    <>
      <button type="button" className="ck-scrim" aria-label="ปิดรายละเอียด" onClick={onClose} />
      <div className={"ck-dialog " + toneClass(tone)} role="dialog" aria-modal="true" aria-labelledby="ck-dialog-title">
        <div className="ck-dlg-h">
          <span className="ck-chip">
            <Icon name={icon} />
          </span>
          <div>
            <small>{kicker}</small>
            <h2 id="ck-dialog-title">{title}</h2>
          </div>
          {status ? <span className={"ck-pill " + status.tone}>{status.label}</span> : null}
          <button type="button" className="ck-x" aria-label="ปิด" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="ck-dlg-b">{children}</div>
        <div className="ck-dlg-f">
          {footer}
          <button type="button" className="ck-btn quiet ck-ml" onClick={onClose}>
            ปิด
          </button>
        </div>
      </div>
    </>
  );
}

/** HH:MM 24-hour text field (browser time inputs may show AM/PM depending on locale). */
export function TimeInput({
  value,
  onChange,
  label,
}: {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly label: string;
}) {
  const [text, setText] = useState(value);
  const emitted = useRef(value);
  useEffect(() => {
    // only an outside change (form reset, prefill) rewrites what the user is typing
    if (value !== emitted.current) {
      emitted.current = value;
      setText(value);
    }
  }, [value]);
  const valid = /^([01]\d|2[0-3]):[0-5]\d$/.test(text);
  return (
    <input
      className="ck-in ck-time"
      type="text"
      inputMode="numeric"
      placeholder="ชช:นน"
      aria-label={label}
      aria-invalid={text.length === 5 && !valid}
      maxLength={5}
      value={text}
      onChange={(event) => {
        const digits = event.currentTarget.value.replace(/\D/g, "").slice(0, 4);
        const next = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
        setText(next);
        const out = /^([01]\d|2[0-3]):[0-5]\d$/.test(next) ? next : "";
        emitted.current = out;
        onChange(out);
      }}
    />
  );
}
