"use client";

import type {
  AnnouncementListResult,
  AnnouncementView,
  AttachmentDownloadResult,
} from "@ckace/contracts";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { preparePrivateDownloadTab, showPrivateDownload } from "../private-download";

import {
  announcementScopeLabel,
  announcementTitle,
  filterAnnouncements,
  type AnnouncementScopeFilter,
} from "./announcements-view";

type State =
  | { status: "loading" }
  | {
      status: "ready";
      result: AnnouncementListResult;
    }
  | { status: "error"; message: string };

const dateTimeFormatter = new Intl.DateTimeFormat(
  "th-TH",
  {
    timeZone: "Asia/Bangkok",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  },
);

function formatPublishedAt(
  value: string | null,
): string {
  if (!value) return "ยังไม่เผยแพร่";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : dateTimeFormatter.format(date);
}

function errorMessage(status: number): string {
  if (status === 401) {
    return "หมดเวลาการเข้าใช้งาน กรุณาเข้าสู่ระบบใหม่";
  }
  if (status === 403) {
    return "บัญชีนี้ไม่มีสิทธิ์ดูข่าวประกาศ";
  }
  if (status === 503) {
    return "โมดูลข่าวประกาศยังไม่เปิดใช้งานใน environment นี้";
  }
  return "ไม่สามารถโหลดข่าวประกาศได้ กรุณาลองใหม่อีกครั้ง";
}

export default function DesktopAnnouncementsPage() {
  const [state, setState] = useState<State>({
    status: "loading",
  });
  const [scopeFilter, setScopeFilter] =
    useState<AnnouncementScopeFilter>("ALL");
  const [query, setQuery] = useState("");
  const [busyAttachment, setBusyAttachment] =
    useState<string | null>(null);
  const [actionError, setActionError] =
    useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/announcements", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(errorMessage(response.status));
      }
      setState({
        status: "ready",
        result:
          (await response.json()) as AnnouncementListResult,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "ไม่สามารถโหลดข่าวประกาศได้",
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleAnnouncements = useMemo(
    () =>
      state.status === "ready"
        ? filterAnnouncements(
            state.result.announcements,
            scopeFilter,
            query,
          )
        : [],
    [query, scopeFilter, state],
  );

  async function downloadAttachment(
    announcement: AnnouncementView,
    attachmentId: string,
  ) {
    if (busyAttachment) return;
    setBusyAttachment(attachmentId);
    setActionError(null);
    let tab: Window | null = null;
    try {
      tab = preparePrivateDownloadTab();
      const response = await fetch(
        `/api/announcements/${encodeURIComponent(announcement.id)}/attachments/${encodeURIComponent(attachmentId)}/download`,
        {
          method: "POST",
          credentials: "same-origin",
        },
      );
      if (!response.ok) {
        throw new Error(errorMessage(response.status));
      }
      const result =
        (await response.json()) as AttachmentDownloadResult;
      await showPrivateDownload(tab, result);
    } catch (error) {
      tab?.close();
      setActionError(
        error instanceof Error
          ? error.message
          : "เปิดเอกสารแนบไม่สำเร็จ",
      );
    } finally {
      setBusyAttachment(null);
    }
  }

  if (state.status === "loading") {
    return (
      <section
        className="module-state"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="spinner" aria-hidden="true" />
        <h1>กำลังโหลดข่าวประกาศ</h1>
        <p>
          กำลังตรวจสอบข่าวที่คุณมีสิทธิ์เห็นจาก Server
        </p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="module-state" role="alert">
        <div className="status-badge error">
          ANNOUNCEMENTS ERROR
        </div>
        <h1>เปิดข่าวประกาศไม่สำเร็จ</h1>
        <p>{state.message}</p>
        <button
          className="primary-button"
          type="button"
          onClick={() => void load()}
        >
          ลองใหม่
        </button>
      </section>
    );
  }

  return (
    <div className="module-stack">
      <section className="module-heading">
        <div>
          <p className="eyebrow">
            ANNOUNCEMENTS DESKTOP
          </p>
          <h1>ข่าวประกาศ</h1>
          <p>
            ข่าวสารที่เผยแพร่สำหรับทั้งบริษัท หน่วยงาน
            หรือแผนกของคุณ
          </p>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => void load()}
        >
          รีเฟรช
        </button>
      </section>

      {state.result.dataStatus === "SOURCE_MISSING" ? (
        <div className="action-message error" role="alert">
          แหล่งข้อมูลข่าวประกาศยังไม่พร้อมใช้งาน
        </div>
      ) : null}

      {actionError ? (
        <div className="action-message error" role="alert">
          {actionError}
        </div>
      ) : null}

      <section className="module-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">FILTER</p>
            <h2>ค้นหาข่าวประกาศ</h2>
          </div>
          <span className="panel-note">
            {visibleAnnouncements.length} รายการ
          </span>
        </div>
        <div className="announcement-filter-grid">
          <label>
            ขอบเขต
            <select
              value={scopeFilter}
              onChange={(event) =>
                setScopeFilter(
                  event.target
                    .value as AnnouncementScopeFilter,
                )
              }
            >
              <option value="ALL">ทั้งหมด</option>
              <option value="GLOBAL">ทั้งบริษัท</option>
              <option value="AGENCY">หน่วยงาน</option>
              <option value="DEPARTMENT">แผนก</option>
            </select>
          </label>
          <label>
            ค้นหาข้อความ
            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="หัวข้อหรือเนื้อหาประกาศ"
            />
          </label>
        </div>
      </section>

      <section className="module-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">NEWS FEED</p>
            <h2>ข่าวล่าสุด</h2>
          </div>
        </div>

        {visibleAnnouncements.length === 0 ? (
          <div className="empty-state">
            <h3>ไม่พบข่าวประกาศ</h3>
            <p>
              ยังไม่มีประกาศที่ตรงกับตัวกรองและสิทธิ์ของคุณ
            </p>
          </div>
        ) : (
          <div className="announcement-list">
            {visibleAnnouncements.map((announcement) => (
              <article
                className="announcement-card"
                key={announcement.id}
              >
                <div className="announcement-card-head">
                  <div>
                    <span className="announcement-scope">
                      {announcementScopeLabel(
                        announcement.scope,
                      )}
                    </span>
                    <h3>
                      {announcementTitle(announcement)}
                    </h3>
                  </div>
                  <time>
                    {formatPublishedAt(
                      announcement.publishedAt,
                    )}
                  </time>
                </div>

                <p className="announcement-content">
                  {announcement.content}
                </p>

                {announcement.hasAttachment ? (
                  <div className="announcement-attachments">
                    <strong>เอกสารแนบ</strong>
                    <div className="announcement-attachment-actions">
                      {announcement.attachmentIds.map(
                        (attachmentId, index) => (
                          <button
                            className="secondary-button"
                            type="button"
                            key={attachmentId}
                            disabled={Boolean(busyAttachment)}
                            onClick={() =>
                              void downloadAttachment(
                                announcement,
                                attachmentId,
                              )
                            }
                          >
                            {busyAttachment === attachmentId
                              ? "กำลังเปิด..."
                              : `เอกสารแนบ ${index + 1}`}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="module-panel activity-gap-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">COMPANY ACTIVITIES</p>
            <h2>กิจกรรมบริษัท</h2>
          </div>
          <span className="status-badge">ยังไม่เชื่อมข้อมูล</span>
        </div>
        <p className="panel-description">
          Project B รุ่นปัจจุบันยังไม่มีแหล่งข้อมูลกิจกรรมบริษัท
          ที่เป็น contract/API แยกจากข่าวประกาศ
          จึงยังไม่แสดงข้อมูลกิจกรรมในหน้านี้
        </p>
      </section>
    </div>
  );
}
