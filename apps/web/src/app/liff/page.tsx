"use client";

import { useEffect, useRef, useState } from "react";

import type { LiffSession } from "./api";
import { startBridge } from "./bridge";
import { Extras, ExtrasButton } from "./extras";

interface LiffSdk {
  init(config: { liffId: string }): Promise<void>;
  isLoggedIn(): boolean;
  login(): void;
  getIDToken(): string | null;
}

declare global {
  interface Window {
    liff?: LiffSdk;
  }
}

type Auth =
  | { status: "loading" }
  | { status: "ready"; session: LiffSession }
  | { status: "error"; message: string };

function loadSdk(): Promise<LiffSdk> {
  return new Promise((resolve, reject) => {
    if (window.liff) return resolve(window.liff);
    const script = document.createElement("script");
    script.src = "https://static.line-scdn.net/liff/edge/2/sdk.js";
    script.onload = () => (window.liff ? resolve(window.liff) : reject(new Error("LIFF SDK missing")));
    script.onerror = () => reject(new Error("LIFF SDK failed"));
    document.head.appendChild(script);
  });
}

async function readSession(): Promise<LiffSession | null> {
  const response = await fetch("/api/security/session", { credentials: "same-origin", cache: "no-store" });
  return response.ok ? ((await response.json()) as LiffSession) : null;
}

/** Existing session first (desktop/browser), else sign in through LINE LIFF and exchange the ID token. */
async function authenticate(): Promise<Auth> {
  const existing = await readSession().catch(() => null);
  if (existing) return { status: "ready", session: existing };
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID?.trim();
  if (!liffId) {
    return { status: "error", message: "ยังไม่ได้ตั้งค่า LINE LIFF หรือยังไม่ได้เข้าสู่ระบบ กรุณาเปิดจากเมนู LINE ของบริษัท" };
  }
  try {
    const liff = await loadSdk();
    await liff.init({ liffId });
    if (!liff.isLoggedIn()) {
      liff.login();
      return { status: "loading" };
    }
    const idToken = liff.getIDToken();
    if (!idToken) return { status: "error", message: "ไม่สามารถยืนยันตัวตนผ่าน LINE ได้ กรุณาเปิดใหม่อีกครั้ง" };
    const response = await fetch("/api/desktop-auth/line-login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ idToken }),
    });
    if (response.status === 401) {
      return { status: "error", message: "บัญชี LINE นี้ยังไม่ได้ผูกกับพนักงาน กรุณาติดต่อฝ่ายบุคคล" };
    }
    if (!response.ok) return { status: "error", message: "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
    const session = await readSession();
    return session ? { status: "ready", session } : { status: "error", message: "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  } catch {
    return { status: "error", message: "ไม่สามารถเชื่อมต่อ LINE ได้ กรุณาลองใหม่อีกครั้ง" };
  }
}

const PAGES: Readonly<Record<string, string>> = {
  home: "home",
  leave: "leave",
  ot: "ot",
  medical: "medical",
  attendance: "time-edit",
  correction: "time-edit",
  history: "request-history",
  approvals: "approvals",
};

function extrasRoute(): string | null {
  const hash = window.location.hash.replace(/^#\/?/, "").split("?")[0] ?? "";
  if (hash === "x") return "";
  return hash.startsWith("x/") ? hash.slice(2) : null;
}

function currentPage(): string {
  const hash = window.location.hash.replace(/^#\/?/, "").split("?")[0] ?? "";
  return PAGES[hash || "home"] ?? "home";
}

const FRAME_STYLE = { position: "fixed", inset: 0, width: "100%", height: "100%", border: 0, background: "#f0f2f7" } as const;
const NOTE_STYLE = { padding: 24, fontFamily: "sans-serif", textAlign: "center" } as const;

function Frame({ session }: { session: LiffSession }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [page, setPage] = useState("home");

  useEffect(() => {
    const sync = () => setPage(currentPage());
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    const bridge = startBridge(frame, session, {
      navigate: (target) => {
        window.location.hash = `#/${target}`;
      },
    });
    const onLoad = () => void bridge.deliver().catch(() => undefined);
    frame.addEventListener("load", onLoad);
    return () => {
      frame.removeEventListener("load", onLoad);
      bridge.stop();
    };
  }, [session]);

  return (
    <>
      <iframe ref={ref} title="CK&RR_Request" style={FRAME_STYLE} src={`/react-read/index.html?ckaceBinding=production&ckacePage=${page}`} allow="geolocation" />
      <ExtrasButton />
    </>
  );
}

export default function LiffPage() {
  const [auth, setAuth] = useState<Auth>({ status: "loading" });

  useEffect(() => {
    let alive = true;
    void authenticate().then((result) => {
      if (alive) setAuth(result);
    });
    return () => {
      alive = false;
    };
  }, []);

  const [extras, setExtras] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setExtras(extrasRoute());
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  if (auth.status === "ready") return extras !== null ? <Extras route={extras} session={auth.session} /> : <Frame session={auth.session} />;
  return (
    <main style={NOTE_STYLE} aria-live="polite">
      {auth.status === "loading" ? "กำลังโหลดข้อมูลพนักงาน…" : auth.message}
    </main>
  );
}
