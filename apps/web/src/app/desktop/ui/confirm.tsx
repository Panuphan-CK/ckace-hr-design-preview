"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * In-page replacement for window.confirm (some browsers block native dialogs).
 * `ask(message)` resolves true on confirm, false on cancel/Escape/scrim.
 */
export function useConfirm(): { readonly ask: (message: string, confirmLabel?: string) => Promise<boolean>; readonly dialog: ReactNode } {
  const [state, setState] = useState<{ message: string; confirmLabel: string } | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const finish = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setState(null);
  }, []);

  const ask = useCallback((message: string, confirmLabel = "ยืนยัน") => {
    resolver.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setState({ message, confirmLabel });
    });
  }, []);

  useEffect(() => {
    if (!state) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [state, finish]);

  const dialog = state ? (
    <>
      <button type="button" className="ck-scrim" aria-label="ยกเลิก" onClick={() => finish(false)} />
      <div className="ck-dialog" role="alertdialog" aria-modal="true" aria-label={state.message} style={{ maxWidth: 420 }}>
        <div className="ck-dlg-b">
          <p style={{ margin: 0, fontSize: 16 }}>{state.message}</p>
        </div>
        <div className="ck-dlg-f">
          <button type="button" className="ck-btn no" onClick={() => finish(true)}>
            {state.confirmLabel}
          </button>
          <button type="button" className="ck-btn quiet ck-ml" onClick={() => finish(false)}>
            ไม่ยกเลิก
          </button>
        </div>
      </div>
    </>
  ) : null;

  return { ask, dialog };
}
