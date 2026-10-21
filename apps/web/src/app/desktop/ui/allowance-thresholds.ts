"use client";

import { useEffect, useState } from "react";

import { DEFAULT_ALLOWANCE_THRESHOLDS, type AllowanceThresholds } from "../overtime/overtime-view";

/** Meal / transport clock-out thresholds set by HR; falls back to the company defaults when they cannot be read. */
export function useAllowanceThresholds(): AllowanceThresholds {
  const [thresholds, setThresholds] = useState<AllowanceThresholds>(DEFAULT_ALLOWANCE_THRESHOLDS);
  useEffect(() => {
    void fetch("/api/overtime/me", { credentials: "same-origin", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { allowanceThresholds?: AllowanceThresholds } | null) => {
        if (body?.allowanceThresholds) setThresholds(body.allowanceThresholds);
      })
      .catch(() => undefined);
  }, []);
  return thresholds;
}
