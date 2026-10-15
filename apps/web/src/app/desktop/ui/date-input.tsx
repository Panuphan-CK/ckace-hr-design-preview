"use client";

import { useEffect, useRef, useState } from "react";

import { dmyToIso, isoToDmy, maskDmy } from "./format";
import { Icon } from "./icons";

/**
 * Date field that always shows DD/MM/YYYY (Buddhist year) regardless of the browser locale.
 * The value in and out is ISO "YYYY-MM-DD" ("" while incomplete or invalid).
 * The calendar button opens the browser's native picker through a hidden date input.
 */
export function DateInput({
  value,
  onChange,
  name,
  label,
  min,
  required,
}: {
  readonly value: string;
  readonly onChange: (iso: string) => void;
  readonly name?: string | undefined;
  readonly label: string;
  readonly min?: string | undefined;
  readonly required?: boolean | undefined;
}) {
  const [text, setText] = useState(isoToDmy(value));
  const picker = useRef<HTMLInputElement>(null);
  const emitted = useRef(value);

  useEffect(() => {
    // only an outside change (form reset, prefill) rewrites what the user is typing
    if (value !== emitted.current) {
      emitted.current = value;
      setText(isoToDmy(value));
    }
  }, [value]);

  function emit(next: string) {
    emitted.current = next;
    onChange(next);
  }

  const complete = text.length === 10;
  const iso = dmyToIso(text);
  const invalid = complete && (!iso || (min !== undefined && min !== "" && iso < min));

  function openPicker() {
    const input = picker.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  }

  return (
    <span className={invalid ? "ck-date invalid" : "ck-date"}>
      <input
        className="ck-in"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="วว/ดด/ปปปป"
        aria-label={label}
        aria-invalid={invalid}
        required={required}
        maxLength={10}
        value={text}
        onChange={(event) => {
          const next = maskDmy(event.currentTarget.value);
          setText(next);
          const nextIso = dmyToIso(next);
          emit(nextIso && (!min || nextIso >= min) ? nextIso : "");
        }}
      />
      {name ? <input type="hidden" name={name} value={iso && !invalid ? iso : ""} /> : null}
      <button type="button" className="ck-date-btn" aria-label={"เลือก" + label + "จากปฏิทิน"} onClick={openPicker}>
        <Icon name="calendar" size={18} />
      </button>
      <input
        ref={picker}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        className="ck-date-native"
        min={min || undefined}
        value={iso && !invalid ? iso : ""}
        onChange={(event) => {
          const picked = event.currentTarget.value;
          setText(isoToDmy(picked));
          emit(picked);
        }}
      />
      {invalid ? <small className="ck-date-err">วันที่ไม่ถูกต้อง</small> : null}
    </span>
  );
}
