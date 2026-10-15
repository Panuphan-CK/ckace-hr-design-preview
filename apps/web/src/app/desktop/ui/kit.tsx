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

export function EmptyState({ title, children }: { readonly title: string; readonly children?: ReactNode }) {
  return (
    <div className="ck-empty">
      <b>{title}</b>
      {children}
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
