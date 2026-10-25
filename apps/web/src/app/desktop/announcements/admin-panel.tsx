"use client";

import type {
  AttachmentUploadIntentResult,
  AnnouncementAdminItem,
  AnnouncementAdminListResult,
  AnnouncementCreateInput,
  AnnouncementScope,
} from "@ckace/contracts";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { announcementScopeLabel, announcementTitle } from "./announcements-view";

async function send(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<void> {
  const init: RequestInit = { method, credentials: "same-origin" };
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const response = await fetch(path, init);
  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? "บัญชีนี้ไม่มีสิทธิ์ดำเนินการ"
        : "บันทึกประกาศไม่สำเร็จ กรุณาตรวจข้อมูลแล้วลองใหม่",
    );
  }
}

async function sha256Hex(file: File): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Uploads one announcement file (internal class) and returns its finalized attachment id. */
async function uploadAnnouncementFile(file: File): Promise<string> {
  const failed = "แนบไฟล์ไม่สำเร็จ กรุณาตรวจชนิดและขนาดไฟล์ (รูปภาพหรือ PDF) แล้วลองใหม่";
  const intentResponse = await fetch("/api/attachments/upload-intent", {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      privacyClass: "INTERNAL",
      originalFilename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      checksumSha256: await sha256Hex(file),
    }),
  });
  if (!intentResponse.ok) throw new Error(failed);
  const intent = (await intentResponse.json()) as AttachmentUploadIntentResult;
  const upload = await fetch(intent.upload.url, {
    method: intent.upload.method,
    headers: intent.upload.requiredHeaders,
    body: file,
  });
  if (!upload.ok) throw new Error(failed);
  const finalize = await fetch(
    "/api/attachments/" + encodeURIComponent(intent.attachmentId) + "/finalize",
    { method: "POST", credentials: "same-origin" },
  );
  if (!finalize.ok) throw new Error(failed);
  return intent.attachmentId;
}

function inputFrom(
  data: FormData,
  options: { readonly publishNow?: boolean } = {},
): AnnouncementCreateInput {
  const scope = String(data.get("scope") ?? "GLOBAL") as AnnouncementScope;
  return {
    title: String(data.get("title") ?? "").trim() || null,
    content: String(data.get("content") ?? "").trim(),
    scope,
    agencyId: scope === "AGENCY" ? String(data.get("agencyId") ?? "") || null : null,
    departmentId:
      scope === "DEPARTMENT" ? String(data.get("departmentId") ?? "") || null : null,
    ...(options.publishNow === undefined ? {} : { publishNow: options.publishNow }),
  };
}

function Fields({
  lists,
  item,
}: {
  readonly lists: AnnouncementAdminListResult;
  readonly item?: AnnouncementAdminItem;
}) {
  const [scope, setScope] = useState<AnnouncementScope>(item?.scope ?? "GLOBAL");
  return (
    <>
      <label>
        หัวข้อ (ไม่บังคับ)
        <input name="title" maxLength={250} defaultValue={item?.title ?? ""} />
      </label>
      <label>
        เนื้อหา
        <textarea
          name="content"
          required
          rows={4}
          maxLength={5000}
          defaultValue={item?.content ?? ""}
        />
      </label>
      <label>
        ส่งถึง
        <select
          name="scope"
          value={scope}
          onChange={(event) => setScope(event.target.value as AnnouncementScope)}
        >
          <option value="GLOBAL">ทั้งบริษัท</option>
          <option value="AGENCY">เฉพาะทีม</option>
          <option value="DEPARTMENT">เฉพาะแผนก</option>
        </select>
      </label>
      {scope === "AGENCY" ? (
        <label>
          ทีม
          <select name="agencyId" required defaultValue={item?.agencyId ?? ""}>
            <option value="">เลือกทีม</option>
            {lists.agencies.map((agency) => (
              <option key={agency.id} value={agency.id}>
                {agency.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {scope === "DEPARTMENT" ? (
        <label>
          แผนก
          <select name="departmentId" required defaultValue={item?.departmentId ?? ""}>
            <option value="">เลือกแผนก</option>
            {lists.departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </>
  );
}

/** Admin tools for announcements; renders nothing for accounts without write permission. */
export function AnnouncementAdminPanel({
  onChanged,
}: {
  readonly onChanged: () => void;
}) {
  const [lists, setLists] = useState<AnnouncementAdminListResult | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/announcements/admin", {
        credentials: "same-origin",
        cache: "no-store",
      });
      setLists(response.ok ? ((await response.json()) as AnnouncementAdminListResult) : null);
    } catch {
      setLists(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!lists) return null;

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ ok: true, text: done });
      setEditing(null);
      await load();
      onChanged();
    } catch (error) {
      setMessage({
        ok: false,
        text: error instanceof Error ? error.message : "บันทึกประกาศไม่สำเร็จ",
      });
    } finally {
      setBusy(false);
    }
  }

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const body = inputFrom(data, { publishNow: true });
    const files = data.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    void run(async () => {
      if (files.length > 10) throw new Error("แนบไฟล์ได้ไม่เกิน 10 ไฟล์");
      const attachmentIds: string[] = [];
      for (const file of files) attachmentIds.push(await uploadAnnouncementFile(file));
      await send("/api/announcements", "POST", { ...body, attachmentIds });
      form.reset();
    }, "ประกาศแล้ว");
  }

  function update(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const body = inputFrom(new FormData(event.currentTarget));
    void run(() => send("/api/announcements/" + encodeURIComponent(id), "PATCH", body), "บันทึกแล้ว");
  }

  function remove(item: AnnouncementAdminItem) {
    if (!window.confirm("ลบประกาศ \"" + announcementTitle(item) + "\" ใช่หรือไม่")) return;
    void run(() => send("/api/announcements/" + encodeURIComponent(item.id), "DELETE"), "ลบแล้ว");
  }

  return (
    <section className="module-panel" id="announcement-admin">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">ADMIN</p>
          <h2>จัดการประกาศ</h2>
        </div>
      </div>
      {message ? (
        <div className={"action-message" + (message.ok ? "" : " error")} role="status">
          {message.text}
        </div>
      ) : null}
      <form className="announcement-filter-grid" onSubmit={create}>
        <Fields lists={lists} />
        <label>
          แนบไฟล์ (รูปภาพหรือ PDF ได้หลายไฟล์ ไม่บังคับ)
          <input name="files" type="file" multiple accept="image/jpeg,image/png,application/pdf" />
        </label>
        <button className="success-button" disabled={busy} type="submit">
          โพสต์ประกาศ
        </button>
      </form>
      <div className="announcement-list">
        {lists.announcements.map((item) => (
          <article className="announcement-card" key={item.id}>
            {editing === item.id ? (
              <form
                className="announcement-filter-grid"
                onSubmit={(event) => update(event, item.id)}
              >
                <Fields lists={lists} item={item} />
                <button className="success-button" disabled={busy} type="submit">
                  บันทึก
                </button>
                <button className="secondary-button" type="button" onClick={() => setEditing(null)}>
                  ยกเลิก
                </button>
              </form>
            ) : (
              <>
                <div className="announcement-card-head">
                  <div>
                    <span className="announcement-scope">
                      {announcementScopeLabel(item.scope)}
                      {item.agencyName ? " · " + item.agencyName : ""}
                      {item.departmentName ? " · " + item.departmentName : ""}
                    </span>
                    <h3>{announcementTitle(item)}</h3>
                  </div>
                </div>
                <p className="announcement-content">{item.content}</p>
                <div className="announcement-attachment-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={busy}
                    onClick={() => setEditing(item.id)}
                  >
                    แก้ไข
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    disabled={busy}
                    onClick={() => remove(item)}
                  >
                    ลบ
                  </button>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
