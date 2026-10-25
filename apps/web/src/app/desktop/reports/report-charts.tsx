"use client";

import type { MonthBucket, TypeShare } from "./report-stats";
import { formatNumber } from "./report-stats";

export const SERIES_COLORS = ["#2f6fed", "#e0475e", "#7c4dff", "#e38a00", "#10a37f", "#64748b"] as const;

export function seriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length] ?? SERIES_COLORS[0];
}

export function MonthlyChart({ buckets, types }: { readonly buckets: readonly MonthBucket[]; readonly types: readonly string[] }) {
  const width = 640;
  const height = 240;
  const pad = { top: 24, right: 8, bottom: 28, left: 8 };
  const max = Math.max(1, ...buckets.map((bucket) => bucket.total));
  const slot = (width - pad.left - pad.right) / Math.max(1, buckets.length);
  const barW = Math.min(36, slot * 0.6);
  const plotH = height - pad.top - pad.bottom;
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="กราฟแท่งรายเดือน" style={{ width: "100%", height: "auto" }}>
        <line x1={pad.left} x2={width - pad.right} y1={height - pad.bottom} y2={height - pad.bottom} stroke="#e3e6ec" />
        {buckets.map((bucket, index) => {
          const x = pad.left + slot * index + (slot - barW) / 2;
          let y = height - pad.bottom;
          return (
            <g key={bucket.key}>
              {types.map((type, typeIndex) => {
                const value = bucket.parts[type] ?? 0;
                if (value <= 0) return null;
                const h = (value / max) * plotH;
                y -= h;
                return <rect key={type} x={x} y={y} width={barW} height={Math.max(h - 1, 1)} rx={3} fill={seriesColor(typeIndex)} />;
              })}
              <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize="12" fontWeight="600" fill="#111827">
                {formatNumber(bucket.total)}
              </text>
              <text x={x + barW / 2} y={height - 10} textAnchor="middle" fontSize="12" fill="#6b7280">
                {bucket.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="ck-row" style={{ marginTop: 6 }}>
        {types.map((type, index) => (
          <span key={type} className="ck-muted" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i style={{ width: 10, height: 10, borderRadius: 3, background: seriesColor(index), display: "inline-block" }} />
            {type}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({ shares, centerLabel, unit }: { readonly shares: readonly TypeShare[]; readonly centerLabel: string; readonly unit: string }) {
  const total = shares.reduce((sum, share) => sum + share.value, 0);
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div>
      <div style={{ position: "relative", width: 180, height: 180, margin: "0 auto" }}>
        <svg viewBox="0 0 180 180" role="img" aria-label="สัดส่วนตามประเภท" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#f1f2f5" strokeWidth="22" />
          {total > 0
            ? shares.map((share, index) => {
                const length = (share.value / total) * circumference;
                const circle = (
                  <circle
                    key={share.label}
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="none"
                    stroke={seriesColor(index)}
                    strokeWidth="22"
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += length;
                return circle;
              })
            : null}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", textAlign: "center" }}>
          <b style={{ fontSize: 26, fontWeight: 600 }}>{formatNumber(total)}</b>
          <small className="ck-muted">{centerLabel}</small>
        </div>
      </div>
      <dl className="ck-dl" style={{ marginTop: 14 }}>
        {shares.map((share, index) => (
          <div key={share.label} style={{ gridTemplateColumns: "1fr auto auto", alignItems: "center" }}>
            <dt style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--ck-ink)" }}>
              <i style={{ width: 10, height: 10, borderRadius: 3, background: seriesColor(index), display: "inline-block" }} />
              {share.label}
            </dt>
            <dd>
              {formatNumber(share.value)} {unit}
            </dd>
            <dd className="ck-muted" style={{ minWidth: 36, textAlign: "right" }}>
              {share.percent}%
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
