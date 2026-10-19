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

import "../ck-v2-pages.css";
import { Icon } from "../ui/icons";
import { DataGrid, DetailDialog, EmptyState, ErrorState, Filters, LoadingState, Message, PageHead, SectionHead } from "../ui/kit";
import { thaiDateTime } from "../ui/format";
import { AnnouncementAdminPanel } from "./admin-panel";
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

function formatPublishedAt(
  value: string | null,
): string {
  if (!value) return "ยังไม่เผยแพร่";
  return thaiDateTime(value);
}

const SCOPE_FILTERS: readonly { id: AnnouncementScopeFilter; label: string }[] = [
  { id: "ALL", label: "ทั้งหมด" },
  { id: "GLOBAL", label: "ทั้งบริษัท" },
  { id: "AGENCY", label: "หน่วยงาน" },
  { id: "DEPARTMENT", label: "แผนก" },
];

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
  const [detail, setDetail] = useState<AnnouncementView | null>(null);
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

  if (state.status === "loading") return <LoadingState title="กำลังโหลดข่าวประกาศ" />;
  if (state.status === "error") {
    return <ErrorState title="เปิดข่าวประกาศไม่สำเร็จ" message={state.message} onRetry={() => void load()} />;
  }

  return (
    <>
      <PageHead tone="accent" icon="megaphone" title="ข่าวประกาศ" subtitle="ข่าวสารสำหรับทั้งบริษัท หน่วยงาน หรือแผนกของคุณ">
        <button className="ck-btn quiet" type="button" onClick={() => void load()}>
          <Icon name="refresh" size={16} /> รีเฟรช
        </button>
      </PageHead>

      <div className="ck-wrap ck-stack">
        {state.result.dataStatus === "SOURCE_MISSING" ? (
          <Message value={{ kind: "error", text: "แหล่งข้อมูลข่าวประกาศยังไม่พร้อมใช้งาน" }} />
        ) : null}
        {detail ? null : <Message value={actionError ? { kind: "error", text: actionError } : null} />}

        <AnnouncementAdminPanel onChanged={() => void load()} />

        <section className="ck-panel ck-c-accent" aria-labelledby="an-list">
          <SectionHead title="ข่าวล่าสุด" id="an-list" count={visibleAnnouncements.length}>
            <Filters value={scopeFilter} options={SCOPE_FILTERS} onChange={setScopeFilter} />
            <input
              className="ck-in ck-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาหัวข้อหรือเนื้อหา"
              aria-label="ค้นหาข่าวประกาศ"
            />
          </SectionHead>
          <DataGrid
            rows={visibleAnnouncements}
            rowKey={(announcement) => announcement.id}
            onRowClick={(announcement) => setDetail(announcement)}
            empty={<EmptyState icon="megaphone" title="ไม่พบข่าวประกาศ">ยังไม่มีประกาศที่ตรงกับตัวกรองและสิทธิ์ของคุณ</EmptyState>}
            columns={[
              {
                key: "title",
                header: "หัวข้อ",
                render: (announcement) => (
                  <span className="ck-gcell">
                    <span className="ck-chip sm ck-c-accent">
                      <Icon name="megaphone" size={16} />
                    </span>
                    <b>{announcementTitle(announcement)}</b>
                  </span>
                ),
              },
              {
                key: "scope",
                header: "ขอบเขต",
                render: (announcement) => <span className="ck-minichip">{announcementScopeLabel(announcement.scope)}</span>,
              },
              { key: "at", header: "เผยแพร่เมื่อ", render: (announcement) => formatPublishedAt(announcement.publishedAt) },
              {
                key: "att",
                header: "เอกสารแนบ",
                align: "center",
                render: (announcement) =>
                  announcement.hasAttachment ? <Icon name="clip" size={16} /> : "—",
              },
              { key: "go", header: "", width: "40px", align: "center", render: () => <Icon name="chevron" size={16} /> },
            ]}
          />
        </section>
      </div>

      {detail ? (
        <DetailDialog
          tone="accent"
          icon="megaphone"
          kicker={announcementScopeLabel(detail.scope)}
          title={announcementTitle(detail)}
          onClose={() => setDetail(null)}
        >
          <Message value={actionError ? { kind: "error", text: actionError } : null} />
          <p className="ck-dlg-note">เผยแพร่เมื่อ {formatPublishedAt(detail.publishedAt)}</p>
          <p className="ck-prewrap">{detail.content}</p>
          {detail.hasAttachment ? (
            <div className="ck-dlg-sec">
              <h3>เอกสารแนบ</h3>
              <div className="ck-row ck-wrapbtn">
                {detail.attachmentIds.map((attachmentId, index) => (
                  <button
                    className="ck-btn sm"
                    type="button"
                    key={attachmentId}
                    disabled={Boolean(busyAttachment)}
                    onClick={() => void downloadAttachment(detail, attachmentId)}
                  >
                    <Icon name="clip" size={14} />
                    {busyAttachment === attachmentId ? "กำลังเปิด..." : `เอกสารแนบ ${index + 1}`}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </DetailDialog>
      ) : null}
    </>
  );
}
