"use client";

import type { AnnouncementListResult, RequestStatusOverview } from "@ckace/contracts";
import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "./ui/icons";

const topCards: readonly { title: string; english: string; value: string; icon: IconName }[] = [
  { title: "พนักงานทั้งหมด", english: "EMPLOYEES", value: "24 คน", icon: "users" },
  { title: "พร้อมทำงาน", english: "READY TODAY", value: "20 คน", icon: "check" },
  { title: "ลาวันนี้", english: "ON LEAVE", value: "2 คน", icon: "leave" },
  { title: "รออนุมัติ", english: "PENDING", value: "3 รายการ", icon: "clock" },
  { title: "ลงเวลา", english: "ATTENDANCE", value: "92%", icon: "chart" },
];
const MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"] as const;

export function DashboardLocalFilter({ year }: { readonly year: string }) {
  const [open, setOpen] = useState(false);
  return <div className="sh-preview-filter">
    <button type="button" className="sh-preview-filter-toggle" aria-expanded={open} aria-controls="preview-filter-panel" onClick={() => setOpen((value) => !value)}><Icon name="calendar" size={17} /><strong>{year}</strong><Icon name="chevron" size={14} /></button>
    {open ? <form id="preview-filter-panel" className="sh-preview-filter-panel" onSubmit={(event) => event.preventDefault()}>
      <header><b>ตัวกรองข้อมูล</b><button type="button" aria-label="ปิดตัวกรอง" onClick={() => setOpen(false)}><Icon name="close" size={16} /></button></header>
      <p>ตัวอย่างหน้าตา ตัวกรองยังไม่เปลี่ยนข้อมูล</p>
      <div className="sh-preview-filter-fields">
        <label>พนักงาน<select defaultValue=""><option value="">พนักงานทั้งหมด</option></select></label>
        <label>แผนก<select defaultValue=""><option value="">ทุกแผนก</option></select></label>
        <label>ฝ่าย<select defaultValue=""><option value="">ทุกฝ่าย</option></select></label>
        <label>ปี<input type="number" defaultValue={year} /></label>
        <label>เดือน<select defaultValue=""><option value="">ทุกเดือน</option>{MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></label>
        <label>ช่วงวันที่เริ่ม<input type="text" placeholder="วว/ดด/ปปปป (พ.ศ.)" /></label>
        <label>ช่วงวันที่สิ้นสุด<input type="text" placeholder="วว/ดด/ปปปป (พ.ศ.)" /></label>
      </div>
      <footer><button type="reset">ล้างค่า</button><button type="button" onClick={() => setOpen(false)}>ปิด</button></footer>
    </form> : null}
  </div>;
}

function Row({ title, value, progress }: { readonly title: string; readonly value: string; readonly progress?: number }) {
  return <div className="sh-preview-row"><span>{title}</span>{progress === undefined ? null : <span className="sh-preview-row-track" aria-label={`${progress}%`}><i style={{ width: `${progress}%` }} /></span>}<strong>{value}</strong></div>;
}
function Board({ title, caption, icon, tone, children }: { readonly title: string; readonly caption: string; readonly icon: IconName; readonly tone: string; readonly children: ReactNode }) {
  return <section className="sh-preview-board" data-preview-tone={tone}><header><span className="sh-preview-icon"><Icon name={icon} size={19} /></span><div><h2>{caption}</h2><small>{title}</small></div><span className="sh-preview-pill">* ข้อมูลตัวอย่าง</span></header>{children}</section>;
}

export function DashboardLocalPreview({ children, requests, afterKpis }: { readonly children: ReactNode; readonly requests: RequestStatusOverview | null; readonly afterKpis: ReactNode }) {
  const overtime = requests?.requests.filter((item) => item.kind === "OVERTIME");
  return <div className="sh-preview-layout">
    <div className="sh-preview-top">{topCards.map((card) => <article className="sh-preview-stat" key={card.title}><span className="sh-preview-icon"><Icon name={card.icon} size={19} /></span><div><b className="sh-preview-stat-en">{card.english}</b><h3>{card.title}</h3><p>{card.value}</p></div><span className="sh-preview-sample">* ข้อมูลตัวอย่าง</span></article>)}</div>
    {children}
    {afterKpis}
    <div className="sh-preview-deck sh-preview-eight">
      <Board title="สถานะทีม" caption="TEAM STATUS" icon="users" tone="blue"><div className="sh-preview-highlight">ความพร้อมวันนี้ <strong>83%</strong></div><Row title="พร้อมทำงาน" value="20 คน" progress={83} /><Row title="ออก Job" value="2 คน" progress={8} /><Row title="ลาวันนี้" value="2 คน" progress={9} /></Board>
      <Board title="สถิติการลา" caption="LEAVE STATISTICS" icon="calendar" tone="green"><div className="sh-preview-highlight">ลาวันนี้ <strong>2 คน</strong></div><Row title="ลาพักร้อน" value="1 คน" progress={50} /><Row title="ลากิจ" value="1 คน" progress={50} /><Row title="ลาป่วย" value="0 คน" progress={0} /></Board>
      <Board title="คำขอของฉัน" caption="REQUESTS" icon="document" tone="blue"><div className="sh-preview-highlight">คำขอทั้งหมด <strong>{requests ? `${requests.requests.length} รายการ` : "3 รายการ"}</strong></div>{requests?.requests.slice(0, 3).map((item) => <Row key={item.id} title={item.summary} value="ตัวอย่าง" />)}</Board>
      <Board title="กิจกรรม" caption="ACTIVITY" icon="clock" tone="violet"><div className="sh-preview-activity-grid"><article><span className="sh-inner-sample">* ข้อมูลตัวอย่าง</span><Icon name="leave" size={18} /><b>การลา</b><p>ลาพักร้อน · อนุมัติแล้ว</p><small>วันที่ 27/10/2569</small></article><article><span className="sh-inner-sample">* ข้อมูลตัวอย่าง</span><Icon name="ot" size={18} /><b>โอที</b><p>ทำงานล่วงเวลา · รออนุมัติ</p><small>วันที่ 28/10/2569</small></article></div></Board>
      <Board title="สรุป OT" caption="OT SUMMARY" icon="ot" tone="teal"><div className="sh-preview-highlight">คำขอ OT ของฉัน <strong>{overtime ? `${overtime.length} รายการ` : "1 รายการ"}</strong></div><Row title="ชั่วโมง OT เดือนนี้" value="4 ชั่วโมง" /><Row title="รออนุมัติ" value="1 รายการ" /></Board>
      <Board title="การลงเวลาวันนี้" caption="ATTENDANCE / TODAY" icon="time" tone="navy"><Row title="เวลาเข้างาน" value="08:45 น." /><Row title="เวลาออกงาน" value="17:30 น." /><Row title="สถานะวันนี้" value="ลงเวลาครบ" /></Board>
      <Board title="ค่ารักษาและสวัสดิการ" caption="MEDICAL / BENEFIT" icon="med" tone="pink"><div className="sh-preview-highlight">วงเงินคงเหลือ <strong>฿7,500</strong></div><Row title="อนุมัติแล้ว" value="฿1,800" /><Row title="รอพิจารณา" value="฿700" /></Board>
    </div>
  </div>;
}

export function DashboardLocalCompany({ announcements }: { readonly announcements: AnnouncementListResult | null }) {
  return <section className="sh-preview-board sh-preview-company" data-preview-tone="pink"><header><span className="sh-preview-icon"><Icon name="megaphone" size={19} /></span><div><h2>COMPANY UPDATE</h2><small>ข่าวสารบริษัท</small></div><span className="sh-preview-pill">* ข้อมูลตัวอย่าง</span></header><div className="sh-preview-company-grid">{announcements?.announcements.length ? announcements.announcements.slice(0, 3).map((item) => <article key={item.id}><span className="sh-inner-sample">* ข้อมูลตัวอย่าง</span><b>{item.title || "ประกาศ"}</b><p>{item.content}</p></article>) : <article><span className="sh-inner-sample">* ข้อมูลตัวอย่าง</span><b>ข่าวสารบริษัทตัวอย่าง</b><p>ประกาศสำหรับตรวจรูปแบบการ์ด</p></article>}</div></section>;
}
