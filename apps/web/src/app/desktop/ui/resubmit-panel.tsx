"use client";

import { useRef, useState } from "react";

import { DateField } from "./date-picker";
import { resolveSubmissionIntent, shouldDiscardSubmissionIntent, type SubmissionIntent } from "../submission-intent";

export interface ResubmitField {
  readonly name: string;
  readonly label: string;
  readonly type: "text" | "date" | "time" | "number" | "textarea";
  readonly value: string;
  readonly min?: string;
  readonly step?: string;
}

/** Result of a resubmission call: ok, or the HTTP status that failed (for the idempotency key) and a Thai message. */
export type ResubmitOutcome = { readonly ok: true } | { readonly ok: false; readonly status: number; readonly message: string };

/**
 * "Edit and send again" form for a request the approver sent back. The idempotency key stays the same
 * while the employee retries an unchanged submission after an uncertain response.
 */
export function ResubmitPanel({
  fields,
  onSubmit,
}: {
  readonly fields: readonly ResubmitField[];
  readonly onSubmit: (values: Record<string, string>, clientKey: string) => Promise<ResubmitOutcome>;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.name, f.value])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intent = useRef<SubmissionIntent | null>(null);

  if (!open) {
    return (
      <div className="ck-dlg-sec">
        <h3>แก้ไขและส่งใหม่</h3>
        <button type="button" className="ck-btn ok" onClick={() => setOpen(true)}>
          แก้ไขและส่งใหม่
        </button>
      </div>
    );
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    intent.current = resolveSubmissionIntent(intent.current, values);
    const outcome = await onSubmit(values, intent.current.clientKey);

    if (!outcome.ok) {
      if (shouldDiscardSubmissionIntent(outcome.status)) intent.current = null;
      setError(outcome.message);
    }

    setBusy(false);
  }

  return (
    <div className="ck-dlg-sec">
      <h3>แก้ไขและส่งใหม่</h3>
      <div style={{ display: "grid", gap: 8 }}>
        {fields.map((field) => (
          <label key={field.name} className="ck-field">
            <span>{field.label}</span>
            {field.type === "date" ? (
              <DateField
                label={field.label}
                value={values[field.name] ?? ""}
                onChange={(next) => setValues({ ...values, [field.name]: next })}
              />
            ) : field.type === "textarea" ? (
              <textarea
                className="ck-in"
                rows={3}
                maxLength={1000}
                value={values[field.name] ?? ""}
                disabled={busy}
                onChange={(event) => setValues({ ...values, [field.name]: event.currentTarget.value })}
              />
            ) : (
              <input
                className="ck-in"
                type={field.type}
                min={field.min}
                step={field.step}
                value={values[field.name] ?? ""}
                disabled={busy}
                onChange={(event) => setValues({ ...values, [field.name]: event.currentTarget.value })}
              />
            )}
          </label>
        ))}
        {error ? (
          <p role="alert" className="ck-msg error" style={{ margin: 0 }}>
            {error}
          </p>
        ) : null}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="ck-btn ok" disabled={busy} onClick={() => void submit()}>
            {busy ? "กำลังส่ง…" : "ส่งใหม่"}
          </button>
          <button type="button" className="ck-btn quiet" disabled={busy} onClick={() => setOpen(false)}>
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}
