"use client";

import { useEffect, useId, useRef, useState } from "react";

import { isoToDmy } from "./format";
import { Icon } from "./icons";

const MONTHS_FULL = [
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
const WEEKDAYS = ["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"] as const;

function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function todayIso(): string {
  const now = new Date();
  return toIso(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Monday-first grid of ISO dates (null = padding) for one month. */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1).getDay(); // 0 = Sunday
  const lead = (first + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= days; day += 1) cells.push(toIso(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * Calendar popover in Thai with Buddhist years only.
 * mode "range": first click = start, second click = end (swapped if earlier).
 * mode "single": one click picks the day and end always equals start.
 * Values in and out are ISO "YYYY-MM-DD"; "" means not chosen.
 */
export function DatePicker({
  mode,
  start,
  end,
  onChange,
  label,
  min,
}: {
  readonly mode: "single" | "range";
  readonly start: string;
  readonly end: string;
  readonly onChange: (start: string, end: string) => void;
  readonly label: string;
  readonly min?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const anchor = start || todayIso();
  const [view, setView] = useState(() => ({ year: Number(anchor.slice(0, 4)), month: Number(anchor.slice(5, 7)) - 1 }));
  const box = useRef<HTMLSpanElement>(null);
  const popupId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  });

  function openPopup() {
    const base = start || todayIso();
    setView({ year: Number(base.slice(0, 4)), month: Number(base.slice(5, 7)) - 1 });
    setPicking(null);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setPicking(null);
    setHover(null);
  }

  function pick(iso: string) {
    if (mode === "single") {
      onChange(iso, iso);
      close();
      return;
    }
    if (!picking) {
      setPicking(iso);
      onChange(iso, iso);
      return;
    }
    const [a, b] = picking <= iso ? [picking, iso] : [iso, picking];
    onChange(a, b);
    close();
  }

  function shift(delta: number) {
    setView((current) => {
      const index = current.year * 12 + current.month + delta;
      return { year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 };
    });
  }

  const today = todayIso();
  const rangeStart = picking ?? start;
  const rangeEnd = picking ? (hover ?? picking) : end || start;
  const [lo, hi] = rangeStart && rangeEnd && rangeEnd < rangeStart ? [rangeEnd, rangeStart] : [rangeStart, rangeEnd];

  const text = !start
    ? ""
    : mode === "range" && end && end !== start
      ? `${isoToDmy(start)} – ${isoToDmy(end)}`
      : isoToDmy(start);

  return (
    <span className="ck-dp" ref={box}>
      <button
        type="button"
        className={open ? "ck-in ck-dp-field open" : "ck-in ck-dp-field"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popupId}
        aria-label={label + (text ? " " + text : "")}
        onClick={() => (open ? close() : openPopup())}
      >
        <span className={text ? "" : "ck-dp-ph"}>{text || (mode === "range" ? "วว/ดด/ปปปป – วว/ดด/ปปปป" : "วว/ดด/ปปปป")}</span>
        <Icon name="calendar" size={18} />
      </button>
      {open ? (
        <div className="ck-dp-pop" id={popupId} role="dialog" aria-label={label}>
          <div className="ck-dp-head">
            <button type="button" aria-label="เดือนก่อนหน้า" onClick={() => shift(-1)}>
              <Icon name="back" size={18} />
            </button>
            <b>
              {MONTHS_FULL[view.month]} {view.year + 543}
            </b>
            <button type="button" aria-label="เดือนถัดไป" onClick={() => shift(1)}>
              <Icon name="chevron" size={18} />
            </button>
          </div>
          <div className="ck-dp-grid" role="grid">
            {WEEKDAYS.map((day, index) => (
              <span key={day} className={index >= 5 ? "ck-dp-wd we" : "ck-dp-wd"}>
                {day}
              </span>
            ))}
            {monthGrid(view.year, view.month).map((iso, index) => {
              if (!iso) return <span key={"pad" + index} />;
              const disabled = Boolean(min && iso < min);
              const weekend = index % 7 >= 5;
              const inRange = Boolean(lo && hi && iso >= lo && iso <= hi);
              const edge = iso === lo || iso === hi;
              const classes = ["ck-dp-day", weekend ? "we" : "", iso === today ? "today" : "", inRange ? "in" : "", edge && inRange ? "edge" : ""]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  key={iso}
                  type="button"
                  className={classes}
                  disabled={disabled}
                  aria-pressed={edge && inRange}
                  aria-label={isoToDmy(iso)}
                  onClick={() => pick(iso)}
                  onMouseEnter={() => (picking ? setHover(iso) : undefined)}
                >
                  {Number(iso.slice(8, 10))}
                </button>
              );
            })}
          </div>
          <div className="ck-dp-foot">
            <span>{mode === "range" ? (picking ? "เลือกวันสิ้นสุด" : "เลือกวันเริ่ม แล้วเลือกวันสิ้นสุด") : "เลือกวันที่"}</span>
            <button
              type="button"
              className="ck-dp-today"
              onClick={() => {
                const now = todayIso();
                setView({ year: Number(now.slice(0, 4)), month: Number(now.slice(5, 7)) - 1 });
              }}
            >
              วันนี้
            </button>
          </div>
        </div>
      ) : null}
    </span>
  );
}
