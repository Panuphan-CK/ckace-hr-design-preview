"use client";

import { useCallback, useEffect, useState } from "react";

/** Company holidays for colouring calendars; a failed load just leaves them uncoloured. */
export function useHolidayMarks(): (iso: string) => "holiday" | undefined {
  const [holidays, setHolidays] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    void fetch("/api/leave/me", { credentials: "same-origin", cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { holidays?: readonly string[] } | null) => setHolidays(new Set(body?.holidays ?? [])))
      .catch(() => setHolidays(new Set()));
  }, []);
  return useCallback((iso: string) => (holidays.has(iso) ? ("holiday" as const) : undefined), [holidays]);
}
